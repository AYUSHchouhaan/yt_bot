from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.auth.deps import DbUserDep, SessionDep
from app.models import IngestJob

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobStatus(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    total: int
    done: int
    error: str | None


@router.get("/{job_id}", response_model=JobStatus)
async def get_job(job_id: int, user: DbUserDep, session: SessionDep) -> IngestJob:
    job = (
        await session.execute(select(IngestJob).where(IngestJob.id == job_id))
    ).scalar_one_or_none()
    if job is None or job.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )
    return job
