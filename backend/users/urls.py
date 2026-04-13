from django.urls import path
from .views import RegisterView, ProfileView, PendingEmployeesAPIView, ApproveEmployeeAPIView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    path('pending-employees/', PendingEmployeesAPIView.as_view(), name='pending_employees'),
    path('approve-employee/<int:user_id>/', ApproveEmployeeAPIView.as_view(), name='approve_employee'),
]
