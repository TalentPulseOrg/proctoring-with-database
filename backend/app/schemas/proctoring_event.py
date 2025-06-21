from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime

class ProctoringEventDetails(BaseModel):
    message: str
    severity: Optional[str] = Field(default="info", description="Severity level: info, warning, or alert")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional event-specific metadata")

class ProctoringEvent(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str = Field(..., description="Type of proctoring event")
    details: ProctoringEventDetails

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        } 