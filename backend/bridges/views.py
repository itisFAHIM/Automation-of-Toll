from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Bridge, TollRate
from vehicles.models import Vehicle
from .serializers import BridgeSerializer


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

            return Response({
                "bridge": bridge.name,
                "vehicle_type": vehicle.vehicle_type,
                "amount": toll_rate.amount
            })

        except Bridge.DoesNotExist:
            return Response({"error": "Bridge not found"}, status=404)

        except Vehicle.DoesNotExist:
            return Response({"error": "Vehicle not found"}, status=404)

        except TollRate.DoesNotExist:
            return Response({"error": "Toll rate not set for this vehicle type"}, status=404)

from .serializers import TollRateSerializer

# ✅ Toll Rate CRUD API
class TollRateListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = TollRateSerializer

    def get_queryset(self):
        bridge_id = self.kwargs['bridge_id']
        return TollRate.objects.filter(bridge_id=bridge_id)

    def perform_create(self, serializer):
        bridge_id = self.kwargs['bridge_id']
        serializer.save(bridge_id=bridge_id)

class TollRateRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TollRate.objects.all()
    serializer_class = TollRateSerializer