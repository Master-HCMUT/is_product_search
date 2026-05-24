"""Data Scientist analysis endpoints: LLM-powered feedback analysis."""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from loguru import logger

from src.services.feedback_analyzer import feedback_analyzer
from src.services.qdrant_service import qdrant_service

router = APIRouter()


class SingleAnalysisRequest(BaseModel):
    """Request to analyze a single feedback entry."""
    feedback_entry: dict


class BatchAnalysisRequest(BaseModel):
    """Request to analyze multiple feedback entries."""
    feedback_entries: list[dict] | None = None
    fetch_recent: bool = False
    limit: int = 50


class SimilarQueryRequest(BaseModel):
    """Request to search for similar past queries."""
    query: str
    limit: int = 10


@router.post("/analyze-single")
async def analyze_single_feedback(request: SingleAnalysisRequest):
    """
    Analyze a single feedback entry with LLM.
    Returns an explanation of why the user gave this feedback.
    """
    try:
        explanation = await feedback_analyzer.analyze_single(request.feedback_entry)
        return {"analysis": explanation}
    except Exception as e:
        logger.error(f"Single analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-batch")
async def analyze_batch_feedback(request: BatchAnalysisRequest):
    """
    Analyze multiple feedback entries to identify patterns.
    Can either use provided entries or fetch recent ones from Qdrant.
    """
    try:
        entries = request.feedback_entries

        # If no entries provided, fetch recent ones with feedback
        if not entries or request.fetch_recent:
            logs = await qdrant_service.get_all_logs(
                limit=request.limit,
                with_feedback_only=True,
            )
            entries = logs

        if not entries:
            return {"analysis": "No feedback entries found to analyze."}

        report = await feedback_analyzer.analyze_batch(entries)
        return {"analysis": report, "entries_analyzed": len(entries)}

    except Exception as e:
        logger.error(f"Batch analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similar-queries")
async def search_similar_queries(request: SimilarQueryRequest):
    """
    Semantic search over past queries.
    Find similar search queries from the log history.
    """
    try:
        results = await qdrant_service.search_similar_queries(
            query=request.query,
            limit=request.limit,
        )
        return {"results": results, "total": len(results)}
    except Exception as e:
        logger.error(f"Similar query search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search-logs")
async def get_search_logs(limit: int = 100):
    """Get all search logs for the DS dashboard."""
    try:
        logs = await qdrant_service.get_all_logs(limit=limit)

        # Calculate stats
        total = len(logs)
        matched = sum(1 for log in logs if log.get("was_match", False))
        with_feedback = sum(1 for log in logs if log.get("has_feedback", False))

        return {
            "logs": logs,
            "stats": {
                "total": total,
                "matched": matched,
                "mismatched": total - matched,
                "with_feedback": with_feedback,
                "success_rate": (matched / total * 100) if total > 0 else 0,
            },
        }
    except Exception as e:
        logger.error(f"Failed to get search logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
