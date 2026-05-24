## Product search demo

Run the local demo:

```bash
uv run python main.py
```

Run with another natural-language query:

```bash
uv run python main.py "wireless headphones under 100 rating above 4"
```

If `OPENAI_API_KEY` is set, the query uses Superlinked's `.with_natural_query(...)`
flow to fill query parameters from natural language. Without an API key, the script
uses a small local fallback parser so the project still runs end to end.

Optional environment variables:

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-4o-mini"
```

### CLIP image search index

Image-to-image search and CLIP text-to-image search use the Qdrant collection
`product_clip_images`. Build or refresh it after Qdrant is running:

```bash
uv run python scripts/index_clip_images.py --recreate
```

For a quick smoke index:

```bash
uv run python scripts/index_clip_images.py --limit 500 --recreate
```

When running this from the host instead of inside Docker, point the script at the
published Qdrant port:

```bash
QDRANT_URL=http://localhost:6333 uv run python scripts/index_clip_images.py --recreate
```
