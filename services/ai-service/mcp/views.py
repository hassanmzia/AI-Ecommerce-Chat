"""
Views for the MCP module -- status and tool listing.
"""

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .client import MCPClient

logger = logging.getLogger(__name__)


class MCPStatusView(APIView):
    """
    GET /api/v1/mcp/status/
    Check MCP server connectivity and health.
    """

    def get(self, request):
        client = MCPClient()
        try:
            health = client.health_check()
            return Response(health, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("MCP status check error")
            return Response(
                {"status": "error", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class MCPToolListView(APIView):
    """
    GET /api/v1/mcp/tools/
    List all tools available on the MCP server.
    """

    def get(self, request):
        client = MCPClient()
        try:
            tools = client.list_tools()
            return Response(
                {"tools": tools, "count": len(tools)},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("MCP tool list error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class MCPToolCallView(APIView):
    """
    POST /api/v1/mcp/tools/call/
    Invoke a tool on the MCP server.

    Request body:
        {"name": "tool_name", "params": {...}}
    """

    def post(self, request):
        name = request.data.get("name")
        params = request.data.get("params", {})

        if not name:
            return Response(
                {"error": "Tool name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client = MCPClient()
        try:
            result = client.call_tool(name, params)
            if "error" in result:
                return Response(result, status=status.HTTP_502_BAD_GATEWAY)
            return Response(
                {"tool": name, "result": result},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("MCP tool call error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()


class MCPToolSchemaView(APIView):
    """
    GET /api/v1/mcp/tools/<tool_name>/schema/
    Retrieve the JSON Schema for a specific MCP tool.
    """

    def get(self, request, tool_name):
        client = MCPClient()
        try:
            schema = client.get_tool_schema(tool_name)
            if "error" in schema:
                return Response(schema, status=status.HTTP_404_NOT_FOUND)
            return Response(schema, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("MCP tool schema error")
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            client.close()
