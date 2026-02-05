"""
URL configuration for AI E-Commerce Chat Service.

Routes are mounted at paths expected by the Node.js API gateway
(/api/health, /api/chat/message, /api/validate/*, /api/agents, etc.)
as well as versioned paths (/api/v1/...) for direct access.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
import time

_start_time = time.time()


def health_check(request):
    """Service health check endpoint."""
    return JsonResponse(
        {
            "status": "healthy",
            "service": "ai-ecommerce-chat",
            "version": "1.0.0",
            "uptime_seconds": round(time.time() - _start_time, 1),
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),

    # Health check — multiple paths so both /health and /api/health work
    path("health", health_check, name="health-check"),
    path("health/", health_check),
    path("api/health", health_check, name="api-health-check"),
    path("api/health/", health_check),

    # ── Primary routes (used by the Node.js API gateway) ──────────
    path("api/chat/", include("agents.urls")),
    path("api/validate/", include("validators.urls")),
    path("api/tools/", include("tools.urls")),
    path("api/agents/", include("agents.urls")),
    path("api/mcp/", include("mcp.urls")),
    path("api/a2a/", include("a2a.urls")),

    # ── Versioned routes (for direct access / future use) ─────────
    path("api/v1/chat/", include("agents.urls")),
    path("api/v1/tools/", include("tools.urls")),
    path("api/v1/validators/", include("validators.urls")),
    path("api/v1/mcp/", include("mcp.urls")),
    path("api/v1/a2a/", include("a2a.urls")),
]
