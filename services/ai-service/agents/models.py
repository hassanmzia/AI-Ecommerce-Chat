"""
Models for the agents app - conversations, messages, and agent executions.

These models map to tables created by init.sql (managed by the Node.js API).
Django does not create or alter these tables (managed = False).
"""

import uuid

from django.db import models


class Conversation(models.Model):
    """Represents a chat conversation session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True)
    title = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = "conversations"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Conversation {self.id} - {self.user_id}"


class Message(models.Model):
    """Represents a single message in a conversation."""

    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("system", "System"),
        ("tool", "Tool"),
    ]

    VALIDATION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("valid", "Valid"),
        ("invalid", "Invalid"),
        ("flagged", "Flagged"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    tool_calls = models.JSONField(null=True, blank=True)
    validation_status = models.CharField(
        max_length=20,
        choices=VALIDATION_STATUS_CHOICES,
        default="pending",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.id} ({self.role}) in {self.conversation_id}"


class AgentExecution(models.Model):
    """Tracks individual agent execution for monitoring and debugging."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("timeout", "Timeout"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent_type = models.CharField(max_length=100)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="executions",
    )
    input_data = models.JSONField(default=dict, blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")
    execution_time_ms = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "agent_executions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"AgentExecution {self.id} ({self.agent_type}) - {self.status}"
