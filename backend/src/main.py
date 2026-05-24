"""
FastAPI application entry point for the Intelligent Product Search backend.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from src.routers import products, search, feedback, ds_analysis
from src.services.clip_search_service import clip_search_service
from src.services.qdrant_service import qdrant_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    logger.info("Starting up Intelligent Product Search backend...")
    await qdrant_service.initialize()
    await clip_search_service.initialize()
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Intelligent Product Search API",
    description="AI-powered product search with LLM query parsing and feedback analysis",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(search.router, prefix="/api", tags=["Search"])
app.include_router(feedback.router, prefix="/api", tags=["Feedback"])
app.include_router(ds_analysis.router, prefix="/api/ds", tags=["Data Scientist"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "product-search-backend"}
