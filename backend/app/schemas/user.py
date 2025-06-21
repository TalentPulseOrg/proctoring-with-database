from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# Base User schema with common attributes
class UserBase(BaseModel):
    name: str
    email: str
    role: str

# Schema for user creation
class UserCreate(UserBase):
    pass

# Schema for user in database
class UserInDB(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Schema for user response
class User(UserInDB):
    pass

# Schema for user update
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

# Schema for user login request
class UserLogin(BaseModel):
    email: str

# Schema for login response
class LoginResponse(BaseModel):
    user: User
    access_token: str 