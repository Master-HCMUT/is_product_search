from superlinked import framework as sl

from superlinked_app.config import settings
from superlinked_app.index import index, product
from superlinked_app.query import query, query_debug


# =============================================================================
# Data source: REST API for real-time ingestion
# =============================================================================

rest_source = sl.RestSource(product)

# =============================================================================
# Data source: DataLoader for batch ingestion from JSONL file
# =============================================================================

loader_config = sl.DataLoaderConfig(
    settings.path_dataset,
    sl.DataFormat.JSON,
    pandas_read_kwargs={"lines": True, "chunksize": settings.chunk_size},
)
loader_source = sl.DataLoaderSource(product, loader_config)

# =============================================================================
# Vector database: Qdrant
# =============================================================================

vector_database = sl.QdrantVectorDatabase(
    url=settings.qdrant_url,
    api_key=settings.qdrant_api_key if settings.qdrant_api_key else None,
)

# =============================================================================
# Executor: combines everything into a REST server
# =============================================================================

executor = sl.RestExecutor(
    sources=[
        rest_source,
        loader_source,
    ],
    indices=[index],
    queries=[
        sl.RestQuery(sl.RestDescriptor("product"), query),
        sl.RestQuery(sl.RestDescriptor("product-debug"), query_debug),
    ],
    vector_database=vector_database,
)

sl.SuperlinkedRegistry.register(executor)
