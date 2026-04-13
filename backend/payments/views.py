import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
from django.utils import timezone
from datetime import timedelta
import uuid

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from bridges.models import Bridge, TollRate
from vehicles.models import Vehicle
from tollpasses.models import TollPass
from .models import Payment

class ProcessPaymentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        bridge_id = request.data.get('bridge_id')
        vehicle_id = request.data.get('vehicle_id')
        payment_method = request.data.get('payment_method', 'mock')

        if not bridge_id or not vehicle_id:
            return Response({"error": "bridge_id and vehicle_id are required"}, status=400)

        try:
            bridge = Bridge.objects.get(id=bridge_id)
            vehicle = Vehicle.objects.get(id=vehicle_id, user=user)

            # Get the exact toll amount
            toll_rate = TollRate.objects.get(bridge=bridge, vehicle_type=vehicle.vehicle_type)
            amount = toll_rate.amount

            # 1. Create the Toll Pass
            valid_from = timezone.now()
            expires_at = valid_from + timedelta(hours=6)
            
            toll_pass = TollPass.objects.create(
                user=user,
                vehicle=vehicle,
                bridge=bridge,
                valid_from=valid_from,
                expires_at=expires_at,
                status='active'
            )

            # Generate QR Code
            qr = qrcode.make(f"TollPass Token: {toll_pass.token}")
            qr_io = BytesIO()
            qr.save(qr_io, format='PNG')
            qr_file = ContentFile(qr_io.getvalue(), name=f"{toll_pass.token}.png")
            toll_pass.qr_code.save(f"{toll_pass.token}.png", qr_file)
            toll_pass.save()

            # 2. Create the Payment Record
            payment = Payment.objects.create(
                toll_pass=toll_pass,
                amount=amount,
                payment_method=payment_method,
                status='paid',
                transaction_id=str(uuid.uuid4())[:12].upper(),
                paid_at=timezone.now()
            )

            return Response({
                "message": "Payment successful",
                "toll_pass_id": toll_pass.id,
                "token": toll_pass.token,
                "amount": amount,
                "transaction_id": payment.transaction_id,
                "qr_code_url": request.build_absolute_uri(toll_pass.qr_code.url) if toll_pass.qr_code else None
            }, status=201)

        except Bridge.DoesNotExist:
            return Response({"error": "Bridge not found"}, status=404)
        except Vehicle.DoesNotExist:
            return Response({"error": "Vehicle not found. Ensure it belongs to you."}, status=404)
        except TollRate.DoesNotExist:
            return Response({"error": "Toll rate not set for this vehicle type on this bridge"}, status=400)
    
    def get(self, request):
        # Allow viewing payment history
        payments = Payment.objects.filter(toll_pass__user=request.user).order_by('-paid_at')
        data = [{
            "id": p.id,
            "bridge": p.toll_pass.bridge.name,
            "vehicle": p.toll_pass.vehicle.registration_number,
            "amount": p.amount,
            "payment_method": p.payment_method,
            "status": p.status,
            "transaction_id": p.transaction_id,
            "paid_at": p.paid_at
        } for p in payments]
        return Response(data)
