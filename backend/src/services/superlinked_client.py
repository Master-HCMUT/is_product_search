"""
Superlinked Server HTTP client.
Handles communication with the Superlinked REST API for product search and listing.
"""

from typing import Any

import httpx
from loguru import logger

from src.settings import settings


class SuperlinkedClient:
    """HTTP client for Superlinked Server REST API."""

    def __init__(self):
        self.base_url = settings.SUPERLINKED_URL
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    async def search(self, params: dict[str, Any]) -> list[dict]:
        """
        Execute a search query against Superlinked Server.
        
        The Superlinked REST API uses:
            POST /api/v1/search/{descriptor_name}
        with the params directly in the body (no wrapper).
        """
        try:
            response = await self.client.post(
                "/api/v1/search/product",
                json=params,
            )
            response.raise_for_status()
            data = response.json()

            # Parse Superlinked response format
            results = []
            for item in data.get("results", []):
                obj = item.get("obj", {})
                if not isinstance(obj, dict):
                    continue
                obj["similarity_score"] = item.get("similarity_score", 0.0)
                results.append(obj)

            return results

        except httpx.HTTPStatusError as e:
            logger.warning(f"Superlinked search failed: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.warning(f"Superlinked connection error: {e}")
            raise

    async def get_products(self, limit: int = 20, offset: int = 0) -> list[dict]:
        """
        Get a paginated list of products (using a broad search).
        """
        params = {
            "query_description": "fashion clothing accessories shoes bags",
            "query_title": "fashion",
            "title_weight": 0.1,
            "description_weight": 0.1,
            "price_weight": 0.0,
            "rating_weight": 0.0,
            "similar_description_weight": 0.1,
            "similar_title_weight": 0.1,
            "limit": limit,
        }
        return await self.search(params)

    async def get_product_debug(self) -> list[dict]:
        """
        Debug endpoint: fetch a few products to verify data ingestion.
        """
        try:
            response = await self.client.post(
                "/api/v1/search/product_debug",
                json={},
            )
            response.raise_for_status()
            data = response.json()
            results = []
            for item in data.get("results", []):
                results.append(item.get("obj", {}))
            return results
        except Exception as e:
            logger.error(f"Debug query failed: {e}")
            return []

    async def trigger_data_loader(self) -> dict:
        """
        Trigger the DataLoader to ingest data from JSONL file.
        """
        try:
            response = await self.client.post(
                "/data-loader/product/run",
                headers={"accept": "application/json"},
                content="",
                timeout=600.0,  # Long timeout for data ingestion
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Data loader trigger failed: {e}")
            raise


superlinked_client = SuperlinkedClient()
