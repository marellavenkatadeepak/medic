import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL", "")
INSFORGE_SERVICE_KEY = os.getenv("INSFORGE_SERVICE_KEY", "")

async def main():
    url = f"{INSFORGE_BASE_URL}/rest/v1/appointments"
    params = {"select": "*", "patient_wallet": "eq.0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}
    headers = {
        "apikey": INSFORGE_SERVICE_KEY,
        "Authorization": f"Bearer {INSFORGE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, headers=headers)
        print("Status:", resp.status_code)
        print("Response:", resp.text)
        try:
            resp.raise_for_status()
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
