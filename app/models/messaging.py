"""Document this first-party Python module."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ConversationCreate(BaseModel):
    """Represent ConversationCreate."""
    client_id: str = Field(min_length=1, max_length=64)


class ConversationResponse(BaseModel):
    """Represent ConversationResponse."""
    id: str
    therapist_id: str
    client_id: str
    created_at: datetime


class MessageCreate(BaseModel):
    """Represent MessageCreate."""
    conversation_id: str = Field(min_length=1, max_length=64)
    plaintext_body: str = Field(min_length=1, max_length=10_000)

    @field_validator("plaintext_body")
    @classmethod
    def reject_blank_message(cls, value: str) -> str:
        """Handle reject blank message.

        Args:
            value: Function argument.

        Returns:
            Function result.
        """
        if not value.strip():
            raise ValueError("message body cannot be blank")
        return value


class MessageResponse(BaseModel):
    """Represent MessageResponse."""
    id: str
    conversation_id: str
    sender_user_id: str
    plaintext_body: str
    created_at: datetime
