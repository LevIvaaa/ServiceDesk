"""API endpoints for log analysis."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.log_analysis_service import log_analysis_service

router = APIRouter()


class LogAnalysisRequest(BaseModel):
    """Request model for log analysis."""
    log_content: str
    language: str = "uk"


class LogAnalysisResponse(BaseModel):
    """Response model for log analysis."""
    analysis: str
    error_codes: list[str]
    status: str
    recommendations: list[str]


@router.post("/analyze", response_model=LogAnalysisResponse)
async def analyze_log(
    request: LogAnalysisRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Analyze a charging station log using AI.

    Accepts log content and returns structured analysis with:
    - Human-readable analysis
    - Detected error codes
    - Station/connector status
    - Recommendations for resolution
    """
    result = await log_analysis_service.analyze_log(
        log_content=request.log_content,
        language=request.language,
    )
    return LogAnalysisResponse(**result)
