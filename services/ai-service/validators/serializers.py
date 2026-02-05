"""
Serializers for the validators app.
"""

from rest_framework import serializers

from .models import ValidationLog


class ValidationLogSerializer(serializers.ModelSerializer):
    """Serializer for ValidationLog model."""

    class Meta:
        model = ValidationLog
        fields = [
            "id",
            "validation_type",
            "input_text",
            "is_valid",
            "message",
            "scores",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class InputValidationRequestSerializer(serializers.Serializer):
    """Request serializer for input validation endpoint."""

    text = serializers.CharField(max_length=4096)


class OutputValidationRequestSerializer(serializers.Serializer):
    """Request serializer for output validation endpoint."""

    text = serializers.CharField(max_length=8192)
    user_query = serializers.CharField(max_length=4096, required=False, default="")


class ValidationResultSerializer(serializers.Serializer):
    """Response serializer for validation results."""

    is_valid = serializers.BooleanField()
    message = serializers.CharField()
    details = serializers.DictField()
