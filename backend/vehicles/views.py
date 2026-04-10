from rest_framework import generics, permissions
from .models import Vehicle
from .serializers import VehicleSerializer

class VehicleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Vehicle.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)