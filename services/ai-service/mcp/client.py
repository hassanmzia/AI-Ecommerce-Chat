"""
MCP (Model Context Protocol) client.

Connects to the MCP server to discover and invoke tools that are exposed
via the standardised MCP interface.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class MCPClient:
    """
    Client for the MCP (Model Context Protocol) server.

    Default server URL: http://mcp-server:3068
    """

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        self.base_url = (
            base_url
            or getattr(settings, "MCP_SERVER_URL", None)
            or os.environ.get("MCP_SERVER_URL", "http://mcp-server:3068")
        )
        self.timeout = timeout
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)
        self._async_client: Optional[httpx.AsyncClient] = None

    # ------------------------------------------------------------------
    # Synchronous API
    # ------------------------------------------------------------------

    def list_tools(self) -> List[Dict[str, Any]]:
        """
        Discover available tools on the MCP server.

        Returns a list of tool descriptors, each containing at least
        ``name``, ``description``, and ``inputSchema``.
        """
        try:
            response = self._client.post(
                "/mcp/tools/list",
                json={"jsonrpc": "2.0", "method": "tools/list", "id": 1},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("result", {}).get("tools", [])
        except httpx.ConnectError:
            logger.warning("MCP server not reachable at %s", self.base_url)
            return []
        except Exception as exc:
            logger.error("MCP list_tools error: %s", exc)
            return []

    def call_tool(self, name: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Invoke a tool on the MCP server.

        Args:
            name:   The tool name (as returned by ``list_tools``).
            params: A dict of input parameters for the tool.

        Returns:
            The tool result dict. On error an ``{"error": "..."}`` dict is returned.
        """
        try:
            response = self._client.post(
                "/mcp/tools/call",
                json={
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "id": 1,
                    "params": {
                        "name": name,
                        "arguments": params or {},
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                return {"error": data["error"]}
            return data.get("result", {})
        except httpx.ConnectError:
            msg = f"MCP server not reachable at {self.base_url}"
            logger.warning(msg)
            return {"error": msg}
        except Exception as exc:
            logger.error("MCP call_tool error: %s", exc)
            return {"error": str(exc)}

    def get_tool_schema(self, name: str) -> Dict[str, Any]:
        """
        Get the input/output JSON Schema for a specific tool.

        Falls back to searching the ``list_tools`` response.
        """
        try:
            # Try dedicated endpoint first
            response = self._client.post(
                "/mcp/tools/schema",
                json={
                    "jsonrpc": "2.0",
                    "method": "tools/schema",
                    "id": 1,
                    "params": {"name": name},
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("result", {})
        except Exception:
            # Fallback: look it up in the full tool list
            tools = self.list_tools()
            for tool in tools:
                if tool.get("name") == name:
                    return {
                        "name": name,
                        "description": tool.get("description", ""),
                        "inputSchema": tool.get("inputSchema", {}),
                    }
            return {"error": f"Tool '{name}' not found"}

    def health_check(self) -> Dict[str, Any]:
        """Check if the MCP server is reachable and healthy."""
        try:
            response = self._client.get("/health")
            response.raise_for_status()
            return {"status": "healthy", "server_url": self.base_url, "response": response.json()}
        except httpx.ConnectError:
            return {"status": "unreachable", "server_url": self.base_url}
        except Exception as exc:
            return {"status": "error", "server_url": self.base_url, "error": str(exc)}

    # ------------------------------------------------------------------
    # Async API
    # ------------------------------------------------------------------

    async def _get_async_client(self) -> httpx.AsyncClient:
        if self._async_client is None or self._async_client.is_closed:
            self._async_client = httpx.AsyncClient(
                base_url=self.base_url, timeout=self.timeout
            )
        return self._async_client

    async def alist_tools(self) -> List[Dict[str, Any]]:
        """Async version of list_tools."""
        try:
            client = await self._get_async_client()
            response = await client.post(
                "/mcp/tools/list",
                json={"jsonrpc": "2.0", "method": "tools/list", "id": 1},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("result", {}).get("tools", [])
        except Exception as exc:
            logger.error("Async MCP list_tools error: %s", exc)
            return []

    async def acall_tool(self, name: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Async version of call_tool."""
        try:
            client = await self._get_async_client()
            response = await client.post(
                "/mcp/tools/call",
                json={
                    "jsonrpc": "2.0",
                    "method": "tools/call",
                    "id": 1,
                    "params": {
                        "name": name,
                        "arguments": params or {},
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                return {"error": data["error"]}
            return data.get("result", {})
        except Exception as exc:
            logger.error("Async MCP call_tool error: %s", exc)
            return {"error": str(exc)}

    def close(self):
        """Close underlying HTTP clients."""
        try:
            self._client.close()
        except Exception:
            pass

    def __del__(self):
        self.close()
