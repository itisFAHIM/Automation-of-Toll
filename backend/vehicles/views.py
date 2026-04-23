from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from datetime import timedelta

from .models import Vehicle, VehicleType
from .serializers import VehicleSerializer, VehicleTypeSerializer

class VehicleTypeListCreateAPIView(generics.ListCreateAPIView):
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer

class VehicleTypeRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer

class VehicleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Vehicle.objects.filter(user=self.request.user).order_by('-submitted_at')

    def perform_create(self, serializer):
        now = timezone.now()
        # Thursday = weekday 3
        if now.weekday() == 3:
            eligible_at = now + timedelta(hours=72)
        else:
            eligible_at = now + timedelta(hours=24)

        serializer.save(
            user=self.request.user,
            status='pending',
            eligible_for_approval_at=eligible_at,
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


# Admin: List all pending vehicles across all users
class PendingVehiclesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        pending = Vehicle.objects.filter(status='pending').order_by('submitted_at')
        data = []
        for v in pending:
            eligible = v.eligible_for_approval_at
            can_approve = timezone.now() >= eligible if eligible else False
            data.append({
                'id': v.id,
                'owner_name': v.owner_name,
                'registration_number': v.registration_number,
                'vehicle_type': v.vehicle_type.name,
                'username': v.user.username,
                'submitted_at': v.submitted_at.isoformat(),
                'eligible_for_approval_at': eligible.isoformat() if eligible else None,
                'can_approve': can_approve,
                'vehicle_image': request.build_absolute_uri(v.vehicle_image.url) if v.vehicle_image else None,
                'number_plate_image': request.build_absolute_uri(v.number_plate_image.url) if v.number_plate_image else None,
                'document_image': request.build_absolute_uri(v.document_image.url) if v.document_image else None,
            })
        return Response(data)


# Admin: Approve a specific vehicle
class ApproveVehicleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, vehicle_id):
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        try:
            vehicle = Vehicle.objects.get(id=vehicle_id, status='pending')
        except Vehicle.DoesNotExist:
            return Response({"error": "Vehicle not found or already processed"}, status=404)

        vehicle.status = 'approved'
        vehicle.approved_at = timezone.now()
        vehicle.save()
        return Response({"message": f"Vehicle {vehicle.registration_number} approved successfully!"})


# Admin: Reject a specific vehicle
class RejectVehicleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, vehicle_id):
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        try:
            vehicle = Vehicle.objects.get(id=vehicle_id, status='pending')
        except Vehicle.DoesNotExist:
            return Response({"error": "Vehicle not found or already processed"}, status=404)

        vehicle.status = 'rejected'
        vehicle.save()
        return Response({"message": f"Vehicle {vehicle.registration_number} rejected."})