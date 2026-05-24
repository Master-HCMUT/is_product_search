"""CLIP-backed product image search stored in Qdrant."""

from __future__ import annotations

import io
import uuid
from pathlib import Path
from threading import Lock
from typing import Any, Iterable

import httpx
import open_clip
import torch
from loguru import logger
from PIL import Image, UnidentifiedImageError
from qdrant_client import QdrantClient, models
from transformers import CLIPConfig, CLIPImageProcessor, CLIPModel

from src.services.product_catalog import product_catalog
from src.settings import settings

CLIP_VECTOR_DIM = 512


class ClipIndexEmptyError(RuntimeError):
    """Raised when CLIP search is requested before image vectors exist."""


class ClipSearchService:
    """Loads CLIP lazily and searches product image vectors in Qdrant."""

    def __init__(self) -> None:
        self.client: QdrantClient | None = None
        self._model: CLIPModel | None = None
        self._image_processor: CLIPImageProcessor | None = None
        self._tokenizer = None
        self._model_lock = Lock()
        self._client_lock = Lock()

    async def initialize(self) -> None:
        """Create the CLIP Qdrant collection without loading the model."""
        try:
            self._ensure_client()
            self._ensure_collection()
        except Exception as exc:
            logger.warning(f"Failed to initialize CLIP search collection: {exc}")

    def collection_status(self) -> dict[str, Any]:
        self._ensure_client()
        self._ensure_collection()
        count = self.client.count(
            collection_name=settings.CLIP_IMAGE_COLLECTION,
            exact=True,
        ).count
        return {
            "collection": settings.CLIP_IMAGE_COLLECTION,
            "indexed_vectors": count,
            "vector_dim": CLIP_VECTOR_DIM,
            "model_path": str(self._model_path()),
        }

    def search_by_text(
        self,
        query: str,
        limit: int,
        min_price: float | None = None,
        max_price: float | None = None,
        min_rating: float | None = None,
    ) -> list[dict[str, Any]]:
        vector = self.embed_text(query)
        return self._search_products(
            vector=vector,
            limit=limit,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
        )

    def search_by_image(
        self,
        image_bytes: bytes,
        limit: int,
        min_price: float | None = None,
        max_price: float | None = None,
        min_rating: float | None = None,
    ) -> list[dict[str, Any]]:
        image = self._read_image(image_bytes)
        vector = self.embed_images([image])[0]
        return self._search_products(
            vector=vector,
            limit=limit,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
        )

    def embed_text(self, text: str) -> list[float]:
        self._ensure_model()
        tokens = self._tokenizer([text]).to(self._device())
        with torch.no_grad():
            features = self._model.get_text_features(input_ids=tokens)
        return self._normalize(features)[0].detach().cpu().tolist()

    def embed_images(self, images: list[Image.Image]) -> list[list[float]]:
        self._ensure_model()
        inputs = self._image_processor(images=images, return_tensors="pt")
        inputs = {key: value.to(self._device()) for key, value in inputs.items()}
        with torch.no_grad():
            features = self._model.get_image_features(**inputs)
        return self._normalize(features).detach().cpu().tolist()

    def index_products(
        self,
        products: Iterable[dict[str, Any]],
        batch_size: int = 32,
        recreate: bool = False,
    ) -> dict[str, int]:
        """Download product images, encode them with CLIP, and upsert vectors."""
        self._ensure_client()
        if recreate:
            self.client.recreate_collection(
                collection_name=settings.CLIP_IMAGE_COLLECTION,
                vectors_config=models.VectorParams(
                    size=CLIP_VECTOR_DIM,
                    distance=models.Distance.COSINE,
                ),
            )
        else:
            self._ensure_collection()

        indexed = 0
        skipped = 0
        batch: list[tuple[dict[str, Any], Image.Image]] = []
        with httpx.Client(timeout=20.0, follow_redirects=True) as http_client:
            for product in products:
                image = self._download_image(http_client, product.get("image_url"))
                if image is None:
                    skipped += 1
                    continue

                batch.append((product, image))
                if len(batch) >= batch_size:
                    indexed += self._upsert_batch(batch)
                    batch = []

            if batch:
                indexed += self._upsert_batch(batch)

        return {"indexed": indexed, "skipped": skipped}

    def _search_products(
        self,
        vector: list[float],
        limit: int,
        min_price: float | None = None,
        max_price: float | None = None,
        min_rating: float | None = None,
    ) -> list[dict[str, Any]]:
        self._ensure_client()
        self._ensure_collection()
        status = self.collection_status()
        if status["indexed_vectors"] == 0:
            raise ClipIndexEmptyError(
                "CLIP image index is empty. Run `uv run python scripts/index_clip_images.py` from backend first."
            )

        results = self.client.query_points(
            collection_name=settings.CLIP_IMAGE_COLLECTION,
            query=vector,
            limit=limit,
            with_payload=True,
        )

        products: list[dict[str, Any]] = []
        for point in results.points:
            payload = point.payload or {}
            product_id = str(payload.get("product_id") or "")
            product = product_catalog.get_product(product_id)
            if not product:
                product = self._payload_to_product(payload)
            if not product:
                continue
            enriched = dict(product)
            enriched["similarity_score"] = float(point.score)
            products.append(enriched)

        return product_catalog.apply_filters(
            products,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
        )

    def _upsert_batch(self, batch: list[tuple[dict[str, Any], Image.Image]]) -> int:
        images = [image for _, image in batch]
        vectors = self.embed_images(images)
        points = []
        for (product, _), vector in zip(batch, vectors, strict=True):
            product_id = str(product["id"])
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, product_id)),
                    vector=vector,
                    payload=self._product_payload(product),
                )
            )

        self.client.upsert(
            collection_name=settings.CLIP_IMAGE_COLLECTION,
            points=points,
        )
        return len(points)

    def _ensure_client(self) -> None:
        if self.client is not None:
            return
        with self._client_lock:
            if self.client is None:
                self.client = QdrantClient(url=settings.QDRANT_URL)

    def _ensure_collection(self) -> None:
        collections = self.client.get_collections().collections
        collection_names = {collection.name for collection in collections}
        if settings.CLIP_IMAGE_COLLECTION in collection_names:
            return
        self.client.create_collection(
            collection_name=settings.CLIP_IMAGE_COLLECTION,
            vectors_config=models.VectorParams(
                size=CLIP_VECTOR_DIM,
                distance=models.Distance.COSINE,
            ),
        )
        logger.info(f"Created collection: {settings.CLIP_IMAGE_COLLECTION}")

    def _ensure_model(self) -> None:
        if self._model is not None:
            return
        with self._model_lock:
            if self._model is not None:
                return

            model_path = self._model_path()
            if not model_path.exists():
                raise FileNotFoundError(f"CLIP model file not found: {model_path}")

            logger.info(f"Loading CLIP model from {model_path}")
            state_dict = torch.load(model_path, map_location=self._device())
            model = CLIPModel(CLIPConfig())
            model.load_state_dict(state_dict)
            model.to(self._device())
            model.eval()

            self._model = model
            self._image_processor = CLIPImageProcessor()
            self._tokenizer = open_clip.get_tokenizer("ViT-B-32")

    def _device(self) -> torch.device:
        requested = settings.CLIP_DEVICE
        if requested.startswith("cuda") and not torch.cuda.is_available():
            return torch.device("cpu")
        return torch.device(requested)

    def _model_path(self) -> Path:
        configured = Path(settings.CLIP_MODEL_PATH)
        if configured.is_absolute():
            return configured

        candidates = [
            Path.cwd() / configured,
            Path.cwd().parent / configured,
        ]
        candidates.extend(parent / configured for parent in Path(__file__).resolve().parents)
        for candidate in candidates:
            if candidate.exists():
                return candidate.resolve()
        return (Path.cwd() / configured).resolve()

    def _normalize(self, features: torch.Tensor) -> torch.Tensor:
        return features / features.norm(p=2, dim=-1, keepdim=True)

    def _read_image(self, image_bytes: bytes) -> Image.Image:
        try:
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except UnidentifiedImageError as exc:
            raise ValueError("Uploaded file is not a readable image") from exc

    def _download_image(
        self,
        http_client: httpx.Client,
        image_url: str | None,
    ) -> Image.Image | None:
        if not image_url:
            return None
        try:
            response = http_client.get(str(image_url))
            response.raise_for_status()
            return self._read_image(response.content)
        except Exception as exc:
            logger.debug(f"Skipping image {image_url}: {exc}")
            return None

    def _product_payload(self, product: dict[str, Any]) -> dict[str, Any]:
        return {
            "product_id": str(product.get("id") or ""),
            "title": str(product.get("title") or ""),
            "description": str(product.get("description") or ""),
            "price": product.get("price"),
            "average_rating": product.get("average_rating"),
            "rating_number": product.get("rating_number"),
            "store": str(product.get("store") or ""),
            "main_category": str(product.get("main_category") or ""),
            "image_url": str(product.get("image_url") or ""),
        }

    def _payload_to_product(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        product_id = payload.get("product_id")
        if not product_id:
            return None
        product = self._product_payload({"id": product_id, **payload})
        product["id"] = str(product_id)
        return product


clip_search_service = ClipSearchService()
