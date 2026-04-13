from django.urls import path
from .views import VerifyPassAPIView

urlpatterns = [
    path('verify/', VerifyPassAPIView.as_view(), name='verify_pass'),
]
