"""
Keyboard Shortcuts Routes

This module contains the API routes for keyboard shortcuts monitoring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging
from pydantic import BaseModel

from app.database import get_db
from .services import KeyboardShortcutsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/proctoring/keyboard-shortcuts", tags=["Keyboard Shortcuts"])

class KeyboardShortcutViolationRequest(BaseModel):
    session_id: int
    key_combination: str
    screenshot_path: str = None
    additional_info: Dict[str, Any] = None

@router.post("/violation")
async def log_keyboard_shortcut_violation(
    violation: KeyboardShortcutViolationRequest,
    db: Session = Depends(get_db)
):
    """Log a keyboard shortcut violation"""
    try:
        success = KeyboardShortcutsService.log_keyboard_shortcut_violation(
            db=db,
            session_id=violation.session_id,
            key_combination=violation.key_combination,
            screenshot_path=violation.screenshot_path,
            additional_info=violation.additional_info
        )
        
        if success:
            return {"message": "Keyboard shortcut violation logged successfully", "session_id": violation.session_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to log keyboard shortcut violation")
    except Exception as e:
        logger.error(f"Error logging keyboard shortcut violation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/violations")
async def get_session_keyboard_shortcut_violations(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get all keyboard shortcut violations for a session"""
    try:
        return KeyboardShortcutsService.get_session_violations(db, session_id)
    except Exception as e:
        logger.error(f"Error getting session keyboard shortcut violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/status")
async def get_keyboard_shortcuts_status(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get the current keyboard shortcuts status for a session"""
    try:
        return KeyboardShortcutsService.get_keyboard_shortcuts_status(db, session_id)
    except Exception as e:
        logger.error(f"Error getting keyboard shortcuts status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/summary")
async def get_keyboard_shortcuts_summary(
    session_id: int,
    db: Session = Depends(get_db)
):
    """Get a summary of keyboard shortcut violations for a session"""
    try:
        return KeyboardShortcutsService.get_violation_summary(db, session_id)
    except Exception as e:
        logger.error(f"Error getting keyboard shortcuts summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/restricted-shortcuts")
async def get_restricted_shortcuts():
    """Get list of restricted keyboard shortcuts"""
    try:
        return {
            "restricted_shortcuts": KeyboardShortcutsService.RESTRICTED_SHORTCUTS,
            "total_count": len(KeyboardShortcutsService.RESTRICTED_SHORTCUTS)
        }
    except Exception as e:
        logger.error(f"Error getting restricted shortcuts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 