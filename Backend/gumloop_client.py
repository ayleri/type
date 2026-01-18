from gumloop import Gumloop
import os
from dotenv import load_dotenv

load_dotenv()

def init_client():
    api_key = os.getenv("GUMLOOP_API_KEY")
    if not api_key:
        raise ValueError("GUMLOOP_API_KEY not set in environment variables")

    client = Gumloop(api_key=api_key)

    return client
    # result = client.run_flow(
    #     flow_id=os.getenv("GUMLOOP_FLOW_ID"),  # You can also store flow ID in env
    #     inputs={"input_name": "input_value"}  # Optional: pass input data
    # )

    # # Get the output
    # print(result)

if __name__ == "__main__":
    init_client()
