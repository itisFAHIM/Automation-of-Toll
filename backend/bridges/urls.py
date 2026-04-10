from django.urls import path
from .views import BridgeListAPIView, TollCalculateAPIView

urlpatterns = [
    path('', BridgeListAPIView.as_view(), name='bridge-list'),

    path('calculate/', TollCalculateAPIView.as_view()),
]