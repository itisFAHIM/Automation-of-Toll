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

class District(models.Model):
    name = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Route(models.Model):
    origin = models.ForeignKey(District, on_delete=models.CASCADE, related_name='routes_from')
    destination = models.ForeignKey(District, on_delete=models.CASCADE, related_name='routes_to')

    class Meta:
        unique_together = ('origin', 'destination')

    def __str__(self):
        return f"{self.origin.name} to {self.destination.name}"

class RouteOption(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='options')
    name = models.CharField(max_length=255)
    estimated_time = models.CharField(max_length=50)
    icon = models.CharField(max_length=50, default='flash')
    color = models.CharField(max_length=20, default='#8b5cf6')
    bridges = models.ManyToManyField(Bridge, related_name='route_options', blank=True)

    def __str__(self):
        return f"{self.route} - {self.name}"