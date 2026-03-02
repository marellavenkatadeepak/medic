from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from services.insforge import db_select, db_delete, db_update, db_insert, db_select_single
from services.vault import encrypt_secret, decrypt_secret

router = APIRouter()


@router.get("/records/{wallet}")
async def get_records(wallet: str):
    """Return all analysis records for a given patient wallet address."""
    if not wallet:
        raise HTTPException(status_code=400, detail="wallet address is required")

    try:
        records = await db_select(
            "analyses",
            filters={"patient_wallet": wallet},
            order="created_at.desc",
        )
        
        # Intercept and decrypt the keys before sending to frontend
        import json
        for record in records:
            if record.get("encryption_key"):
                try:
                    # Try to parse the stored string as a vault JSON dictionary
                    key_data = json.loads(record["encryption_key"])
                    if "nonce" in key_data and "ciphertext" in key_data:
                        record["encryption_key"] = decrypt_secret(
                            key_data["nonce"], 
                            key_data["ciphertext"]
                        )
                except Exception:
                    # If it's not JSON or decryption fails (e.g., InvalidTag), leave it as is 
                    # (allows backwards compatibility with old plaintext keys)
                    pass
            
            # Mask the hash term for frontend network payloads
            if "encryption_key_hash" in record:
                record["file_fingerprint"] = record.pop("encryption_key_hash")

        return {"success": True, "records": records}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return {"success": True, "records": []}
        raise HTTPException(status_code=500, detail=f"Failed to fetch records: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch records: {str(e)}")


@router.delete("/records/{record_id}")
async def delete_record(record_id: str):
    """Delete an analysis record by ID."""
    try:
        await db_delete("analyses", record_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")


class UpdateRecordRequest(BaseModel):
    tx_hash: Optional[str] = None
    record_id: Optional[int] = None
    file_url: Optional[str] = None
    file_fingerprint: Optional[str] = None
    ipfs_cid: Optional[str] = None
    encryption_iv: Optional[str] = None
    organ_data: Optional[Dict[str, Any]] = None


@router.patch("/records/{record_id}")
async def update_record(record_id: str, body: UpdateRecordRequest):
    """Patch an analysis record (e.g. add tx_hash, IPFS data after upload)."""
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    
    if "file_fingerprint" in payload:
        payload["encryption_key_hash"] = payload.pop("file_fingerprint")
    
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    # Intercept plaintext encryption_key and encrypt it into the vault format
    if "encryption_key" in payload and payload["encryption_key"]:
        import json
        vault_data = encrypt_secret(payload["encryption_key"])
        payload["encryption_key"] = json.dumps(vault_data)
        
    try:
        updated = await db_update("analyses", record_id, payload)
        
        if updated and "encryption_key_hash" in updated:
            updated["file_fingerprint"] = updated.pop("encryption_key_hash")
            
        return {"success": True, "record": updated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update record: {str(e)}")


class CloneRecordRequest(BaseModel):
    patient_wallet: str
    file_name: str


@router.post("/records/check-cache")
async def check_cache(body: CloneRecordRequest):
    """Check if a record with the same file_name already exists for this wallet."""
    try:
        existing = await db_select_single(
            "analyses",
            filters={"patient_wallet": body.patient_wallet, "file_name": body.file_name},
            order="created_at.desc",
        )
        
        if existing and "encryption_key_hash" in existing:
            existing["file_fingerprint"] = existing.pop("encryption_key_hash")
            
        return {"exists": existing is not None, "record": existing}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            # PostgREST schema cache may not have loaded the table yet — treat as no cache
            return {"exists": False, "record": None}
        raise HTTPException(status_code=500, detail=f"Cache check failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache check failed: {str(e)}")


@router.post("/records/clone")
async def clone_record(body: Dict[str, Any]):
    """Clone an existing analysis record (used for cached file re-uploads)."""
    try:
        record_hash = body.get("record_hash")
        payload = {k: v for k, v in body.items() if k not in ("id", "created_at", "tx_hash", "record_id")}
        
        if "file_fingerprint" in payload:
            payload["encryption_key_hash"] = payload.pop("file_fingerprint")
            
        new_record = await db_insert("analyses", payload)
        
        if new_record and "encryption_key_hash" in new_record:
            new_record["file_fingerprint"] = new_record.pop("encryption_key_hash")
            
        return {"success": True, "record": new_record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clone failed: {str(e)}")

# --- Access Grants ---

@router.get("/access-grants/analysis/{analysis_id}")
async def get_access_grants(analysis_id: str):
    try:
        grants = await db_select(
            "access_grants",
            filters={"analysis_id": analysis_id, "is_active": "true"}
        )
        return {"success": True, "grants": grants or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch matching grants: {str(e)}")

class GrantAccessRequest(BaseModel):
    patient_wallet: str
    doctor_wallet: str
    analysis_id: str

@router.post("/access-grants")
async def grant_access(payload: GrantAccessRequest):
    try:
        await db_insert("access_grants", {
            "patient_wallet": payload.patient_wallet,
            "doctor_wallet": payload.doctor_wallet,
            "analysis_id": payload.analysis_id,
            "is_active": True
        })
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grant access: {str(e)}")

class RevokeAccessRequest(BaseModel):
    doctor_wallet: str
    analysis_id: str

@router.patch("/access-grants/revoke")
async def revoke_access(payload: RevokeAccessRequest):
    try:
        from datetime import datetime, timezone
        from services.insforge import get_supabase_client
        supabase = get_supabase_client()
        # db_update uses ID, but here we need to update by analysis_id and doctor_wallet. Using supabase directly.
        response = supabase.table("access_grants").update({
            "is_active": False,
            "revoked_at": datetime.now(timezone.utc).isoformat()
        }).eq("analysis_id", payload.analysis_id).eq("doctor_wallet", payload.doctor_wallet).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to revoke access: {str(e)}")
