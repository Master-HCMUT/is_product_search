from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenAI API key    
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL_ID: str = "gpt-4.1"
    GEMINI_API_KEY: str = ""

    # Infrastructure URLs
    QDRANT_URL: str = "http://qdrant:6333"
    SUPERLINKED_URL: str = "http://superlinked:8080"

    # Gemini model for LLM tasks (query parsing, feedback analysis)
    GEMINI_MODEL_ID: str = "gemma-4-26b-a4b-it"

    # CLIP image/text-to-image search
    CLIP_MODEL_PATH: str = "models/clip_model.pt"
    CLIP_DEVICE: str = "cpu"
    CLIP_IMAGE_COLLECTION: str = "product_clip_images"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
