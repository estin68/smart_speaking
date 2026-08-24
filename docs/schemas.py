from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field


class TurnTranscript(BaseModel):
    speaker: Literal["user", "agent"]
    text: str
    timestamp: float
    wpm: Optional[float] = None
    filler_word_count: Optional[int] = None


class ScenarioContext(BaseModel):
    scenario_id: str
    scenario_title: str
    user_goal: str
    agent_persona: str
    difficulty_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    current_step: int = 1
    max_steps: int = 6


class QuantitativeMetrics(BaseModel):
    clarity_score: int = Field(ge=1, le=10, description="1 to 10 scale")
    assertiveness_score: int = Field(ge=1, le=10, description="1 to 10 scale")
    tact_empathy_score: int = Field(ge=1, le=10, description="1 to 10 scale")
    pacing_rating: Literal["Too Fast", "Optimal", "Too Slow"]
    filler_word_frequency: Literal["Low", "Moderate", "High"]


class DetailedEvaluation(BaseModel):
    overall_score: int = Field(ge=1, le=100)
    metrics: QuantitativeMetrics
    key_strengths: List[str]
    improvement_areas: List[str]
    suggested_alternative_phrase: str = Field(
        description="A rewritten version of a weak turn showing how to express it better."
    )
    actionable_tip: str


class AgenticSessionState(BaseModel):
    session_id: str
    user_id: str
    scenario: ScenarioContext
    transcript: List[TurnTranscript] = []
    agent_internal_emotion: str = "Neutral"
    is_scenario_complete: bool = False
    final_evaluation: Optional[DetailedEvaluation] = None
