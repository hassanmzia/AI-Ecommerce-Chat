"""
Serializers for the agents app.
"""

from rest_framework import serializers

from .models import Conversation, Message, AgentExecution


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model."""

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "role",
            "content",
            "created_at",
            "metadata",
            "tool_calls",
            "validation_status",
        ]
        read_only_fields = ["id", "created_at"]


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer for listing conversations (without messages)."""

    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "user_id",
            "title",
            "created_at",
            "updated_at",
            "metadata",
            "message_count",
            "last_message",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if last:
            return {
                "role": last.role,
                "content": last.content[:200],
                "created_at": last.created_at.isoformat(),
            }
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Serializer for a single conversation with all messages."""

    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "user_id",
            "title",
            "created_at",
            "updated_at",
            "metadata",
            "messages",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ChatRequestSerializer(serializers.Serializer):
    """Serializer for incoming chat requests."""

    message = serializers.CharField(max_length=4096)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    user_id = serializers.CharField(max_length=255, default="anonymous", allow_null=True)
    metadata = serializers.JSONField(required=False, default=dict)


class ChatResponseSerializer(serializers.Serializer):
    """Serializer for chat responses."""

    conversation_id = serializers.UUIDField()
    message_id = serializers.UUIDField()
    response = serializers.CharField()
    agent_type = serializers.CharField()
    intent = serializers.CharField()
    validation_status = serializers.CharField()
    tool_calls = serializers.ListField(child=serializers.DictField(), default=list)
    metadata = serializers.DictField(default=dict)


class AgentExecutionSerializer(serializers.ModelSerializer):
    """Serializer for AgentExecution model."""

    class Meta:
        model = AgentExecution
        fields = [
            "id",
            "agent_type",
            "conversation",
            "input_data",
            "output_data",
            "status",
            "execution_time_ms",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AgentHealthSerializer(serializers.Serializer):
    """Serializer for agent health status."""

    agent_name = serializers.CharField()
    status = serializers.CharField()
    last_execution = serializers.DateTimeField(allow_null=True)
    total_executions = serializers.IntegerField()
    success_rate = serializers.FloatField()
    average_duration_ms = serializers.FloatField(allow_null=True)
