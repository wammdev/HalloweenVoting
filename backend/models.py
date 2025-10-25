"""
Pydantic models for API validation
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class EntryCreate(BaseModel):
    """Model for creating a new entry"""
    name: str = Field(..., min_length=1, max_length=100)
    costume_name: str = Field(..., min_length=1, max_length=100)


class Entry(BaseModel):
    """Model for an entry response"""
    id: str
    name: str
    costume_name: str
    photo_url: str
    created_at: datetime


class VoteCreate(BaseModel):
    """Model for creating a vote"""
    category: str = Field(..., min_length=1)
    entry_id: str = Field(..., min_length=1)
    voter_id: Optional[str] = None  # Optional fingerprint/session ID


class Vote(BaseModel):
    """Model for a vote response"""
    id: str
    category: str
    entry_id: str
    voter_id: Optional[str]
    created_at: datetime


class CategoryResult(BaseModel):
    """Model for vote results in a category"""
    entry_id: str
    name: str
    costume_name: str
    photo_url: str
    vote_count: int


class ResultsResponse(BaseModel):
    """Model for results by category"""
    category: str
    results: list[CategoryResult]


class Category(BaseModel):
    """Model for a category"""
    id: str
    name: str
    order: int


class ResultsRequest(BaseModel):
    """Model for requesting results with password"""
    password: str


class MCOption(BaseModel):
    """Model for a multiple choice option"""
    id: str
    option_text: str


class MCQuestion(BaseModel):
    """Model for a multiple choice question"""
    id: str
    question: str
    display_order: int
    options: list[MCOption]


class MCVoteCreate(BaseModel):
    """Model for creating a multiple choice vote"""
    question_id: str = Field(..., min_length=1)
    option_id: str = Field(..., min_length=1)
    voter_id: Optional[str] = None


class MCOptionResult(BaseModel):
    """Model for multiple choice option results"""
    option_id: str
    option_text: str
    vote_count: int


class MCResultsResponse(BaseModel):
    """Model for multiple choice question results"""
    question_id: str
    question: str
    options: list[MCOptionResult]
