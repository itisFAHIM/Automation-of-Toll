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
