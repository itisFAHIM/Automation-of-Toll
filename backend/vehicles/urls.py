from django.urls import path
from .views import VehicleListCreateAPIView

urlpatterns = [
    path('', VehicleListCreateAPIView.as_view(), name='vehicle-list-create'),
]