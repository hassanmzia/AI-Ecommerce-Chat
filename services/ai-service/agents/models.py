"""
Models for the agents app - conversations, messages, and agent executions.
"""

import uuid

from django.db import models
from django.utils import timezone


class Conversation(models.Model):
    """Represents a chat conversation session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=255, db_index=True)
    title = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user_id", "-updated_at"]),
        ]

    def __str__(self):
        return f"Conversation {self.id} - {self.user_id}"


class Message(models.Model):
    """Represents a single message in a conversation."""

    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("system", "System"),
    ]

    VALIDATION_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("passed", "Passed"),
        ("failed", "Failed"),
        ("skipped", "Skipped"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)
    tool_calls = models.JSONField(default=list, blank=True)
    validation_status = models.CharField(
        max_length=20,
        choices=VALIDATION_STATUS_CHOICES,
        default="pending",
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]

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

    AGENT_TYPE_CHOICES = [
        ("input_validation", "Input Validation"),
        ("intent_detection", "Intent Detection"),
        ("customer_support", "Customer Support"),
        ("product_search", "Product Search"),
        ("order_tracking", "Order Tracking"),
        ("payment_info", "Payment Info"),
        ("recommendation", "Recommendation"),
        ("sentiment_analysis", "Sentiment Analysis"),
        ("analytics", "Analytics"),
        ("output_validation", "Output Validation"),
        ("orchestrator", "Orchestrator"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent_type = models.CharField(max_length=50, choices=AGENT_TYPE_CHOICES)
    input_data = models.JSONField(default=dict, blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["agent_type", "-started_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"AgentExecution {self.id} ({self.agent_type}) - {self.status}"

    @property
    def duration_ms(self):
        """Calculate execution duration in milliseconds."""
        if self.completed_at and self.started_at:
            delta = self.completed_at - self.started_at
            return int(delta.total_seconds() * 1000)
        return None
