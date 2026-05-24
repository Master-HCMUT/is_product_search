"""
Ingestion script: transforms the parquet data into JSONL format
suitable for Superlinked Server's DataLoader.

Usage:
    uv run python scripts/ingest.py

This script reads the parquet file, cleans the data, and writes a JSONL file
that can be loaded by Superlinked Server via its DataLoader endpoint.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger


DATA_DIR = Path(__file__).parent.parent / "data"
INPUT_FILE = DATA_DIR / "item_metadata.parquet"
OUTPUT_FILE = DATA_DIR / "products.jsonl"


def extract_image_url(images_dict: dict) -> str:
    """Extract the best available image URL from the images dict."""
    if not isinstance(images_dict, dict):
        return ""
    for key in ["large", "hi_res", "thumb"]:
        urls = images_dict.get(key, [])
        if isinstance(urls, (list, np.ndarray)) and len(urls) > 0:
            url = urls[0]
            if url and isinstance(url, str) and url.startswith("http"):
                return url
    return ""


def concat_description_and_features(row: pd.Series) -> str:
    """Concatenate description and features into a single text."""
    parts = []

    # Description: numpy array of strings
    desc = row.get("description")
    if isinstance(desc, np.ndarray):
        parts.extend([str(d) for d in desc if d])
    elif isinstance(desc, str) and desc:
        parts.append(desc)

    # Features: numpy array of bullet points
    features = row.get("features")
    if isinstance(features, np.ndarray):
        parts.extend([str(f) for f in features if f])
    elif isinstance(features, list):
        parts.extend([str(f) for f in features if f])

    return "\n".join(parts) if parts else ""


def parse_price(price_str) -> float | None:
    """Parse price string to float. Returns None for unparseable values."""
    if price_str is None or (isinstance(price_str, float) and np.isnan(price_str)):
        return None
    if isinstance(price_str, (int, float)):
        return float(price_str)
    if isinstance(price_str, str):
        cleaned = price_str.replace("$", "").replace(",", "").strip()
        if not cleaned or cleaned.lower() == "none":
            return None
        # Handle price ranges like "$10.99 - $20.99" by taking the first price
        if " - " in cleaned:
            cleaned = cleaned.split(" - ")[0].strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def main():
    logger.info(f"Reading parquet file: {INPUT_FILE}")
    df = pd.read_parquet(INPUT_FILE)
    logger.info(f"Loaded {len(df)} products")

    # Parse prices and images. Products without either are excluded so the UI
    # does not show invented prices or broken product cards.
    logger.info("Parsing prices...")
    df["price_parsed"] = df["price"].apply(parse_price)
    df["image_url"] = df["images"].apply(extract_image_url)
    valid_prices = df["price_parsed"].dropna()
    logger.info(
        f"Products with valid prices: {len(valid_prices)}"
    )

    before_filter = len(df)
    df = df[df["price_parsed"].notna() & df["image_url"].astype(bool)].copy()
    logger.info(
        f"Kept {len(df)} products with real prices and images; "
        f"dropped {before_filter - len(df)}"
    )

    # Missing ratings represent unrated products.
    df["average_rating"] = df["average_rating"].fillna(0)

    # Prepare records for JSONL
    logger.info("Transforming records...")
    records = []
    for idx, row in df.iterrows():
        # Concatenate description + features
        full_description = concat_description_and_features(row)
        if not full_description:
            full_description = str(row.get("title", ""))

        record = {
            "id": str(row["parent_asin"]),
            "title": str(row["title"]) if row["title"] else "",
            "description": full_description[:5000],  # Truncate very long descriptions
            "price": round(float(row["price_parsed"]), 2),
            "average_rating": round(float(row["average_rating"]), 1),
            "rating_number": int(row["rating_number"]) if pd.notna(row["rating_number"]) else 0,
            "store": str(row["store"]) if pd.notna(row.get("store")) else "Unknown",
            "main_category": str(row["main_category"]) if pd.notna(row.get("main_category")) else "Fashion",
            "image_url": row["image_url"],
        }
        records.append(record)

    # Write JSONL file
    logger.info(f"Writing {len(records)} records to {OUTPUT_FILE}")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record) + "\n")

    logger.info(f"Done! JSONL file written to {OUTPUT_FILE}")
    logger.info(f"File size: {OUTPUT_FILE.stat().st_size / (1024*1024):.1f} MB")

    # Print sample record
    logger.info("Sample record:")
    sample = records[0]
    for k, v in sample.items():
        val = str(v)[:100] + "..." if len(str(v)) > 100 else v
        logger.info(f"  {k}: {val}")


if __name__ == "__main__":
    main()
