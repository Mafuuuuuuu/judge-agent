# app/auth/router.py

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.auth.service import verify_password, create_access_token
from app.database.connection import get_db
from app.auth.service import hash_password
import uuid
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/auth", tags=["auth"])


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



class UserRole(str, Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.viewer



@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db=Depends(get_db)):
    user = db.execute(
        "SELECT username, hashed_password, role, is_active FROM users WHERE username = ?",
        (body.username,)
    ).fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali non valide"
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Utente disabilitato"
        )

    if not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali non valide"
        )

    token = create_access_token(data={
        "sub": user["username"],
        "role": user["role"]
    })

    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserResponse)
def register(body: RegisterRequest, db=Depends(get_db)):
    existing = db.execute(
        "SELECT id FROM users WHERE username = ?",
        (body.username,)
    ).fetchone()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username già esistente"
        )

    user_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    hashed = hash_password(body.password)

    db.execute(
        "INSERT INTO users (id, username, hashed_password, role, is_active, created_at) VALUES (?,?,?,?,?,?)",
        (user_id, body.username, hashed, body.role, 1, created_at)
    )
    db.commit()

    return UserResponse(
        id=user_id,
        username=body.username,
        role=body.role,
        created_at=created_at
    )
