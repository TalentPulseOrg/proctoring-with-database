from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ScreenCaptureBase(BaseModel):
    image_path: str

class ScreenCaptureCreate(ScreenCaptureBase):
    session_id: int
    timestamp: Optional[datetime] = None

class ScreenCaptureResponse(ScreenCaptureBase):
    id: int
    session_id: int
    timestamp: datetime

    class Config:
        from_attributes = True 