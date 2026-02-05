"""
Views for the agents app - chat endpoint and conversation management.
"""

import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message, AgentExecution
from .orchestrator import AgentOrchestrator
from .serializers import (
    ChatRequestSerializer,
    ChatResponseSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
    AgentExecutionSerializer,
    AgentHealthSerializer,
)

logger = logging.getLogger(__name__)


class ChatView(APIView):
    """
    POST /api/v1/chat/
    Accepts a user message, runs it through the multi-agent orchestrator,
    and returns the response.
    """

    throttle_scope = "user"

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user_message = data["message"]
        conversation_id = data.get("conversation_id")
        user_id = data.get("user_id", "anonymous")
        metadata = data.get("metadata", {})

        try:
            orchestrator = AgentOrchestrator()
            result = orchestrator.process_message(
                user_message=user_message,
                conversation_id=str(conversation_id) if conversation_id else None,
                user_id=user_id,
                metadata=metadata,
            )

            response_serializer = ChatResponseSerializer(data=result)
            if response_serializer.is_valid():
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            # If serializer validation fails, return raw result (it is still correct data)
            return Response(result, status=status.HTTP_200_OK)

        except Exception as exc:
            logger.exception("Chat processing error")
            return Response(
                {
                    "error": "An error occurred while processing your message.",
                    "detail": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConversationListView(ListAPIView):
    """
    GET /api/v1/chat/conversations/
    List conversations for a user. Pass ?user_id=xxx query param.
    """

    serializer_class = ConversationListSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id", "anonymous")
        return Conversation.objects.filter(user_id=user_id).order_by("-updated_at")


class ConversationDetailView(RetrieveAPIView):
    """
    GET /api/v1/chat/conversations/<uuid:pk>/
    Get a single conversation with all messages.
    """

    serializer_class = ConversationDetailSerializer
    queryset = Conversation.objects.all()
    lookup_field = "pk"


class AgentHealthView(APIView):
    """
    GET /api/v1/chat/health/
    Returns health status of all agents.
    """

    throttle_scope = "anon"

    def get(self, request):
        try:
            orchestrator = AgentOrchestrator()
            health_data = orchestrator.get_agent_health()
            serializer = AgentHealthSerializer(data=health_data, many=True)
            if serializer.is_valid():
                return Response(
                    {
                        "status": "healthy",
                        "timestamp": timezone.now().isoformat(),
                        "agents": serializer.data,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {
                    "status": "healthy",
                    "timestamp": timezone.now().isoformat(),
                    "agents": health_data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("Health check error")
            return Response(
                {"status": "error", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AgentExecutionListView(ListAPIView):
    """
    GET /api/v1/chat/executions/
    List agent executions with optional filtering.
    """

    serializer_class = AgentExecutionSerializer

    def get_queryset(self):
        qs = AgentExecution.objects.all()
        agent_type = self.request.query_params.get("agent_type")
        status_filter = self.request.query_params.get("status")
        if agent_type:
            qs = qs.filter(agent_type=agent_type)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by("-started_at")[:100]
