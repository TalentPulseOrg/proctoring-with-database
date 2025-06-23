from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SnapshotCaptureBase(BaseModel):
    image_path: str

class SnapshotCaptureCreate(SnapshotCaptureBase):
    session_id: int
    timestamp: Optional[datetime] = None

class SnapshotCaptureResponse(SnapshotCaptureBase):
    id: int
    session_id: int
    timestamp: datetime

    class Config:
        from_attributes = True 