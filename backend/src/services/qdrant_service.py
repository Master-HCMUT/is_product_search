"""
Qdrant service for managing the search_logs collection.
Stores search feedback with query embeddings for semantic search.
"""

import uuid
import hashlib
import math
import re
from datetime import datetime
from typing import Any

from loguru import logger
from qdrant_client import QdrantClient, models

from src.settings import settings

SEARCH_LOGS_COLLECTION = "search_logs"
VECTOR_DIM = 384  # all-MiniLM-L6-v2 output dimension


class QdrantService:
    """Service for managing search logs in Qdrant."""

    def __init__(self):
        self.client: QdrantClient | None = None

    async def initialize(self):
        """Initialize Qdrant client and create collection if needed."""
        try:
            self.client = QdrantClient(url=settings.QDRANT_URL)

            # Create search_logs collection if it doesn't exist
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]

            if SEARCH_LOGS_COLLECTION not in collection_names:
                self.client.create_collection(
                    collection_name=SEARCH_LOGS_COLLECTION,
                    vectors_config=models.VectorParams(
                        size=VECTOR_DIM,
                        distance=models.Distance.COSINE,
                    ),
                )
                logger.info(f"Created collection: {SEARCH_LOGS_COLLECTION}")
            else:
                logger.info(f"Collection already exists: {SEARCH_LOGS_COLLECTION}")

        except Exception as e:
            logger.warning(f"Failed to initialize Qdrant: {e}. Will retry on first use.")

    def _embed_text(self, text: str) -> list[float]:
        """Create a deterministic lightweight query vector for feedback logs."""
        vector = [0.0] * VECTOR_DIM
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % VECTOR_DIM
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    def _ensure_client(self):
        """Ensure client is initialized."""
        if self.client is None:
            self.client = QdrantClient(url=settings.QDRANT_URL)

    async def store_search_log(
        self,
        query: str,
        search_type: str,
        result_ids: list[str],
        feedback_text: str | None = None,
        was_match: bool = True,
    ) -> str:
        """
        Store a search log entry with query embedding.

        Returns:
            The generated log ID.
        """
        self._ensure_client()
        log_id = str(uuid.uuid4())
        vector = self._embed_text(query)

        payload = {
            "log_id": log_id,
            "query": query,
            "search_type": search_type,
            "result_ids": result_ids,
            "result_count": len(result_ids),
            "feedback_text": feedback_text or "",
            "was_match": was_match,
            "has_feedback": bool(feedback_text),
            "timestamp": datetime.utcnow().isoformat(),
        }

        self.client.upsert(
            collection_name=SEARCH_LOGS_COLLECTION,
            points=[
                models.PointStruct(
                    id=log_id,
                    vector=vector,
                    payload=payload,
                )
            ],
        )

        logger.info(f"Stored search log: {log_id} for query: '{query}'")
        return log_id

    async def update_feedback(self, log_id: str, feedback_text: str) -> bool:
        """Update an existing search log with user feedback."""
        self._ensure_client()
        try:
            self.client.set_payload(
                collection_name=SEARCH_LOGS_COLLECTION,
                payload={
                    "feedback_text": feedback_text,
                    "has_feedback": True,
                },
                points=[log_id],
            )
            logger.info(f"Updated feedback for log: {log_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update feedback: {e}")
            return False

    async def get_all_logs(
        self,
        limit: int = 100,
        with_feedback_only: bool = False,
    ) -> list[dict[str, Any]]:
        """Retrieve all search logs, optionally filtered to those with feedback."""
        self._ensure_client()

        filter_condition = None
        if with_feedback_only:
            filter_condition = models.Filter(
                must=[
                    models.FieldCondition(
                        key="has_feedback",
                        match=models.MatchValue(value=True),
                    )
                ]
            )

        results = self.client.scroll(
            collection_name=SEARCH_LOGS_COLLECTION,
            scroll_filter=filter_condition,
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )

        logs = []
        for point in results[0]:
            log = point.payload or {}
            log["id"] = str(point.id)
            logs.append(log)

        return logs

    async def search_similar_queries(
        self,
        query: str,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Semantic search over past queries."""
        self._ensure_client()
        vector = self._embed_text(query)

        results = self.client.query_points(
            collection_name=SEARCH_LOGS_COLLECTION,
            query=vector,
            limit=limit,
            with_payload=True,
        )

        logs = []
        for point in results.points:
            log = point.payload or {}
            log["id"] = str(point.id)
            log["similarity_score"] = point.score
            logs.append(log)

        return logs


qdrant_service = QdrantService()
