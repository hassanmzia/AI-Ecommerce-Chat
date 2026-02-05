"""
URL patterns for the agents app.
"""

from django.urls import path

from . import views

app_name = "agents"

urlpatterns = [
    path("", views.ChatView.as_view(), name="chat"),
    path("message", views.ChatView.as_view(), name="chat-message"),
    path("message/", views.ChatView.as_view(), name="chat-message-slash"),
    path("conversations/", views.ConversationListView.as_view(), name="conversation-list"),
    path("conversations/<uuid:pk>/", views.ConversationDetailView.as_view(), name="conversation-detail"),
    path("health/", views.AgentHealthView.as_view(), name="agent-health"),
    path("executions/", views.AgentExecutionListView.as_view(), name="execution-list"),
]
