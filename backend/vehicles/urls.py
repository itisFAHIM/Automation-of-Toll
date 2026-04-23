from django.urls import path
from .views import (
    VehicleListCreateAPIView, VehicleTypeListCreateAPIView,
    VehicleTypeRetrieveUpdateDestroyAPIView,
    PendingVehiclesAPIView, ApproveVehicleAPIView, RejectVehicleAPIView,
)

urlpatterns = [
    path('', VehicleListCreateAPIView.as_view(), name='vehicle-list-create'),
    path('types/', VehicleTypeListCreateAPIView.as_view(), name='vehicletype-list-create'),
    path('types/<int:pk>/', VehicleTypeRetrieveUpdateDestroyAPIView.as_view(), name='vehicletype-detail'),
    path('pending/', PendingVehiclesAPIView.as_view(), name='vehicle-pending'),
    path('<int:vehicle_id>/approve/', ApproveVehicleAPIView.as_view(), name='vehicle-approve'),
    path('<int:vehicle_id>/reject/', RejectVehicleAPIView.as_view(), name='vehicle-reject'),
]