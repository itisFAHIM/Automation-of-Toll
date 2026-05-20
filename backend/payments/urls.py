from django.urls import path
from .views import ProcessPaymentAPIView, TollAnalyticsAPIView

urlpatterns = [
    path('', ProcessPaymentAPIView.as_view(), name='process_payment'),
    path('analytics/', TollAnalyticsAPIView.as_view(), name='toll_analytics'),
]
