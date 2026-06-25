# app/database/schemas.py
import unicodedata
from pydantic import BaseModel, field_validator
from typing import List, Dict, Any, Optional
from enum import Enum


class SyncRequest(BaseModel):
    assistant_id: str
    chat_id: str

class AuditRequest(BaseModel):
    chat_id: str
    system_prompt_agente: Optional[str] = "" 

    @field_validator("system_prompt_agente", mode="before")
    @classmethod
    def sanitize_prompt(cls, v):
        if not v:
            return ""
        return "".join(
            c for c in str(v)
            if not unicodedata.category(c).startswith("C") or c in ("\n", "\t")
        ).strip()

class UserChatUploadRequest(BaseModel):
    chat_id: Optional[str] = None  # Se vuoto, lo generiamo noi nel backend
    system_prompt: Optional[str] = None
    messages: List[Dict[str, Any]]  # Accetta la lista di messaggi in formato JSON pura

class UserRole(str, Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    created_at: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.viewer

class ChangeRoleRequest(BaseModel):
    role: UserRole

class AdminChangePasswordRequest(BaseModel):
    new_password: str

