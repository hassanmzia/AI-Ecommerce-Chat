"""
URL patterns for the validators app.
"""

from django.urls import path

from . import views

app_name = "validators"

urlpatterns = [
    path("input", views.InputValidationView.as_view(), name="input-validation"),
    path("input/", views.InputValidationView.as_view()),
    path("output", views.OutputValidationView.as_view(), name="output-validation"),
    path("output/", views.OutputValidationView.as_view()),
    path("logs/", views.ValidationLogListView.as_view(), name="validation-logs"),
    path("stats/", views.ValidationStatsView.as_view(), name="validation-stats"),
]
