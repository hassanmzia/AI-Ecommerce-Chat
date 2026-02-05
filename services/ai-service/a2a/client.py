"""
A2A (Agent-to-Agent) client.

Connects to the A2A server to discover peer agents, delegate tasks,
and retrieve results following the A2A protocol.
"""

import logging
import os
import uuid
from typing import Any, Dict, List, Optional

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class A2AClient:
    """
    Client for the A2A (Agent-to-Agent) server.

    Default server URL: http://a2a-server:3069
    """

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        self.base_url = (
            base_url
            or getattr(settings, "A2A_SERVER_URL", None)
            or os.environ.get("A2A_SERVER_URL", "http://a2a-server:3069")
        )
        self.timeout = timeout
        self._client = httpx.Client(base_url=self.base_url, timeout=self.timeout)
        self._async_client: Optional[httpx.AsyncClient] = None

    # ------------------------------------------------------------------
    # Synchronous API
    # ------------------------------------------------------------------

    def discover_agents(self) -> List[Dict[str, Any]]:
        """
        Discover available agents on the A2A network.

        Returns a list of agent descriptors with at least
        ``agent_id``, ``name``, ``description``, and ``capabilities``.
        """
        try:
            response = self._client.get("/a2a/agents")
            response.raise_for_status()
            data = response.json()
            return data.get("agents", [])
        except httpx.ConnectError:
            logger.warning("A2A server not reachable at %s", self.base_url)
            return []
        except Exception as exc:
            logger.error("A2A discover_agents error: %s", exc)
            return []

    def send_task(self, agent_id: str, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a task to a specific agent.

        Args:
            agent_id: The target agent identifier.
            task:     A dict describing the task. Expected keys:
                      ``type``, ``description``, ``input_data``, ``metadata``.

        Returns:
            A dict with at least ``task_id`` and ``status``.
        """
        task_id = str(uuid.uuid4())
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/send",
            "id": task_id,
            "params": {
                "id": task_id,
                "agent_id": agent_id,
                "task": task,
            },
        }

        try:
            response = self._client.post("/a2a/tasks/send", json=payload)
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                return {"task_id": task_id, "status": "error", "error": data["error"]}
            result = data.get("result", {})
            result.setdefault("task_id", task_id)
            return result
        except httpx.ConnectError:
            msg = f"A2A server not reachable at {self.base_url}"
            logger.warning(msg)
            return {"task_id": task_id, "status": "error", "error": msg}
        except Exception as exc:
            logger.error("A2A send_task error: %s", exc)
            return {"task_id": task_id, "status": "error", "error": str(exc)}

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Check the status of a previously submitted task.

        Returns a dict with ``task_id``, ``status``, and optionally ``result``.
        """
        try:
            response = self._client.get(f"/a2a/tasks/{task_id}/status")
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            return {"task_id": task_id, "status": "unknown", "error": "A2A server not reachable"}
        except Exception as exc:
            logger.error("A2A get_task_status error: %s", exc)
            return {"task_id": task_id, "status": "unknown", "error": str(exc)}

    def receive_result(self, task_id: str) -> Dict[str, Any]:
        """
        Get the result of a completed task.

        If the task is still running this will return the current status.
        """
        try:
            response = self._client.get(f"/a2a/tasks/{task_id}/result")
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            return {"task_id": task_id, "status": "unknown", "error": "A2A server not reachable"}
        except Exception as exc:
            logger.error("A2A receive_result error: %s", exc)
            return {"task_id": task_id, "status": "unknown", "error": str(exc)}

    def get_agent_card(self, agent_id: str) -> Dict[str, Any]:
        """
        Retrieve the Agent Card for a specific peer agent.

        The Agent Card describes the agent's identity, capabilities,
        supported input/output formats, and authentication requirements.
        """
        try:
            response = self._client.get(f"/a2a/agents/{agent_id}/card")
            response.raise_for_status()
            return response.json()
        except httpx.ConnectError:
            return {"error": f"A2A server not reachable at {self.base_url}"}
        except Exception as exc:
            logger.error("A2A get_agent_card error: %s", exc)
            return {"error": str(exc)}

    def health_check(self) -> Dict[str, Any]:
        """Check if the A2A server is reachable and healthy."""
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

    async def adiscover_agents(self) -> List[Dict[str, Any]]:
        """Async version of discover_agents."""
        try:
            client = await self._get_async_client()
            response = await client.get("/a2a/agents")
            response.raise_for_status()
            data = response.json()
            return data.get("agents", [])
        except Exception as exc:
            logger.error("Async A2A discover_agents error: %s", exc)
            return []

    async def asend_task(self, agent_id: str, task: Dict[str, Any]) -> Dict[str, Any]:
        """Async version of send_task."""
        task_id = str(uuid.uuid4())
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/send",
            "id": task_id,
            "params": {
                "id": task_id,
                "agent_id": agent_id,
                "task": task,
            },
        }
        try:
            client = await self._get_async_client()
            response = await client.post("/a2a/tasks/send", json=payload)
            response.raise_for_status()
            data = response.json()
            result = data.get("result", {})
            result.setdefault("task_id", task_id)
            return result
        except Exception as exc:
            logger.error("Async A2A send_task error: %s", exc)
            return {"task_id": task_id, "status": "error", "error": str(exc)}

    async def aget_task_status(self, task_id: str) -> Dict[str, Any]:
        """Async version of get_task_status."""
        try:
            client = await self._get_async_client()
            response = await client.get(f"/a2a/tasks/{task_id}/status")
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Async A2A get_task_status error: %s", exc)
            return {"task_id": task_id, "status": "unknown", "error": str(exc)}

    async def areceive_result(self, task_id: str) -> Dict[str, Any]:
        """Async version of receive_result."""
        try:
            client = await self._get_async_client()
            response = await client.get(f"/a2a/tasks/{task_id}/result")
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            logger.error("Async A2A receive_result error: %s", exc)
            return {"task_id": task_id, "status": "unknown", "error": str(exc)}

    def close(self):
        """Close underlying HTTP clients."""
        try:
            self._client.close()
        except Exception:
            pass

    def __del__(self):
        self.close()
