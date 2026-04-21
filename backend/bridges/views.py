from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from .models import Bridge, TollRate
from vehicles.models import Vehicle
from .serializers import BridgeSerializer, TollRateSerializer


# ✅ Bridge List & Creation API
class BridgeListCreateAPIView(generics.ListCreateAPIView):
    queryset = Bridge.objects.all().order_by('id')
    serializer_class = BridgeSerializer

class BridgeRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Bridge.objects.all()
    serializer_class = BridgeSerializer


# ✅ New Toll Calculation API
class TollCalculateAPIView(APIView):
    def get(self, request):
        bridge_id = request.query_params.get('bridge_id')
        vehicle_id = request.query_params.get('vehicle_id')

        if not bridge_id or not vehicle_id:
            return Response({"error": "bridge_id and vehicle_id required"}, status=400)

        try:
            bridge = Bridge.objects.get(id=bridge_id)
            vehicle = Vehicle.objects.get(id=vehicle_id)

            toll_rate = TollRate.objects.get(
                bridge=bridge,
                vehicle_type=vehicle.vehicle_type
            )

            closing_soon = False
            if toll_rate.disabled_at:
                time_since_disabled = timezone.now() - toll_rate.disabled_at
                if time_since_disabled.total_seconds() > 3600:
                    raise TollRate.DoesNotExist
                closing_soon = True

            return Response({
                "bridge": bridge.name,
                "vehicle_type": vehicle.vehicle_type.name,
                "amount": toll_rate.amount,
                "closing_soon": closing_soon
            })

        except Bridge.DoesNotExist:
            return Response({"error": "Bridge not found"}, status=404)

        except Vehicle.DoesNotExist:
            return Response({"error": "Vehicle not found"}, status=404)

        except TollRate.DoesNotExist:
            return Response({"error": "Toll rate not set for this vehicle type"}, status=404)


# ✅ Toll Rate CRUD API
class TollRateListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = TollRateSerializer

    def get_queryset(self):
        bridge_id = self.kwargs['bridge_id']
        # Do not return rates disabled more than 1 hour ago for normal listing
        return TollRate.objects.filter(bridge_id=bridge_id).exclude(
            disabled_at__isnull=False, 
            disabled_at__lt=timezone.now() - timedelta(hours=1)
        )

    def create(self, request, *args, **kwargs):
        bridge_id = self.kwargs['bridge_id']
        vehicle_type = request.data.get('vehicle_type')
        amount = request.data.get('amount')

        try:
            # Handle reactivating or updating an existing rate
            rate = TollRate.objects.get(bridge_id=bridge_id, vehicle_type__name=vehicle_type)
            rate.amount = amount
            rate.disabled_at = None
            rate.save()
            serializer = self.get_serializer(rate)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except TollRate.DoesNotExist:
            return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        bridge_id = self.kwargs['bridge_id']
        serializer.save(bridge_id=bridge_id)


class TollRateRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TollRate.objects.all()
    serializer_class = TollRateSerializer

    def perform_destroy(self, instance):
        instance.disabled_at = timezone.now()
        instance.save()


class RecentDisablesAPIView(APIView):
    def get(self, request):
        threshold = timezone.now() - timedelta(minutes=5)
        recent_disables = TollRate.objects.filter(disabled_at__gte=threshold).order_by('-disabled_at')[:5]
        
        d_list = []
        for r in recent_disables:
            d_list.append({
                'id': r.id,
                'bridge_name': r.bridge.name,
                'vehicle_type': r.vehicle_type.name,
                'disabled_at': r.disabled_at
            })
        return Response(d_list)