from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    height: Optional[float] = None
    weight: Optional[float] = None
    age: Optional[int] = None
