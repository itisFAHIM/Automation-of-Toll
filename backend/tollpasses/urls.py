from django.urls import path
from .views import VerifyPassAPIView, RequestRenewalAPIView, PendingRenewalsAPIView, ApproveRenewalAPIView, RecentScansAPIView

urlpatterns = [
    path('verify/', VerifyPassAPIView.as_view(), name='verify_pass'),
    path('request-renewal/', RequestRenewalAPIView.as_view(), name='request_renewal'),
    path('pending-renewals/', PendingRenewalsAPIView.as_view(), name='pending_renewals'),
    path('approve-renewal/', ApproveRenewalAPIView.as_view(), name='approve_renewal'),
    path('recent-scans/', RecentScansAPIView.as_view(), name='recent_scans'),
]
