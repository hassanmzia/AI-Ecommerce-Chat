"""
URL configuration for AI E-Commerce Chat Service.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    """Service health check endpoint."""
    return JsonResponse(
        {
            "status": "healthy",
            "service": "ai-ecommerce-chat",
            "version": "1.0.0",
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health-check"),
    path("api/v1/chat/", include("agents.urls")),
    path("api/v1/tools/", include("tools.urls")),
    path("api/v1/validators/", include("validators.urls")),
    path("api/v1/mcp/", include("mcp.urls")),
    path("api/v1/a2a/", include("a2a.urls")),
]
