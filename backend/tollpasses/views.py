from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.utils import timezone
from .models import TollPass

class VerifyPassAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['employee', 'admin']:
            return Response({"error": "Only approved employees can scan passes."}, status=403)

        token = request.data.get('token')
        if not token:
            return Response({"error": "Token is required"}, status=400)

        # Handle 'PASS:uuid' format from our QR generator
        if token.startswith('PASS:'):
            token = token.replace('PASS:', '')

        try:
            toll_pass = TollPass.objects.get(token=token)

            if toll_pass.is_used:
                return Response({
                    "status": "error",
                    "message": "Pass has already been used!",
                    "vehicle": toll_pass.vehicle.registration_number
                }, status=400)

            if timezone.now() > toll_pass.expires_at:
                return Response({
                    "status": "error",
                    "message": "Pass is expired!",
                    "vehicle": toll_pass.vehicle.registration_number
                }, status=400)

            # Mark as used
            toll_pass.is_used = True
            toll_pass.status = 'used'
            toll_pass.save()

            return Response({
                "status": "success",
                "message": "Pass Verified & Marked as Used!",
                "vehicle": toll_pass.vehicle.registration_number,
                "bridge": toll_pass.bridge.name
            }, status=200)

        except TollPass.DoesNotExist:
            return Response({"status": "error", "message": "Invalid Pass Token: Not found in database"}, status=404)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=400)

from datetime import timedelta

class RequestRenewalAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"error": "Token is required"}, status=400)
        
        try:
            toll_pass = TollPass.objects.get(token=token, user=request.user)
            if toll_pass.status != 'expired' and (not (toll_pass.status == 'active' and timezone.now() > toll_pass.expires_at)):
                return Response({"error": "Only expired passes can be renewed."}, status=400)
            
            toll_pass.renewal_status = 'requested'
            toll_pass.save()
            return Response({"message": "Renewal requested successfully"}, status=200)
        except TollPass.DoesNotExist:
            return Response({"error": "Pass not found"}, status=404)

class PendingRenewalsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['employee', 'admin']:
            return Response({"error": "Unauthorized"}, status=403)
        
        passes = TollPass.objects.filter(renewal_status='requested').order_by('-created_at')
        data = [{
            "id": p.id,
            "token": p.token,
            "driver": p.user.username,
            "vehicle": p.vehicle.registration_number,
            "bridge": p.bridge.name,
            "created_at": p.created_at,
            "expires_at": p.expires_at
        } for p in passes]
        return Response(data)

class ApproveRenewalAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['employee', 'admin']:
            return Response({"error": "Unauthorized"}, status=403)

        token = request.data.get('token')
        action = request.data.get('action') # 'approve' or 'reject'
        
        if not token or action not in ['approve', 'reject']:
            return Response({"error": "Valid token and action are required"}, status=400)

        try:
            toll_pass = TollPass.objects.get(token=token, renewal_status='requested')
            
            if action == 'approve':
                toll_pass.valid_from = timezone.now()
                toll_pass.expires_at = timezone.now() + timedelta(hours=6)
                toll_pass.status = 'active'
                toll_pass.renewal_status = 'approved'
            else:
                toll_pass.renewal_status = 'rejected'
                
            toll_pass.save()
            return Response({"message": f"Renewal {action}d successfully"}, status=200)
        except TollPass.DoesNotExist:
            return Response({"error": "Renewal request not found"}, status=404)
