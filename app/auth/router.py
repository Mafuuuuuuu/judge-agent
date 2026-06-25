# app/auth/router.py

from fastapi import APIRouter, HTTPException, status, Depends
from app.auth.service import verify_password, create_access_token
from app.auth.dependencies import get_current_user, require_role
from app.database.connection import get_db
from app.auth.service import hash_password
import uuid
from fastapi import Request
from app.utils.limiter import limiter
from datetime import datetime
from app.database.schemas import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    RegisterRequest,
    ChangeRoleRequest,
    AdminChangePasswordRequest,
   )

router = APIRouter(prefix="/auth", tags=["auth"])



@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request:Request, body: LoginRequest, db=Depends(get_db)):
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
@limiter.limit("3/minute")
def register(request: Request, body: RegisterRequest,current_user: dict = Depends(require_role("admin")), db=Depends(get_db)):
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

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    user = db.execute(
        "SELECT id, username, role, created_at FROM users WHERE username = ?",
        (current_user["sub"],)
    ).fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )

    return UserResponse(
        id=user["id"],
        username=user["username"],
        role=user["role"],
        created_at=user["created_at"]
    )

# Lista utenti — solo admin
@router.get("/users", response_model=list[UserResponse])
def get_users(current_user: dict = Depends(require_role("admin")), db=Depends(get_db)):
    users = db.execute(
        "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC"
    ).fetchall()
    return [UserResponse(**dict(u)) for u in users]


# Cambia ruolo — solo admin
@router.patch("/users/{username}/role")
def change_role(
    username: str,
    body: ChangeRoleRequest,
    current_user: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    db.execute("UPDATE users SET role = ? WHERE username = ?", (body.role, username))
    db.commit()
    return {"message": f"Ruolo di {username} aggiornato a {body.role}"}

# Elimina utente — solo admin
@router.delete("/users/{username}")
def delete_user(
    username: str,
    current_user: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    if username == current_user["sub"]:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")

    user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    db.execute("DELETE FROM users WHERE username = ?", (username,))
    db.commit()
    return {"message": f"Utente {username} eliminato"}

# Cambia password — solo admin
@router.patch("/users/{username}/password")
def change_user_password(
    username: str,
    body: AdminChangePasswordRequest,
    current_user: dict = Depends(require_role("admin")),
    db=Depends(get_db)
):
    user = db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    db.execute(
        "UPDATE users SET hashed_password = ? WHERE username = ?",
        (hash_password(body.new_password), username)
    )
    db.commit()
    return {"message": f"Password di {username} aggiornata"}

