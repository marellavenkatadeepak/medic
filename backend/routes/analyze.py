import asyncio
import hashlib
import json
import re
import base64
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.gemini import get_gemini_client
from services.insforge import db_insert
from google.genai import types
from google.genai.errors import ClientError

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzeRequest(BaseModel):
    file_base64: str
    file_type: str = "application/pdf"
    patient_wallet: str
    file_name: str = "report"


@router.post("/analyze-report")
async def analyze_report(req: AnalyzeRequest):
    if not req.file_base64 or not req.patient_wallet:
        raise HTTPException(status_code=400, detail="file_base64 and patient_wallet are required")

    client = get_gemini_client()

    prompt = """You are a professional medical analysis AI assistant. Analyze the provided medical report and return a structured JSON response.
You are NOT replacing a doctor.
Do not include any personal information in the JSON response.
Return ONLY valid JSON in this exact format:
{
  "summary": "A detailed, empathetic summary (4-6 sentences) focusing on the patient's experience, symptoms, and potential impact on daily life.",
  "risk_score": 50,
  "conditions": ["list", "of", "detected", "conditions"],
  "biomarkers": { "hemoglobin": "12.5 g/dL", "platelets": "250000 /uL" },
  "specialist": "Recommended specialist type (e.g. Cardiologist)",
  "urgency": "low|medium|high|critical",
  "improvement_plan": ["Actionable lifestyle/health step 1", "Actionable step 2", "Actionable step 3"]
}
Ensure risk_score is a number. Extract biomarkers as key-value pairs where possible."""

    file_bytes = base64.b64decode(req.file_base64)

    # Retry with exponential backoff for rate-limit (429) errors
    max_retries = 3
    response = None
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    prompt,
                    types.Part.from_bytes(data=file_bytes, mime_type=req.file_type),
                ],
            )
            break  # Success — exit retry loop
        except ClientError as e:
            if e.status_code == 429 and attempt < max_retries - 1:
                wait_time = (attempt + 1) * 35  # 35s, 70s — respect the ~33s retry hint
                logger.warning(f"Gemini rate limit hit (attempt {attempt + 1}/{max_retries}). Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                raise HTTPException(
                    status_code=429 if e.status_code == 429 else 502,
                    detail=f"Gemini API error: {str(e)}. Please wait a minute and try again."
                )

    if response is None:
        raise HTTPException(status_code=502, detail="Failed to get response from Gemini API after retries.")

    response_text = response.text

    # Parse JSON safely
    try:
        cleaned = re.sub(r"```json\n?|\n?```", "", response_text).strip()
        json_match = re.search(r"\{[\s\S]*\}", cleaned)
        analysis = json.loads(json_match.group(0) if json_match else cleaned)
    except Exception:
        analysis = {
            "summary": "Analysis completed but format was invalid. Please review the raw report manually.",
            "risk_score": 50,
            "conditions": ["Formatted extraction failed"],
            "biomarkers": {},
            "specialist": "General Practitioner",
            "urgency": "low",
            "improvement_plan": ["Please consult a healthcare professional for a tailored improvement plan."]
        }

    # SHA-256 hash of the analysis result
    hash_payload = json.dumps(analysis).encode()
    record_hash = "0x" + hashlib.sha256(hash_payload).hexdigest()

    # Store in InsForge DB
    db_record = await db_insert("analyses", {
        "patient_wallet": req.patient_wallet,
        "file_name": req.file_name,
        "file_url": "direct-upload",
        "ocr_text": response_text,
        "summary": analysis.get("summary", ""),
        "risk_score": analysis.get("risk_score", 50),
        "conditions": analysis.get("conditions", []),
        "biomarkers": analysis.get("biomarkers", {}),
        "specialist": analysis.get("specialist", "General"),
        "urgency": analysis.get("urgency", "low"),
        "improvement_plan": analysis.get("improvement_plan", []),
        "record_hash": record_hash,
    })

    return {
        "success": True,
        "analysis": {
            "id": db_record.get("id"),
            "summary": analysis.get("summary"),
            "risk_score": analysis.get("risk_score"),
            "conditions": analysis.get("conditions"),
            "specialist": analysis.get("specialist"),
            "urgency": analysis.get("urgency"),
            "biomarkers": analysis.get("biomarkers"),
            "improvement_plan": analysis.get("improvement_plan", []),
            "record_hash": record_hash,
        }
    }
