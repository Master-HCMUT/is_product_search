"""Search endpoints: text search plus CLIP image/text-to-image search."""

from pydantic import BaseModel
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from loguru import logger

from src.services.query_parser import query_parser
from src.services.qdrant_service import qdrant_service
from src.services.superlinked_client import superlinked_client
from src.services.product_catalog import product_catalog
from src.services.clip_search_service import ClipIndexEmptyError, clip_search_service

router = APIRouter()

MAX_SEARCH_CANDIDATES = 1000


class SearchRequest(BaseModel):
    query: str = ""
    search_type: str = "text"  # "text", "clip_text", or "image"
    min_price: float | None = None
    max_price: float | None = None
    min_rating: float | None = None
    category_intent: str | None = None
    limit: int = 20
    offset: int = 0
    skip_parse: bool = False


class SearchResponse(BaseModel):
    products: list[dict]
    search_params: dict
    total: int
    has_more: bool = False
    search_id: str | None = None


@router.post("/search", response_model=SearchResponse)
async def search_products(request: SearchRequest):
    """
    Search products using natural language.
    
    1. Gemini parses the query into structured parameters
    2. Superlinked Server performs vector search
    3. Results are returned with search metadata
    """
    if request.search_type in {"clip_text", "image"}:
        return await _search_clip_text(request)

    try:
        # Step 1: Parse the natural language query with Gemini
        intent_query = product_catalog.intent_query(request.category_intent)
        user_query = request.query.strip()
        enriched_query = " ".join(
            part for part in [user_query, intent_query] if part
        ).strip() or "fashion clothing accessories"

        page_size = min(max(request.limit, 1), 100)
        offset = min(max(request.offset, 0), MAX_SEARCH_CANDIDATES)
        page_end = min(offset + page_size, MAX_SEARCH_CANDIDATES)
        candidate_limit = min(max(page_end + 1, 50), MAX_SEARCH_CANDIDATES)

        if request.skip_parse:
            search_params = query_parser.simple_params(enriched_query, limit=candidate_limit)
            parse_source = "simple_skip"
        else:
            search_params, parse_source = await query_parser.parse_query(enriched_query)

        sl_params = query_parser.to_superlinked_params(search_params)
        effective_max_price = (
            request.max_price if request.max_price is not None else search_params.max_price
        )
        effective_min_rating = (
            request.min_rating
            if request.min_rating is not None
            else search_params.min_rating
        )
        sl_params.pop("max_price", None)
        sl_params.pop("min_rating", None)
        sl_params.setdefault("query_title", enriched_query)
        sl_params.setdefault("query_description", enriched_query)
        sl_params["limit"] = candidate_limit

        logger.info(f"Search: '{enriched_query}' -> Superlinked params: {sl_params}")

        # Step 2: Execute search via Superlinked
        retrieval_source = "superlinked"
        fallback_reason = None
        try:
            products = await superlinked_client.search(sl_params)
            products = product_catalog.apply_filters(
                products,
                min_price=request.min_price,
                max_price=effective_max_price,
                min_rating=effective_min_rating,
            )
        except Exception as search_error:
            logger.warning(
                "Superlinked search failed; using local catalog fallback: "
                f"{search_error}"
            )
            retrieval_source = "local_catalog_fallback"
            fallback_reason = str(search_error)
            products = product_catalog.search_local(
                enriched_query,
                min_price=request.min_price,
                max_price=effective_max_price,
                min_rating=effective_min_rating,
                limit=candidate_limit,
            )

        if not products:
            retrieval_source = "local_catalog_fallback"
            fallback_reason = fallback_reason or "empty_superlinked_results"
            products = product_catalog.search_local(
                enriched_query,
                min_price=request.min_price,
                max_price=effective_max_price,
                min_rating=effective_min_rating,
                limit=candidate_limit,
            )

        products = sorted(
            products,
            key=lambda product: float(product.get("similarity_score") or 0),
            reverse=True,
        )
        page_products = products[offset:page_end]
        has_more = len(products) > page_end and page_end < MAX_SEARCH_CANDIDATES

        # Step 3: Log the search in Qdrant
        result_ids = [p.get("id", "") for p in page_products]
        search_id = await qdrant_service.store_search_log(
            query=user_query or enriched_query,
            search_type=request.search_type,
            result_ids=result_ids,
            was_match=len(page_products) > 0,
        )

        return SearchResponse(
            products=page_products,
            search_params={
                **sl_params,
                "min_price": request.min_price,
                "max_price": effective_max_price,
                "min_rating": effective_min_rating,
                "category_intent": request.category_intent,
                "offset": offset,
                "page_size": page_size,
                "candidate_limit": candidate_limit,
                "skip_parse": request.skip_parse,
                "parse_source": parse_source,
                "retrieval_source": retrieval_source,
                "fallback_reason": fallback_reason,
                "enriched_query": enriched_query,
            },
            total=len(page_products),
            has_more=has_more,
            search_id=search_id,
        )

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search/image", response_model=SearchResponse)
async def search_products_by_image(
    image: UploadFile = File(...),
    min_price: float | None = Form(default=None),
    max_price: float | None = Form(default=None),
    min_rating: float | None = Form(default=None),
    category_intent: str | None = Form(default=None),
    limit: int = Form(default=20),
    offset: int = Form(default=0),
):
    """Search products by visual similarity to an uploaded image."""
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    request = SearchRequest(
        query=image.filename or "uploaded image",
        search_type="image",
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        category_intent=category_intent,
        limit=limit,
        offset=offset,
        skip_parse=True,
    )

    page_size, offset, page_end, candidate_limit = _pagination(request.limit, request.offset)
    try:
        products = await run_in_threadpool(
            clip_search_service.search_by_image,
            image_bytes,
            candidate_limit,
            min_price,
            max_price,
            min_rating,
        )
    except ClipIndexEmptyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"CLIP image search failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return await _clip_response(
        products=products,
        request=request,
        query=image.filename or "uploaded image",
        page_size=page_size,
        offset=offset,
        page_end=page_end,
        candidate_limit=candidate_limit,
        retrieval_source="clip_image_qdrant",
    )


@router.get("/search/clip-index")
async def clip_index_status():
    """Return CLIP image index status."""
    try:
        return await run_in_threadpool(clip_search_service.collection_status)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _search_clip_text(request: SearchRequest) -> SearchResponse:
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="CLIP text-to-image search requires a query")

    page_size, offset, page_end, candidate_limit = _pagination(request.limit, request.offset)
    try:
        products = await run_in_threadpool(
            clip_search_service.search_by_text,
            query,
            candidate_limit,
            request.min_price,
            request.max_price,
            request.min_rating,
        )
    except ClipIndexEmptyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.error(f"CLIP text-to-image search failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return await _clip_response(
        products=products,
        request=request,
        query=query,
        page_size=page_size,
        offset=offset,
        page_end=page_end,
        candidate_limit=candidate_limit,
        retrieval_source="clip_text_qdrant",
    )


async def _clip_response(
    products: list[dict],
    request: SearchRequest,
    query: str,
    page_size: int,
    offset: int,
    page_end: int,
    candidate_limit: int,
    retrieval_source: str,
) -> SearchResponse:
    products = sorted(
        products,
        key=lambda product: float(product.get("similarity_score") or 0),
        reverse=True,
    )
    page_products = products[offset:page_end]
    has_more = len(products) > page_end and page_end < MAX_SEARCH_CANDIDATES

    result_ids = [p.get("id", "") for p in page_products]
    search_id = await qdrant_service.store_search_log(
        query=query,
        search_type=request.search_type,
        result_ids=result_ids,
        was_match=len(page_products) > 0,
    )

    return SearchResponse(
        products=page_products,
        search_params={
            "query": query,
            "min_price": request.min_price,
            "max_price": request.max_price,
            "min_rating": request.min_rating,
            "category_intent": request.category_intent,
            "offset": offset,
            "page_size": page_size,
            "candidate_limit": candidate_limit,
            "skip_parse": True,
            "parse_source": "none_clip",
            "retrieval_source": retrieval_source,
            "clip_index": clip_search_service.collection_status(),
        },
        total=len(page_products),
        has_more=has_more,
        search_id=search_id,
    )


def _pagination(limit: int, offset: int) -> tuple[int, int, int, int]:
    page_size = min(max(limit, 1), 100)
    offset = min(max(offset, 0), MAX_SEARCH_CANDIDATES)
    page_end = min(offset + page_size, MAX_SEARCH_CANDIDATES)
    candidate_limit = min(max(page_end + 1, 50), MAX_SEARCH_CANDIDATES)
    return page_size, offset, page_end, candidate_limit
