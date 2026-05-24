"""
Build the CLIP image-vector index in Qdrant.

Usage:
    uv run python scripts/index_clip_images.py
    uv run python scripts/index_clip_images.py --limit 500 --recreate
"""

import argparse
from itertools import islice
from pathlib import Path
import sys

from loguru import logger

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.services.clip_search_service import clip_search_service
from src.services.product_catalog import product_catalog


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--recreate", action="store_true")
    args = parser.parse_args()

    products = product_catalog.all_products()
    if args.limit is not None:
        products = list(islice(products, args.limit))

    logger.info(f"Indexing {len(products)} product images into Qdrant")
    result = clip_search_service.index_products(
        products,
        batch_size=args.batch_size,
        recreate=args.recreate,
    )
    logger.info(f"Done: {result}")
    logger.info(f"Status: {clip_search_service.collection_status()}")


if __name__ == "__main__":
    main()
