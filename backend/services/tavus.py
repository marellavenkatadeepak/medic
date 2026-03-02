import os
import httpx
from dotenv import load_dotenv

load_dotenv()


async def create_video(script: str, video_name: str) -> dict:
    api_key = os.getenv("TAVUS_API_KEY")
    replica_id = os.getenv("TAVUS_REPLICA_ID", "default")
    if not api_key:
        raise RuntimeError("TAVUS_API_KEY is not set in .env")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://tavusapi.com/v2/videos",
            json={"replica_id": replica_id, "script": script, "video_name": video_name},
            headers={"Content-Type": "application/json", "x-api-key": api_key},
        )
        resp.raise_for_status()
        return resp.json()


async def get_video_status(video_id: str) -> dict:
    api_key = os.getenv("TAVUS_API_KEY")
    if not api_key:
        raise RuntimeError("TAVUS_API_KEY is not set in .env")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://tavusapi.com/v2/videos/{video_id}",
            headers={"x-api-key": api_key},
        )
        resp.raise_for_status()
        return resp.json()

async def create_conversation(summary: str, risk_score: int, conditions: list[str], specialist: str, urgency: str) -> dict:
    api_key = os.getenv("TAVUS_API_KEY")
    replica_id = os.getenv("TAVUS_REPLICA_ID", "rfe12d8b9597")
    if not api_key:
        raise RuntimeError("TAVUS_API_KEY is not set in .env")

    conversation_context = f"""You are a friendly AI medical assistant explaining a patient's report results. 
Here is the analysis:
- Summary: {summary}
- Risk Score: {risk_score}/100
- Conditions Found: {', '.join(conditions)}
- Recommended Specialist: {specialist}
- Urgency Level: {urgency}

Explain these results clearly and compassionately. Reassure the patient while being honest. 
Suggest next steps and when they should see the {specialist}.
Do NOT diagnose. You are not replacing a doctor."""

    payload = {
        "replica_id": replica_id,
        "conversation_name": "Medical Report Review",
        "custom_greeting": f"Hi there! I've reviewed your medical report. Let me walk you through the findings. {summary}",
        "properties": {
            "max_call_duration": 600,
        },
        "conversational_context": conversation_context,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://tavusapi.com/v2/conversations",
            json=payload,
            headers={"Content-Type": "application/json", "x-api-key": api_key},
        )
        resp.raise_for_status()
        return resp.json()
