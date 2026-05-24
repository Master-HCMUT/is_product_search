# Project description
This project aims to build an intelligent product search engine that can understand natural language queries and return relevant product results.

# Infra and Database
- Use only Qdrant as the main database for product search (vector search + filtering)
- Do not need to use PostgreSQL or other databases
- Do not need to use Redis or other caching mechanisms
- If we want another space to save data or stuffs, we can create new collection in Qdrant


# Tools
- Python Backend: Using only uv to manage deps. E.g uv run, uv add, uv sync 