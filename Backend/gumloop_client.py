from gumloop import GumLoopClient
import os
from dotenv import load_dotenv

load_dotenv()

def init_client():
    api_key = os.getenv("GUMLOOP_API_KEY")
    user_id = os.getenv("GUMLOOP_USER_ID")
    if not api_key or not user_id:
        raise ValueError("GUMLOOP_API_KEY or GUMLOOP_USER_ID not set in environment variables")

    client = GumLoopClient (api_key=api_key, user_id=user_id)

    return client

if __name__ == "__main__":
    init_client()
