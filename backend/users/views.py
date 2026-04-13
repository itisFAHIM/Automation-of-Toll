from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.response import Response
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


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
