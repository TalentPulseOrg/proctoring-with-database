from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class FaceVerificationBase(BaseModel):
    user_id: int
    id_photo_path: Optional[str] = None
    is_verified: Optional[bool] = False
    match_score: Optional[float] = None
    liveness_score: Optional[float] = None

class FaceVerificationCreate(FaceVerificationBase):
    pass

class FaceVerificationUpdate(BaseModel):
    id_photo_path: Optional[str] = None
    is_verified: Optional[bool] = None
    match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    verification_date: Optional[datetime] = None

class FaceVerificationResponse(FaceVerificationBase):
    id: int
    verification_date: datetime

    class Config:
        from_attributes = True 