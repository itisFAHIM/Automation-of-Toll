from django.db import models


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
    VEHICLE_TYPES = [
        ('car', 'Car'),
        ('bus', 'Bus'),
        ('truck', 'Truck'),
        ('bike', 'Bike'),
    ]

    bridge = models.ForeignKey(Bridge, on_delete=models.CASCADE, related_name='toll_rates')
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('bridge', 'vehicle_type')

    def __str__(self):
        return f"{self.bridge.name} - {self.vehicle_type} - {self.amount}"