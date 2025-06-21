from pydantic import BaseModel
from typing import Optional, List, Union

class AuthResponse(BaseModel):
    success: bool
    message: str
    match_score: Optional[float] = None
    liveness_score: Optional[float] = None
    reason: Optional[str] = None

class UserResponse(BaseModel):
    userId: str
    email: Optional[str] = None
    name: Optional[str] = None
    roles: List[str] = []

class UserRoleResponse(BaseModel):
    role: str

class IDPhotoUpload(BaseModel):
    user_id: str
    image_data: bytes

class LivePhotoVerification(BaseModel):
    user_id: str
    image_data: bytes 