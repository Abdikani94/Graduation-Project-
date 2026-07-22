from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="JUST Admission Chatbot API", alias="APP_NAME")
    app_version: str = Field(default="1.0.0", alias="APP_VERSION")
    app_env: str = Field(default="development", alias="APP_ENV")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")

    dataset_path: str = Field(default="./data/just_dataset.csv", alias="DATASET_PATH")

    embedding_model_name: str = Field(
        default="paraphrase-multilingual-MiniLM-L12-v2",
        alias="EMBEDDING_MODEL_NAME",
    )

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")

    gemini_model_name: str = Field(
    default="gemini-3.5-flash",
    alias="GEMINI_MODEL_NAME",
)

    admission_contact_phone: str = Field(
        default="618833500",
        alias="ADMISSION_CONTACT_PHONE",
    )

    chroma_db_path: str = Field(default="./chroma_db", alias="CHROMA_DB_PATH")

    chroma_collection_name: str = Field(
        default="just_admission_knowledge",
        alias="CHROMA_COLLECTION_NAME",
    )

    mongodb_uri: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URI")
    mongodb_database: str = Field(default="just_chatbot", alias="MONGODB_DATABASE")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()