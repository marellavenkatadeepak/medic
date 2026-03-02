from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from services.insforge import db_select, db_insert, db_update

router = APIRouter()

class DoctorProfilePayload(BaseModel):
    name: str
    specialty: str
    bio: str

class ConsultationNotePayload(BaseModel):
    patient_wallet: str
    analysis_id: str
    note: str

@router.get("/doctors")
async def get_all_doctors(specialty: str = None):
    try:
        filters = {}
        if specialty:
            # Note: exact match here, might need ilike equivalent in db_select if supported
            # Insforge db_select in this project seems to only support exact match or we can fetch all and filter
            pass
            
        profiles = await db_select("doctor_profiles", order="name.asc")
        
        if specialty and profiles:
            profiles = [p for p in profiles if specialty.lower() in p.get("specialty", "").lower()]
            
        return {"success": True, "doctors": profiles or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch doctors: {str(e)}")


@router.get("/doctor/profile/{wallet}")
async def get_doctor_profile(wallet: str):
    if not wallet:
        raise HTTPException(status_code=400, detail="wallet address is required")
    try:
        profiles = await db_select("doctor_profiles", filters={"wallet_address": wallet}, limit=1)
        return {"success": True, "profiles": profiles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

@router.post("/doctor/profile/{wallet}")
async def upsert_doctor_profile(wallet: str, payload: DoctorProfilePayload):
    try:
        profiles = await db_select("doctor_profiles", filters={"wallet_address": wallet}, limit=1)
        data = {
            "name": payload.name,
            "specialty": payload.specialty,
            "bio": payload.bio,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if profiles:
            profile_id = profiles[0]["id"]
            await db_update("doctor_profiles", profile_id, data)
        else:
            data["wallet_address"] = wallet
            await db_insert("doctor_profiles", data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {str(e)}")

@router.get("/doctor/grants/{wallet}")
async def get_doctor_grants(wallet: str):
    if not wallet:
        raise HTTPException(status_code=400, detail="wallet is required")
    try:
        grants = await db_select(
            "access_grants",
            filters={"doctor_wallet": wallet, "is_active": "true"},
            order="granted_at.desc"
        )
        
        if not grants:
            return {"success": True, "grants": []}
            
        enriched_grants = []
        for g in grants:
            analysis_id = g.get("analysis_id")
            analysis = None
            if analysis_id:
                analyses = await db_select("analyses", filters={"id": analysis_id}, limit=1)
                if analyses:
                    analysis = analyses[0]
            enriched_grants.append({**g, "analysis": analysis})
            
        return {"success": True, "grants": enriched_grants}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch grants: {str(e)}")

@router.get("/doctor/appointments/{wallet}")
async def get_doctor_appointments(wallet: str):
    if not wallet:
        raise HTTPException(status_code=400, detail="wallet is required")
    try:
        appts = await db_select(
            "appointments",
            filters={"doctor_wallet": wallet},
            order="date.asc"
        )
        return {"success": True, "appointments": appts or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch appointments: {str(e)}")

class AppointmentStatusPayload(BaseModel):
    status: str

@router.patch("/doctor/appointments/{appointment_id}")
async def update_appointment_status(appointment_id: str, payload: AppointmentStatusPayload):
    try:
        await db_update("appointments", appointment_id, {
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update appointment: {str(e)}")

@router.get("/doctor/notes/{doctor_wallet}/{patient_wallet}")
async def get_consultation_notes(doctor_wallet: str, patient_wallet: str):
    try:
        notes = await db_select(
            "consultation_notes",
            filters={"doctor_wallet": doctor_wallet, "patient_wallet": patient_wallet},
            order="created_at.desc"
        )
        return {"success": True, "notes": notes or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notes: {str(e)}")

@router.post("/doctor/notes/{doctor_wallet}")
async def add_consultation_note(doctor_wallet: str, payload: ConsultationNotePayload):
    try:
        await db_insert("consultation_notes", {
            "doctor_wallet": doctor_wallet,
            "patient_wallet": payload.patient_wallet,
            "analysis_id": payload.analysis_id,
            "note": payload.note
        })
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add note: {str(e)}")
