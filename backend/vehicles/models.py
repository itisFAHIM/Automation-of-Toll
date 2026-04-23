from django.db import models
from django.contrib.auth.models import User

class VehicleType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=50, default='car-sport')

    def __str__(self):
        return self.name

class Vehicle(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')
    owner_name = models.CharField(max_length=255)
    registration_number = models.CharField(max_length=100, unique=True)
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.PROTECT, related_name='vehicles')
    
    # New image fields
    vehicle_image = models.ImageField(upload_to='vehicle_images/', blank=True, null=True)
    number_plate_image = models.ImageField(upload_to='number_plates/', blank=True, null=True)
    document_image = models.ImageField(upload_to='vehicle_documents/', blank=True, null=True)
    
    # Approval system
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    eligible_for_approval_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.registration_number} ({self.status})"