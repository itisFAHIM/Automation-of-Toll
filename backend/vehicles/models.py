from django.db import models
from django.contrib.auth.models import User

class Vehicle(models.Model):
    VEHICLE_TYPES = [
        ('car', 'Car'),
        ('bus', 'Bus'),
        ('truck', 'Truck'),
        ('bike', 'Bike'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')
    owner_name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=100, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.registration_number