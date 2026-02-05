"""
URL patterns for the A2A module.
"""

from django.urls import path

from . import views

app_name = "a2a"

urlpatterns = [
    # Health / status
    path("status/", views.A2AStatusView.as_view(), name="a2a-status"),
    # Agent discovery
    path("agents/", views.A2AAgentDiscoveryView.as_view(), name="a2a-agent-discovery"),
    path("agents/<str:agent_id>/card/", views.A2AAgentCardView.as_view(), name="a2a-agent-card"),
    # Local agent card (for peer discovery)
    path("card/", views.A2ALocalAgentCardView.as_view(), name="a2a-local-card"),
    # Task management
    path("tasks/send/", views.A2ASendTaskView.as_view(), name="a2a-send-task"),
    path("tasks/<str:task_id>/status/", views.A2ATaskStatusView.as_view(), name="a2a-task-status"),
    path("tasks/<str:task_id>/result/", views.A2ATaskResultView.as_view(), name="a2a-task-result"),
]
