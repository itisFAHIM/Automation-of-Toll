from django.urls import path
from .views import VehicleListCreateAPIView, VehicleTypeListCreateAPIView, VehicleTypeRetrieveUpdateDestroyAPIView

urlpatterns = [
    path('', VehicleListCreateAPIView.as_view(), name='vehicle-list-create'),
    path('types/', VehicleTypeListCreateAPIView.as_view(), name='vehicletype-list-create'),
    path('types/<int:pk>/', VehicleTypeRetrieveUpdateDestroyAPIView.as_view(), name='vehicletype-detail'),
]