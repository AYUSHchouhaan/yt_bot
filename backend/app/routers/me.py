from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.auth.deps import DbUserDep
from app.models import AppUser

router = APIRouter(tags=["me"])


class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supabase_id: str
    email: str
    display_name: str | None
    avatar_url: str | None
    created_at: datetime


@router.get("/me", response_model=UserProfile)
async def read_me(user: DbUserDep) -> AppUser:
    return user
