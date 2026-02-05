"""
Views for the A2A module -- status and agent discovery.
"""

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .client import A2AClient

logger = logging.getLogger(__name__)


class A2AStatusView(APIView):
    """
    GET /api/v1/a2a/status/
    Check A2A server connectivity and health.
    """

    def get(self, request):
        client = A2AClient()
        try:
            health = client.health_check()
            return Response(health, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("A2A status check error")
            return Response(
                {"status": "error", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class A2AAgentDiscoveryView(APIView):
    """
    GET /api/v1/a2a/agents/
    Discover available agents on the A2A network.
    """

    def get(self, request):
        client = A2AClient()
        try:
            agents = client.discover_agents()
            return Response(
                {"agents": agents, "count": len(agents)},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("A2A agent discovery error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class A2AAgentCardView(APIView):
    """
    GET /api/v1/a2a/agents/<agent_id>/card/
    Retrieve the Agent Card for a specific peer agent.
    """

    def get(self, request, agent_id):
        client = A2AClient()
        try:
            card = client.get_agent_card(agent_id)
            if "error" in card:
                return Response(card, status=status.HTTP_502_BAD_GATEWAY)
            return Response(card, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("A2A agent card error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class A2ASendTaskView(APIView):
    """
    POST /api/v1/a2a/tasks/send/
    Send a task to a peer agent.

    Request body:
        {
            "agent_id": "some-agent",
            "task": {
                "type": "product_search",
                "description": "Find laptops under $1000",
                "input_data": {...},
                "metadata": {...}
            }
        }
    """

    def post(self, request):
        agent_id = request.data.get("agent_id")
        task = request.data.get("task")

        if not agent_id or not task:
            return Response(
                {"error": "Both 'agent_id' and 'task' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client = A2AClient()
        try:
            result = client.send_task(agent_id, task)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_502_BAD_GATEWAY)
            return Response(result, status=status.HTTP_202_ACCEPTED)
        except Exception as exc:
            logger.exception("A2A send task error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class A2ATaskStatusView(APIView):
    """
    GET /api/v1/a2a/tasks/<task_id>/status/
    Check the status of a previously submitted task.
    """

    def get(self, request, task_id):
        client = A2AClient()
        try:
            result = client.get_task_status(task_id)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("A2A task status error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class A2ATaskResultView(APIView):
    """
    GET /api/v1/a2a/tasks/<task_id>/result/
    Get the result of a completed task.
    """

    def get(self, request, task_id):
        client = A2AClient()
        try:
            result = client.receive_result(task_id)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("A2A task result error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class A2ALocalAgentCardView(APIView):
    """
    GET /api/v1/a2a/card/
    Return the Agent Card for THIS service, so peer agents can discover
    our capabilities.
    """

    def get(self, request):
        card = {
            "agent_id": "ai-ecommerce-chat-agent",
            "name": "AI E-Commerce Chat Agent",
            "version": "1.0.0",
            "description": (
                "Multi-agent AI system for e-commerce customer support. "
                "Handles order tracking, product search, customer information, "
                "payment inquiries, product recommendations, and sentiment analysis."
            ),
            "capabilities": [
                "customer_info_lookup",
                "order_tracking",
                "product_search",
                "payment_info",
                "product_recommendation",
                "sentiment_analysis",
                "input_validation",
                "output_validation",
            ],
            "supported_input": {
                "type": "text",
                "format": "natural_language",
                "max_length": 4096,
            },
            "supported_output": {
                "type": "text",
                "format": "natural_language",
            },
            "endpoints": {
                "chat": "/api/v1/chat/",
                "tools": "/api/v1/tools/",
                "health": "/health/",
            },
            "authentication": {
                "type": "none",
                "description": "No authentication required for development",
            },
        }
        return Response(card, status=status.HTTP_200_OK)
