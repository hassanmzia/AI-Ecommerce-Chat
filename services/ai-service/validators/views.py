"""
Views for the validators app -- expose validation endpoints.
"""

import logging

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .input_validator import InputValidator
from .output_validator import OutputValidator
from .models import ValidationLog
from .serializers import (
    InputValidationRequestSerializer,
    OutputValidationRequestSerializer,
    ValidationLogSerializer,
    ValidationResultSerializer,
)

logger = logging.getLogger(__name__)


class InputValidationView(APIView):
    """
    POST /api/v1/validators/input/
    Validate user input for prompt injection, toxicity, and topic relevance.
    """

    def post(self, request):
        serializer = InputValidationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data["text"]

        try:
            validator = InputValidator()
            is_valid, message, details = validator.validate(text)

            result = {
                "is_valid": is_valid,
                "message": message,
                "details": details,
            }
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Input validation error")
            return Response(
                {"error": "Validation error", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OutputValidationView(APIView):
    """
    POST /api/v1/validators/output/
    Validate agent output for toxicity, bias, and PII.
    """

    def post(self, request):
        serializer = OutputValidationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        text = serializer.validated_data["text"]
        user_query = serializer.validated_data.get("user_query", "")

        try:
            validator = OutputValidator()
            is_valid, message, details = validator.validate(text, user_query)

            result = {
                "is_valid": is_valid,
                "message": message,
                "details": details,
            }
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Output validation error")
            return Response(
                {"error": "Validation error", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ValidationLogListView(ListAPIView):
    """
    GET /api/v1/validators/logs/
    List validation audit logs with optional filtering.
    """

    serializer_class = ValidationLogSerializer

    def get_queryset(self):
        qs = ValidationLog.objects.all()
        validation_type = self.request.query_params.get("type")
        is_valid = self.request.query_params.get("is_valid")
        if validation_type:
            qs = qs.filter(validation_type=validation_type)
        if is_valid is not None:
            qs = qs.filter(is_valid=is_valid.lower() in ("true", "1"))
        return qs.order_by("-created_at")[:100]


class ValidationStatsView(APIView):
    """
    GET /api/v1/validators/stats/
    Get validation statistics.
    """

    def get(self, request):
        from django.db.models import Count

        total = ValidationLog.objects.count()
        by_type = dict(
            ValidationLog.objects.values_list("validation_type")
            .annotate(count=Count("id"))
            .values_list("validation_type", "count")
        )
        failed = ValidationLog.objects.filter(is_valid=False).count()
        passed = ValidationLog.objects.filter(is_valid=True).count()

        return Response(
            {
                "total_validations": total,
                "passed": passed,
                "failed": failed,
                "pass_rate": round(passed / total, 4) if total > 0 else 1.0,
                "by_type": by_type,
            }
        )
