import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        # Fail loudly rather than signing tokens with a weak/empty key.
        raise RuntimeError("JWT_SECRET environment variable is not set")
    return secret


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, _get_secret(), algorithm=ALGORITHM)


def get_current_user_id(authorization: str = Header(default=None)) -> int:
    """FastAPI dependency: extract and verify the Bearer token, return the user id."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, _get_secret(), algorithms=[ALGORITHM])
        return int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
