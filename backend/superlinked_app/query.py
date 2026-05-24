from superlinked import framework as sl

from superlinked_app.index import (
    description_space,
    index,
    price_space,
    product,
    rating_space,
    title_space,
)


# =============================================================================
# Query definitions
# =============================================================================

# Debug query: simple way to check if data has been ingested
query_debug = sl.Query(index).find(product).limit(3)

# Main search query used by FastAPI backend
# Parameters are filled by the LLM query parser (Gemini via LangChain)
query = (
    sl.Query(
        index,
        weights={
            title_space: sl.Param("title_weight", default=1.0),
            description_space: sl.Param("description_weight", default=1.0),
            price_space: sl.Param(
                "price_weight",
                description="Weight for preferring cheaper products. Set > 0 when user wants cheap/affordable items.",
                default=0.0,
            ),
            rating_space: sl.Param(
                "rating_weight",
                description="Weight for preferring higher rated products. Set > 0 when user wants top-rated items.",
                default=0.0,
            ),
        },
    )
    .find(product)
    .similar(
        description_space.text,
        sl.Param(
            "query_description",
            description="The semantic description to search for in product descriptions.",
        ),
        weight=sl.Param("similar_description_weight", default=1.0),
    )
    .similar(
        title_space.text,
        sl.Param(
            "query_title",
            description="The text to search for in product titles.",
        ),
        weight=sl.Param("similar_title_weight", default=1.0),
    )
)

# Add result limit
query = query.limit(sl.Param("limit", default=20))

# NOTE: Hard filters (max_price, min_rating) are not used here
# because Superlinked doesn't handle None/missing params well.
# Instead, price/rating preferences are handled via space weights.

