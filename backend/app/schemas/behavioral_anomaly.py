from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class BehavioralAnomalyBase(BaseModel):
    anomaly_type: str
    details: Optional[Dict[str, Any]] = None

class BehavioralAnomalyCreate(BehavioralAnomalyBase):
    session_id: int
    timestamp: Optional[datetime] = None

class BehavioralAnomalyResponse(BehavioralAnomalyBase):
    id: int
    session_id: int
    timestamp: datetime

    class Config:
        from_attributes = True 