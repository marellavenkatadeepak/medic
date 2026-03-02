import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL")
INSFORGE_SERVICE_KEY = os.getenv("INSFORGE_SERVICE_KEY")

class CalendarCreateRequest(BaseModel):
    doctor_wallet: str

@router.get("/integrations/calendar/callback")
async def calendar_callback(code: str, state: str):
    """Proxy for Supabase Google Calendar OAuth callback edge function."""
    if not INSFORGE_BASE_URL or not INSFORGE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Insforge credentials missing on backend.")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{INSFORGE_BASE_URL}/functions/v1/calendar-callback",
                params={"code": code, "state": state},
                headers={
                    "Authorization": f"Bearer {INSFORGE_SERVICE_KEY}"
                }
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Insforge error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


@router.post("/integrations/calendar/create")
async def calendar_create(payload: CalendarCreateRequest):
    """Proxy for Supabase calendar event creation edge function."""
    if not INSFORGE_BASE_URL or not INSFORGE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Insforge credentials missing on backend.")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{INSFORGE_BASE_URL}/functions/v1/calendar-create",
                json={"doctor_wallet": payload.doctor_wallet},
                headers={
                    "Authorization": f"Bearer {INSFORGE_SERVICE_KEY}",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Insforge error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")
