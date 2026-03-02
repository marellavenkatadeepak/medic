from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services import tavus as tavus_service

router = APIRouter()


class TavusRequest(BaseModel):
    summary: str
    risk_score: int = 50
    conditions: Optional[list] = []
    specialist: Optional[str] = None
    urgency: Optional[str] = "low"


@router.post("/tavus-video")
async def generate_video(req: TavusRequest):
    if not req.summary:
        raise HTTPException(status_code=400, detail="summary is required")

    risk = req.risk_score
    if risk <= 30:
        risk_text = "This is a low risk score, which is great news!"
    elif risk <= 60:
        risk_text = "This is a moderate risk score. While not immediately concerning, it's worth paying attention to."
    elif risk <= 80:
        risk_text = "This is an elevated risk score. I'd recommend scheduling a follow-up appointment soon."
    else:
        risk_text = "This is a high risk score. I strongly recommend seeking medical attention promptly."

    urgency_map = {
        "critical": "Given the urgency level, please seek immediate medical attention.",
        "high": "I recommend scheduling an appointment within the next few days.",
        "medium": "A follow-up within the next couple of weeks would be advisable.",
    }
    urgency_text = urgency_map.get(req.urgency, "A routine check-up at your convenience would be sufficient.")

    conditions_text = f"The analysis identified the following conditions to be aware of: {', '.join(req.conditions)}." if req.conditions else ""
    specialist_text = f"I would recommend consulting with a {req.specialist} for a more thorough evaluation." if req.specialist else ""

    script = f"""Hello! I've reviewed your medical report and I'd like to walk you through the findings.

{req.summary}

Your overall health risk score is {risk} out of 100. {risk_text}

{conditions_text}

{specialist_text}

{urgency_text}

Remember, this AI analysis is meant to assist—not replace—professional medical advice. Please consult your doctor for a definitive diagnosis and treatment plan. Take care!"""

    video_name = f"MediChain Report Analysis - {datetime.utcnow().isoformat()}"

    try:
        data = await tavus_service.create_video(script=script, video_name=video_name)
        return {"success": True, "video_id": data.get("video_id"), "status": data.get("status", "queued")}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tavus API error: {str(e)}")


@router.get("/tavus-video")
async def get_video_status(video_id: str = Query(...)):
    try:
        data = await tavus_service.get_video_status(video_id)
        return {
            "video_id": data.get("video_id"),
            "status": data.get("status"),
            "download_url": data.get("download_url"),
            "stream_url": data.get("stream_url"),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to check Tavus status: {str(e)}")

class TavusConversationRequest(BaseModel):
    summary: str
    risk_score: int
    conditions: list[str]
    specialist: str
    urgency: str

@router.post("/tavus-conversation")
async def create_conversation(req: TavusConversationRequest):
    try:
        data = await tavus_service.create_conversation(
            summary=req.summary,
            risk_score=req.risk_score,
            conditions=req.conditions,
            specialist=req.specialist,
            urgency=req.urgency
        )
        return {"success": True, "conversation_url": data.get("conversation_url")}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tavus CVI error: {str(e)}")
