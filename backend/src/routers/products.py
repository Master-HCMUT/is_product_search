"""Product listing and detail endpoints."""

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from src.services.superlinked_client import superlinked_client
from src.services.product_catalog import product_catalog

router = APIRouter()


@router.get("/products")
async def list_products(
    limit: int = Query(default=20, le=100, ge=1),
):
    """List products from the catalog."""
    try:
        products = await superlinked_client.get_products(limit=limit)
        return {"products": products, "total": len(products)}
    except Exception as e:
        logger.warning(f"Failed to list products via Superlinked, using catalog fallback: {e}")
        products = product_catalog.search_local(
            "fashion clothing accessories shoes bags",
            limit=limit,
        )
        return {"products": products, "total": len(products)}


@router.get("/products/metadata")
async def product_metadata():
    """Return catalog metadata used to drive storefront filters."""
    return product_catalog.metadata()


@router.get("/products/debug")
async def debug_products():
    """Debug endpoint to verify data ingestion."""
    try:
        products = await superlinked_client.get_product_debug()
        return {"products": products, "total": len(products)}
    except Exception as e:
        logger.error(f"Debug query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products/{product_id}/similar")
async def similar_products(
    product_id: str,
    limit: int = Query(default=12, le=100, ge=1),
):
    """Find products similar to a selected product."""
    product = product_catalog.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    query_text = f"{product.get('title', '')} {product.get('description', '')[:800]}"
    try:
        results = await superlinked_client.search(
            {
                "query_title": product.get("title", ""),
                "query_description": query_text,
                "title_weight": 1.0,
                "description_weight": 1.0,
                "price_weight": 0.0,
                "rating_weight": 0.0,
                "similar_description_weight": 1.0,
                "similar_title_weight": 1.0,
                "limit": min(limit + 20, 120),
            }
        )
        products = sorted(
            [p for p in results if p.get("id") != product_id],
            key=lambda product: float(product.get("similarity_score") or 0),
            reverse=True,
        )[:limit]
        return {"products": products, "total": len(products)}
    except Exception as e:
        logger.error(f"Similar product query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Fetch a product directly by ID from the generated catalog."""
    product = product_catalog.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/products/ingest")
async def trigger_ingestion():
    """Trigger data ingestion from JSONL file via Superlinked DataLoader."""
    try:
        result = await superlinked_client.trigger_data_loader()
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Ingestion trigger failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
