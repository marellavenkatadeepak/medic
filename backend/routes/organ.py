import json
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.gemini import get_gemini_model

router = APIRouter()


class OrganRequest(BaseModel):
    organName: str
    analysisText: dict


@router.post("/analyze-organ")
async def analyze_organ(req: OrganRequest):
    if not req.organName or not req.analysisText:
        raise HTTPException(status_code=400, detail="organName and analysisText are required")

    model = get_gemini_model("gemini-2.5-flash")

    prompt = f"""You are an expert AI medical consultant. Analyze the provided clinical text exclusively for the specific body part or organ provided.

Organ/Body Part to Analyze: {req.organName}

Clinical Analysis Data context:
{json.dumps(req.analysisText)}

Based ONLY on the clinical context provided and your medical knowledge, generate a detailed sub-analysis of health insights relating ONLY to the {req.organName}.
If the context does not explicitly mention the {req.organName}, logically connect the patient's conditions or risk_score to potential risks or standard preventative care for this specific organ.

Output your detailed analysis as a raw JSON object (without markdown wrapping) with exactly the following structure:
{{
  "status": "safe|warning|risk",
  "score": 0,
  "details": "A 1-sentence brief summary of the exact state of this organ.",
  "aiInsights": ["Detailed clinical observation 1", "Observation 2", "Observation 3"],
  "recommendations": ["Actionable medical recommendation 1", "Recommendation 2", "Recommendation 3"],
  "markers": [
    {{"name": "Marker Name", "value": "Placeholder or specific value", "status": "safe|warning|risk"}}
  ],
  "normalRange": "General healthy reference range for the main marker"
}}"""

    result = model.generate_content(prompt)
    raw = re.sub(r"```json|```", "", result.text).strip()

    try:
        organ_analysis = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse AI organ analysis response")

    return {"organAnalysis": organ_analysis}
