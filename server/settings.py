from pydantic import BaseSettings


class Settings(BaseSettings):
    PORT: int = 8000
    ENV: str = ""
    SYSTEM_USERNAME: str = "system"

    MONGO_DB_USERNAME: str = "<ENTER_DB_USERNAME>"
    MONGO_DB_PASSWORD: str = "<ENTER_DB_PASSWORD>"
    MONGO_CLUSTER_NAME: str = "<ENTER_CLUSTER_NAME>"
    MONGO_DB_NAME: str = "<ENTER_DB_NAME>"
    MONGO_URI: str = "<ENTER_URI>"

    PLUGIN_DIRECTORY: str = "./plugins"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
