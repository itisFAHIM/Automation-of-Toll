from django.db import models
from django.contrib.auth.models import User

class VehicleType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=50, default='car-sport')

    def __str__(self):
        return self.name

class Vehicle(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')
    owner_name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=100, unique=True)
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.PROTECT, related_name='vehicles')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.registration_number