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
            qr.save(qr_io, format='PNG')  # type: ignore
            qr_file = ContentFile(qr_io.getvalue(), name=f"{toll_pass.token}.png")
            toll_pass.qr_code.save(f"{toll_pass.token}.png", qr_file)  # type: ignore
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
        # Allow viewing payment history - Admin/Employee sees all, Driver sees own
        is_staff = hasattr(request.user, 'profile') and request.user.profile.role in ['admin', 'employee']
        if is_staff:
            payments = Payment.objects.all().order_by('-paid_at')
        else:
            payments = Payment.objects.filter(toll_pass__user=request.user).order_by('-paid_at')
        
        from django.utils import timezone
        now = timezone.now()
        data = []
        for p in payments:
            tpass = p.toll_pass
            current_pass_status = tpass.status
            if current_pass_status == 'active' and now > tpass.expires_at:
                current_pass_status = 'expired'
                tpass.status = 'expired'
                tpass.save(update_fields=['status'])

            driver_name = f"{tpass.user.first_name} {tpass.user.last_name}".strip()
            if not driver_name:
                driver_name = tpass.user.username

            data.append({
                "id": p.id,
                "bridge": tpass.bridge.name,
                "vehicle": tpass.vehicle.registration_number,
                "driver_name": driver_name,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "status": p.status,
                "pass_status": current_pass_status,
                "renewal_status": tpass.renewal_status,
                "transaction_id": p.transaction_id,
                "token": str(tpass.token),
                "paid_at": p.paid_at,
                "expires_at": tpass.expires_at,
                "created_at": tpass.created_at
            })
        return Response(data)

from django.db.models import Sum, Count
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth

class TollAnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['employee', 'admin']:
            return Response({"error": "Unauthorized"}, status=403)

        now = timezone.now()

        # 1. Daily Revenue (last 7 days)
        seven_days_ago = now - timedelta(days=7)
        daily_payments = Payment.objects.filter(
            status='paid', 
            paid_at__gte=seven_days_ago
        ).annotate(
            day=TruncDay('paid_at')
        ).values('day').annotate(
            total=Sum('amount')
        ).order_by('day')

        daily_data = []
        for i in range(7):
            d = now - timedelta(days=6 - i)
            total = 0.0
            for dp in daily_payments:
                if dp['day'] and dp['day'].date() == d.date():
                    total = float(dp['total'] or 0.0)
                    break
            daily_data.append({
                "label": d.strftime('%a'),
                "value": total
            })

        # 2. Weekly Revenue (last 4 weeks)
        four_weeks_ago = now - timedelta(weeks=4)
        weekly_payments = Payment.objects.filter(
            status='paid',
            paid_at__gte=four_weeks_ago
        ).annotate(
            week=TruncWeek('paid_at')
        ).values('week').annotate(
            total=Sum('amount')
        ).order_by('week')

        weekly_data = []
        for i in range(4):
            w_start = now - timedelta(weeks=3 - i)
            total = 0.0
            w_num = w_start.isocalendar()[1]
            for wp in weekly_payments:
                if wp['week'] and wp['week'].isocalendar()[1] == w_num:
                    total = float(wp['total'] or 0.0)
                    break
            weekly_data.append({
                "label": f"Wk {i+1}",
                "value": total
            })

        # 3. Monthly Revenue (last 6 months)
        six_months_ago = now - timedelta(days=180)
        monthly_payments = Payment.objects.filter(
            status='paid',
            paid_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('paid_at')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')

        monthly_data = []
        for i in range(6):
            m_start = now - timedelta(days=(5 - i) * 30)
            total = 0.0
            for mp in monthly_payments:
                if mp['month'] and mp['month'].month == m_start.month and mp['month'].year == m_start.year:
                    total = float(mp['total'] or 0.0)
                    break
            monthly_data.append({
                "label": m_start.strftime('%b'),
                "value": total
            })

        # 4. Vehicle Type Segmentation
        total_scans = TollPass.objects.filter(status='used').count()
        vehicle_split = []
        colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3f3f46']
        
        from vehicles.models import VehicleType
        vtypes = VehicleType.objects.all()
        
        for i, vt in enumerate(vtypes):
            count = TollPass.objects.filter(status='used', vehicle__vehicle_type=vt).count()
            percent = round((count / total_scans * 100)) if total_scans > 0 else 0
            vehicle_split.append({
                "type": vt.name,
                "count": count,
                "percent": percent if total_scans > 0 else (25 if i < 4 else 0),
                "color": colors[i % len(colors)]
            })

        return Response({
            "daily": daily_data,
            "weekly": weekly_data,
            "monthly": monthly_data,
            "vehicle_split": vehicle_split
        })
