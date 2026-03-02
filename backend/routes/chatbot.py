import json
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from google.genai import types
from services.gemini import get_gemini_client
from services.insforge import db_select, db_insert

router = APIRouter()


class ChatRequest(BaseModel):
    patient_wallet: str
    message: str


@router.post("/chat")
async def chat(req: ChatRequest):
    if not req.patient_wallet or not req.message:
        raise HTTPException(status_code=400, detail="patient_wallet and message are required")

    # Fetch patient analyses and chat history in parallel
    analyses, history = await _fetch_context(req.patient_wallet)

    # Build compact context string
    analysis_context = "\n".join([
        f"[{i+1}] {a.get('summary','')} | Risk:{a.get('risk_score',0)} | "
        f"{','.join(a.get('conditions',[]))} | {a.get('specialist','')} | {a.get('urgency','')}"
        for i, a in enumerate(analyses)
    ]) if analyses else "No reports found."

    system_instruction = f"""You are MediLock AI, an advanced, empathetic, and highly professional medical assistant.

CORE PERSONALITY & TONE:
- Empathetic and Reassuring: Always start with a warm, caring, and professional tone.
- Clear and Accessible: Explain complex medical terms using simple, everyday language.
- Structured and Organized: Use bullet points, bold text, and clear paragraphs.
- Objective yet Supportive: Provide factual insights from the reports without causing unnecessary panic.

STRICT SAFETY RULES:
1. NEVER diagnose a condition or prescribe medication.
2. ALWAYS include a clear disclaimer that your advice is informational only.
3. For high risk scores or emergencies, urgently recommend consulting a healthcare professional.
4. If a question is outside the reports scope, offer general health information but reiterate your limitations.

AVAILABLE PATIENT REPORTS:
{analysis_context}

Return your response STRICTLY as a JSON object:
{{
  "answer": "Your detailed Markdown response here",
  "warning": "Brief disclaimer or empty string",
  "confidence": 0.9
}}"""

    # Build chat history
    chat_history = []
    if history:
        for h in reversed(history):
            role = "user" if h.get("role") == "user" else "model"
            chat_history.append({"role": role, "parts": [{"text": h.get("message", "")}]})
        while chat_history and chat_history[0]["role"] != "user":
            chat_history.pop(0)

    client = get_gemini_client()

    # Convert history to new SDK format
    new_sdk_history = [
        types.Content(role=h["role"], parts=[types.Part(text=h["parts"][0]["text"])])
        for h in chat_history
    ]

    chat_session = client.chats.create(
        model="gemini-2.5-flash",
        history=new_sdk_history,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.3,
            response_mime_type="application/json",
            max_output_tokens=1024,
        ),
    )
    result = chat_session.send_message(req.message)

    response_text = result.text

    try:
        response = json.loads(re.sub(r"```json\n?|\n?```", "", response_text).strip())
    except Exception:
        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if json_match:
            try:
                response = json.loads(json_match.group(0))
            except Exception:
                response = {"answer": response_text, "warning": "", "confidence": 0.5}
        else:
            response = {"answer": response_text, "warning": "", "confidence": 0.5}

    # Save chat to DB (fire-and-forget style — run but don't block response)
    try:
        await db_insert("chat_history", {"patient_wallet": req.patient_wallet, "role": "user", "message": req.message})
        await db_insert("chat_history", {
            "patient_wallet": req.patient_wallet,
            "role": "assistant",
            "message": response.get("answer", ""),
            "warning": response.get("warning", ""),
            "confidence": response.get("confidence", 0.5),
        })
    except Exception as e:
        print(f"[DB] Failed to save chat: {e}")

    return response


async def _fetch_context(patient_wallet: str):
    try:
        analyses = await db_select(
            "analyses",
            filters={"patient_wallet": patient_wallet},
            select="summary,risk_score,conditions,specialist,urgency,created_at",
            order="created_at.desc",
            limit=5,
        )
    except Exception:
        analyses = []

    try:
        history = await db_select(
            "chat_history",
            filters={"patient_wallet": patient_wallet},
            select="role,message",
            order="created_at.desc",
            limit=10,
        )
    except Exception:
        history = []

    return analyses, history
