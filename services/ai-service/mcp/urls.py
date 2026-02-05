"""
URL patterns for the MCP module.
"""

from django.urls import path

from . import views

app_name = "mcp"

urlpatterns = [
    path("status/", views.MCPStatusView.as_view(), name="mcp-status"),
    path("tools/", views.MCPToolListView.as_view(), name="mcp-tool-list"),
    path("tools/call/", views.MCPToolCallView.as_view(), name="mcp-tool-call"),
    path("tools/<str:tool_name>/schema/", views.MCPToolSchemaView.as_view(), name="mcp-tool-schema"),
]
