"""
Models for the validators app - validation audit logs.
"""

import uuid

from django.db import models


class ValidationLog(models.Model):
    """Audit log for all validation operations."""

    VALIDATION_TYPE_CHOICES = [
        ("input", "Input Validation"),
        ("output", "Output Validation"),
        ("prompt_injection", "Prompt Injection Check"),
        ("toxicity", "Toxicity Check"),
        ("topic_relevance", "Topic Relevance Check"),
        ("bias", "Bias Check"),
        ("pii", "PII Detection"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    validation_type = models.CharField(max_length=30, choices=VALIDATION_TYPE_CHOICES)
    input_text = models.TextField()
    is_valid = models.BooleanField()
    message = models.TextField(blank=True, default="")
    scores = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["validation_type", "-created_at"]),
            models.Index(fields=["is_valid"]),
        ]

    def __str__(self):
        status = "PASS" if self.is_valid else "FAIL"
        return f"ValidationLog {self.id} ({self.validation_type}) - {status}"
