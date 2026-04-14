from django.urls import path
from .views import BridgeListCreateAPIView, BridgeRetrieveUpdateDestroyAPIView, TollCalculateAPIView, TollRateListCreateAPIView, TollRateRetrieveUpdateDestroyAPIView

urlpatterns = [
    path('', BridgeListCreateAPIView.as_view(), name='bridge-list'),
    path('<int:pk>/', BridgeRetrieveUpdateDestroyAPIView.as_view(), name='bridge-detail'),
    path('<int:bridge_id>/rates/', TollRateListCreateAPIView.as_view(), name='toll-rate-list'),
    path('rates/<int:pk>/', TollRateRetrieveUpdateDestroyAPIView.as_view(), name='toll-rate-detail'),
    path('calculate/', TollCalculateAPIView.as_view()),
]