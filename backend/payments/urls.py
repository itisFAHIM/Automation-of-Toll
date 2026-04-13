from django.urls import path
from .views import ProcessPaymentAPIView

urlpatterns = [
    path('', ProcessPaymentAPIView.as_view(), name='process_payment'),
]
