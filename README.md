# Intelligent Product Search Engine

An intelligent product search engine built with FastAPI, Next.js/Vite, Superlinked, and Qdrant. This platform allows natural language semantic search for products.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Docker & Docker Compose**: For running the Qdrant vector database.
- **uv**: For Python dependency management.
- **Node.js & npm**: For the frontend.

## Quick Start

You can start the entire platform (Qdrant, Superlinked Server, FastAPI Backend, and Frontend) using a single command from the project root.

```bash
docker compose up -d
```

This will build the containers (if not already built) and start all 4 services.

- The **Frontend** will be available at `http://localhost:5173`
- The **Backend API** will be available at `http://localhost:8000`
- The **Qdrant Dashboard** will be available at `http://localhost:6333/dashboard`

To see the logs for all services:
```bash
docker compose logs -f
```

## Architecture Notes
- **Database**: We use Qdrant as the sole database for product search (vector search + filtering).
- **Package Management**: `uv` is used strictly for Python backend dependency management.

## Qdrant Persistence

Qdrant stores its data in the local `./.qdrant/storage` directory through a bind mount. This keeps indexed products and collections on disk even when Docker-managed volumes are removed with:

```bash
docker compose down -v
```

To reset Qdrant data manually, stop the stack and delete `./.qdrant`.
