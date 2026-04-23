from django.urls import path
from .views import (
    BridgeListCreateAPIView, BridgeRetrieveUpdateDestroyAPIView,
    TollCalculateAPIView, TollRateListCreateAPIView, TollRateRetrieveUpdateDestroyAPIView,
    RecentDisablesAPIView, DistrictListAPIView, DistrictRetrieveUpdateDestroyAPIView,
    RouteSearchAPIView,
)

urlpatterns = [
    path('recent-disables/', RecentDisablesAPIView.as_view(), name='recent-disables'),
    path('', BridgeListCreateAPIView.as_view(), name='bridge-list'),
    path('<int:pk>/', BridgeRetrieveUpdateDestroyAPIView.as_view(), name='bridge-detail'),
    path('<int:bridge_id>/rates/', TollRateListCreateAPIView.as_view(), name='toll-rate-list'),
    path('rates/<int:pk>/', TollRateRetrieveUpdateDestroyAPIView.as_view(), name='toll-rate-detail'),
    path('calculate/', TollCalculateAPIView.as_view()),
    path('districts/', DistrictListAPIView.as_view(), name='district-list'),
    path('districts/<int:pk>/', DistrictRetrieveUpdateDestroyAPIView.as_view(), name='district-detail'),
    path('routes/search/', RouteSearchAPIView.as_view(), name='route-search'),
]