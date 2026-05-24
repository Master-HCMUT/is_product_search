"""
Query parser service: uses LangChain + Gemini structured output
to parse natural language search queries into Superlinked parameters.
"""

import re
from typing import Literal

from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from loguru import logger

from src.settings import settings

ParseSource = Literal["gemini", "simple_fallback"]


class SearchParams(BaseModel):
    """Structured search parameters extracted from a natural language query."""

    query_title: str | None = Field(
        default=None,
        description="Keywords extracted from the query to match product titles. Keep it concise.",
    )
    query_description: str | None = Field(
        default=None,
        description="Semantic description to match product descriptions and features. This should capture the intent and attributes the user is looking for.",
    )
    max_price: float | None = Field(
        default=None,
        description="Maximum price the user is willing to pay. Extract from phrases like 'under $50', 'less than 100', 'cheap'.",
    )
    min_rating: float | None = Field(
        default=None,
        description="Minimum rating the user wants. Extract from phrases like 'highly rated', 'at least 4 stars', 'top rated'. Scale is 0-5.",
    )
    title_weight: float = Field(
        default=1.0,
        description="Weight for title similarity. Range 0-1.",
    )
    description_weight: float = Field(
        default=1.0,
        description="Weight for description similarity. Range 0-1.",
    )
    price_weight: float = Field(
        default=0.0,
        description="Weight for preferring cheaper items. Set > 0 when user wants affordable/cheap/budget items. Range 0-1.",
    )
    rating_weight: float = Field(
        default=0.0,
        description="Weight for preferring higher rated items. Set > 0 when user mentions quality/ratings/best. Range 0-1.",
    )
    limit: int = Field(
        default=20,
        description="Number of results to return. Default 20.",
    )


SYSTEM_PROMPT = """You are a search query parser for an Amazon Fashion product catalog.
Your job is to extract structured search parameters from natural language queries.

The catalog contains fashion items including clothing, shoes, accessories, bags, jewelry, etc.
All products are in the "AMAZON FASHION" category.

Rules:
- For query_title: extract the main product type or name (e.g., "running shoes", "winter jacket", "leather belt")
- For query_description: expand on the user's intent with descriptive terms (e.g., "comfortable lightweight shoes for running and exercise")
- If the user mentions price constraints, set max_price accordingly
- If the user wants cheap/affordable items, set price_weight to 0.5-1.0
- If the user wants highly rated items, set rating_weight to 0.5-1.0 and optionally min_rating
- If the query is very short or generic, set broad description weights
- Always provide at least query_title or query_description
"""


class QueryParser:
    """Parses natural language queries into structured Superlinked parameters."""

    def __init__(self):
        self._llm = None

    @property
    def llm(self):
        if self._llm is None:
            self._llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL_ID,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.0,
                max_retries=0,
            )
        return self._llm

    async def parse_query(self, user_query: str) -> tuple[SearchParams, ParseSource]:
        """
        Parse a natural language query into structured search parameters.
        
        Args:
            user_query: The user's search query string.
        
        Returns:
            SearchParams with structured parameters for Superlinked.
        """
        try:
            structured_llm = self.llm.with_structured_output(SearchParams)
            result = await structured_llm.ainvoke(
                f"{SYSTEM_PROMPT}\n\nUser query: {user_query}"
            )
            logger.info(f"Parsed query '{user_query}' -> {result.model_dump()}")
            return result, "gemini"

        except Exception as e:
            logger.warning(f"Query parsing failed: {e}. Falling back to simple search.")
            max_price = self._extract_max_price(user_query)
            min_rating = self._extract_min_rating(user_query)
            return SearchParams(
                query_title=user_query,
                query_description=user_query,
                max_price=max_price,
                min_rating=min_rating,
                title_weight=1.0,
                description_weight=1.0,
                price_weight=0.7 if max_price is not None else 0.0,
                rating_weight=0.7 if min_rating is not None else 0.0,
            ), "simple_fallback"

    def simple_params(self, user_query: str, limit: int = 20) -> SearchParams:
        """Build query params without calling the LLM."""
        return SearchParams(
            query_title=user_query,
            query_description=user_query,
            max_price=self._extract_max_price(user_query),
            min_rating=self._extract_min_rating(user_query),
            title_weight=1.0,
            description_weight=1.0,
            limit=limit,
        )

    def _extract_max_price(self, user_query: str) -> float | None:
        query = user_query.lower()
        patterns = [
            r"(?:under|below|less than|maximum|max|up to|<=)\s*\$?\s*(\d+(?:\.\d+)?)",
            r"\$\s*(\d+(?:\.\d+)?)\s*(?:or less|and under|or under|max)?",
        ]
        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                return float(match.group(1))
        return None

    def _extract_min_rating(self, user_query: str) -> float | None:
        query = user_query.lower()
        patterns = [
            r"(?:at least|min(?:imum)?|over|above)\s*(\d(?:\.\d)?)\s*(?:stars?|rating)",
            r"(\d(?:\.\d)?)\s*(?:stars?|rating)\s*(?:and up|or higher|minimum|min)",
        ]
        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                return float(match.group(1))
        if "top rated" in query or "highly rated" in query:
            return 4.0
        return None

    def to_superlinked_params(self, params: SearchParams) -> dict:
        """Convert SearchParams to Superlinked query parameter format."""
        sl_params = {
            "title_weight": params.title_weight,
            "description_weight": params.description_weight,
            "price_weight": params.price_weight,
            "rating_weight": params.rating_weight,
            "similar_description_weight": 1.0,
            "similar_title_weight": 1.0,
            "limit": params.limit,
        }

        if params.query_title:
            sl_params["query_title"] = params.query_title
        if params.query_description:
            sl_params["query_description"] = params.query_description
        if params.max_price is not None:
            sl_params["max_price"] = params.max_price
        if params.min_rating is not None:
            sl_params["min_rating"] = params.min_rating

        return sl_params


query_parser = QueryParser()
