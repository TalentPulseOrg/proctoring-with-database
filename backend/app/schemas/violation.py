from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class ViolationBase(BaseModel):
    violation_type: str
    details: Optional[Dict[str, Any]] = None
    filepath: Optional[str] = None

class ViolationCreate(ViolationBase):
    session_id: int
    timestamp: Optional[datetime] = None

class ViolationResponse(ViolationBase):
    id: int
    session_id: int
    timestamp: datetime

    class Config:
        from_attributes = True 