from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    displayName: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    uid: str
    photoURL: Optional[str] = None
    createdAt: datetime
    customToken: str  # カスタムトークン追加
    
    class Config:
        from_attributes = True

class UserInDB(UserBase):
    uid: str
    photoURL: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    uid: str
    email: str
    displayName: str
    idToken: str
    refreshToken: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"