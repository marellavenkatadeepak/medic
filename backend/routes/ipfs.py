import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import httpx
from pydantic import BaseModel
import json

router = APIRouter()

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_KEY = os.getenv("PINATA_SECRET_KEY")
PINATA_GATEWAY = os.getenv("PINATA_GATEWAY", "https://gateway.pinata.cloud/ipfs")

@router.post("/ipfs/upload")
async def upload_to_ipfs(
    file: UploadFile = File(...),
    pinataMetadata: str = Form(None),
    pinataOptions: str = Form(None)
):
    """
    Securely proxies the file upload to Pinata using backend credentials.
    Accepts multipart/form-data.
    """
    if not PINATA_API_KEY or not PINATA_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Pinata API keys are missing on the backend.")

    try:
        # Read the file content
        file_content = await file.read()
        
        # Prepare the form data for Pinata
        # We use a tuple to specify (filename, file_content, content_type)
        files = {
            "file": (file.filename, file_content, file.content_type)
        }
        
        data = {}
        if pinataMetadata:
            data["pinataMetadata"] = pinataMetadata
        if pinataOptions:
            data["pinataOptions"] = pinataOptions

        headers = {
            "pinata_api_key": PINATA_API_KEY,
            "pinata_secret_api_key": PINATA_SECRET_KEY,
        }

        # Send to Pinata
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                files=files,
                data=data,
                headers=headers,
                timeout=60.0 # Uploads can take a moment
            )

        if response.status_code != 200:
            error_msg = response.text
            print(f"Pinata Error: {response.status_code} - {error_msg}")
            raise HTTPException(status_code=502, detail=f"Pinata upstream error: {error_msg}")

        result = response.json()
        ipfs_hash = result.get("IpfsHash")
        
        if not ipfs_hash:
            raise HTTPException(status_code=502, detail="Pinata response did not contain an IpfsHash")

        return {
            "success": True,
            "cid": ipfs_hash,
            "url": f"{PINATA_GATEWAY}/{ipfs_hash}",
            "size": result.get("PinSize", 0)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Exception during IPFS upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload to IPFS: {str(e)}")
