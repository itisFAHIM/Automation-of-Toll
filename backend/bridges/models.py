from django.db import models
from vehicles.models import VehicleType

class Bridge(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('coming_soon', 'Coming Soon'),
        ('unavailable', 'Unavailable'),
    ]

    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unavailable')
    status_message = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class TollRate(models.Model):
    bridge = models.ForeignKey(Bridge, on_delete=models.CASCADE, related_name='toll_rates')
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.CASCADE, related_name='toll_rates')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    disabled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('bridge', 'vehicle_type')

    def __str__(self):
        return f"{self.bridge.name} - {self.vehicle_type.name} - {self.amount}"