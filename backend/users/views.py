from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class RequestOTPView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        import random
        from django.core.mail import send_mail
        from .models import OTPRecord
        
        email = request.data.get('email')
        username = request.data.get('username')

        if not email or not username:
            return Response({"error": "Email and username are required."}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email is already registered."}, status=400)
            
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username is already taken."}, status=400)

        otp_code = f"{random.randint(100000, 999999)}"
        
        OTPRecord.objects.update_or_create(
            email=email,
            defaults={'otp': otp_code}
        )

        try:
            send_mail(
                'Your Toll Management Verification Code',
                f'Your verification code is: {otp_code}\nThis code will expire in 10 minutes.',
                None, # Uses DEFAULT_FROM_EMAIL or EMAIL_HOST_USER
                [email],
                fail_silently=False,
            )
            return Response({"message": "OTP sent successfully."})
        except Exception as e:
            return Response({"error": "Failed to send email. Ensure SMTP settings are configured in your environment."}, status=500)

class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def partial_update(self, request, *args, **kwargs):
        user = request.user
        # Update User fields
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.email = request.data.get('email', user.email)
        user.save()

        # Handle profile picture upload
        if 'profile_picture' in request.FILES:
            if not hasattr(user, 'profile'):
                from .models import UserProfile
                UserProfile.objects.create(user=user, role='driver')
            user.profile.profile_picture = request.FILES['profile_picture']
            user.profile.save()
            user.profile.refresh_from_db()

        serializer = self.get_serializer(user)
        return Response(serializer.data)


class PendingEmployeesAPIView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
            return Response({"error": "Admin access required"}, status=403)
        
        pending_users = User.objects.filter(profile__role='employee_pending')
        data = [{"id": u.id, "username": u.username, "email": u.email, "name": f"{u.first_name} {u.last_name}"} for u in pending_users]
        return Response(data)

class ApproveEmployeeAPIView(generics.UpdateAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, user_id):
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'admin':
            return Response({"error": "Admin access required"}, status=403)
        
        try:
            target_user = User.objects.get(id=user_id)
            if hasattr(target_user, 'profile') and target_user.profile.role == 'employee_pending':
                target_user.profile.role = 'employee'
                target_user.profile.save()
                return Response({"message": "Employee Approved successfully!"})
            return Response({"error": "User is not a pending employee"}, status=400)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
