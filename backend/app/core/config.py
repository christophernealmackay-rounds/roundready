from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    supabase_url: str
    supabase_service_role_key: str
    demo_mode: bool = False

    model_config = {"env_file": ["../.env", ".env"], "extra": "ignore"}


settings = Settings()
