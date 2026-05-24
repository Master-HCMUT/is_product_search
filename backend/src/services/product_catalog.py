"""Local product catalog helpers backed by the ingested JSONL source file."""

import json
import re
from pathlib import Path
from typing import Any


DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "products.jsonl"

INTENT_QUERIES: dict[str, str] = {
    "all": "fashion clothing accessories shoes bags",
    "women": "women womens ladies fashion clothing shoes accessories",
    "men": "men mens fashion clothing shoes watches accessories",
    "shoes": "shoes sneakers sandals boots footwear",
    "watches": "watch watches wristwatch",
    "bags": "bag bags purse backpack handbag wallet",
    "jewelry": "jewelry necklace bracelet earrings ring",
    "activewear": "activewear running workout athletic compression sports",
    "deals": "affordable cheap budget sale value",
    "top-rated": "highly rated popular quality best",
}

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "best",
    "by",
    "for",
    "from",
    "in",
    "is",
    "of",
    "on",
    "or",
    "the",
    "to",
    "under",
    "with",
}


class ProductCatalog:
    """Caches product records from the generated JSONL catalog."""

    def __init__(self) -> None:
        self._mtime: float | None = None
        self._products: list[dict[str, Any]] = []
        self._by_id: dict[str, dict[str, Any]] = {}

    def _load_if_needed(self) -> None:
        if not DATA_FILE.exists():
            self._products = []
            self._by_id = {}
            self._mtime = None
            return

        mtime = DATA_FILE.stat().st_mtime
        if self._mtime == mtime:
            return

        products: list[dict[str, Any]] = []
        with DATA_FILE.open() as f:
            for line in f:
                if line.strip():
                    products.append(json.loads(line))

        self._products = products
        self._by_id = {str(product["id"]): product for product in products}
        self._mtime = mtime

    def get_product(self, product_id: str) -> dict[str, Any] | None:
        self._load_if_needed()
        return self._by_id.get(product_id)

    def all_products(self) -> list[dict[str, Any]]:
        self._load_if_needed()
        return list(self._products)

    def metadata(self) -> dict[str, Any]:
        self._load_if_needed()
        prices = [float(p["price"]) for p in self._products if p.get("price") is not None]
        ratings = [
            float(p["average_rating"])
            for p in self._products
            if p.get("average_rating") is not None
        ]

        return {
            "total": len(self._products),
            "price": {
                "min": min(prices) if prices else 0,
                "max": max(prices) if prices else 0,
            },
            "rating": {
                "min": min(ratings) if ratings else 0,
                "max": max(ratings) if ratings else 5,
            },
            "category_intents": list(INTENT_QUERIES.keys()),
        }

    def intent_query(self, category_intent: str | None) -> str | None:
        if not category_intent:
            return None
        return INTENT_QUERIES.get(category_intent.lower())

    def apply_filters(
        self,
        products: list[dict[str, Any]],
        min_price: float | None = None,
        max_price: float | None = None,
        min_rating: float | None = None,
    ) -> list[dict[str, Any]]:
        filtered = []
        for product in products:
            price = product.get("price")
            rating = product.get("average_rating")
            if min_price is not None and (price is None or float(price) < min_price):
                continue
            if max_price is not None and (price is None or float(price) > max_price):
                continue
            if min_rating is not None and (rating is None or float(rating) < min_rating):
                continue
            filtered.append(product)
        return filtered

    def search_local(
        self,
        query: str,
        min_price: float | None = None,
        max_price: float | None = None,
        min_rating: float | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Small deterministic fallback search for when the vector service is unavailable."""
        self._load_if_needed()
        tokens = self._query_tokens(query)
        filtered = self.apply_filters(
            self._products,
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
        )

        scored: list[tuple[float, dict[str, Any]]] = []
        for product in filtered:
            score = self._score_product(product, tokens)
            if score > 0 or not tokens:
                scored.append((score, product))

        if not scored:
            scored = [(0.0, product) for product in filtered]

        scored.sort(
            key=lambda item: (
                item[0],
                float(item[1].get("average_rating") or 0),
                int(item[1].get("rating_number") or 0),
            ),
            reverse=True,
        )

        results = []
        max_score = max((score for score, _ in scored), default=1.0) or 1.0
        for score, product in scored[:limit]:
            enriched = dict(product)
            enriched["similarity_score"] = min(score / max_score, 1.0)
            results.append(enriched)
        return results

    def _query_tokens(self, query: str) -> set[str]:
        return {
            token
            for token in re.findall(r"[a-z0-9]+", query.lower())
            if len(token) > 1 and token not in STOPWORDS
        }

    def _score_product(self, product: dict[str, Any], tokens: set[str]) -> float:
        title = str(product.get("title") or "").lower()
        description = str(product.get("description") or "").lower()
        store = str(product.get("store") or "").lower()

        score = 0.0
        for token in tokens:
            if token in title:
                score += 4.0
            if token in description:
                score += 1.5
            if token in store:
                score += 0.5

        score += min(float(product.get("average_rating") or 0), 5.0) * 0.2
        score += min(int(product.get("rating_number") or 0), 1000) / 1000
        return score


product_catalog = ProductCatalog()
