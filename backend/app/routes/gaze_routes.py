from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import datetime
import os
from ..utils.logging import log_event

# Create router with correct path prefix - remove any prefix as it will be added in main.py
router = APIRouter(tags=["gaze"])

@router.post("/analyze")
async def analyze_gaze_route(image: UploadFile = File(...)):
    return {"status": "error", "message": "Gaze analysis feature is not available."} 