"""Feedback submission and retrieval endpoints."""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from loguru import logger

from src.services.qdrant_service import qdrant_service

router = APIRouter()


class FeedbackSubmission(BaseModel):
    search_id: str
    feedback_text: str


class FeedbackWithSearch(BaseModel):
    search_id: str
    query: str
    search_type: str = "text"
    result_ids: list[str] = []
    feedback_text: str


@router.post("/feedback")
async def submit_feedback(request: FeedbackSubmission):
    """Submit feedback for a search result."""
    try:
        success = await qdrant_service.update_feedback(
            log_id=request.search_id,
            feedback_text=request.feedback_text,
        )
        if success:
            return {"status": "success", "message": "Feedback submitted"}
        else:
            raise HTTPException(status_code=404, detail="Search log not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback/with-search")
async def submit_feedback_with_search(request: FeedbackWithSearch):
    """Submit feedback along with search data (for cases where search wasn't logged)."""
    try:
        search_id = await qdrant_service.store_search_log(
            query=request.query,
            search_type=request.search_type,
            result_ids=request.result_ids,
            feedback_text=request.feedback_text,
            was_match=len(request.result_ids) > 0,
        )
        return {"status": "success", "search_id": search_id}
    except Exception as e:
        logger.error(f"Feedback with search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feedback")
async def list_feedback(
    limit: int = 100,
    with_feedback_only: bool = False,
):
    """List all search logs, optionally filtered to those with feedback."""
    try:
        logs = await qdrant_service.get_all_logs(
            limit=limit,
            with_feedback_only=with_feedback_only,
        )
        return {"logs": logs, "total": len(logs)}
    except Exception as e:
        logger.error(f"Failed to list feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))
