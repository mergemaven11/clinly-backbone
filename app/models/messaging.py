from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ConversationCreate(BaseModel):
    client_id: str = Field(min_length=1, max_length=64)


class ConversationResponse(BaseModel):
    id: str
    therapist_id: str
    client_id: str
    created_at: datetime


class MessageCreate(BaseModel):
    conversation_id: str = Field(min_length=1, max_length=64)
    plaintext_body: str = Field(min_length=1, max_length=10_000)

    @field_validator("plaintext_body")
    @classmethod
    def reject_blank_message(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message body cannot be blank")
        return value


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_user_id: str
    plaintext_body: str
    created_at: datetime
