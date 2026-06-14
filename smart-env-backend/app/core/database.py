from supabase import create_client, Client
from app.core.config import get_settings
from functools import lru_cache

settings = get_settings()


@lru_cache()
def get_supabase() -> Client:
    """
    Returns a Supabase client using the service role key.
    The service key bypasses Row Level Security — use only in backend.
    The anon key is for the Flutter/React apps directly.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_key
    )


# Convenience shortcut used throughout the app
db: Client = get_supabase()
