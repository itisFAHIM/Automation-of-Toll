from django.db import models
from django.contrib.auth.models import User
from vehicles.models import Vehicle
from bridges.models import Bridge
import uuid

class TollPass(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('used', 'Used'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='toll_passes')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='toll_passes')
    bridge = models.ForeignKey(Bridge, on_delete=models.CASCADE, related_name='toll_passes')

    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)

    RENEWAL_CHOICES = [
        ('none', 'None'),
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    renewal_status = models.CharField(max_length=20, choices=RENEWAL_CHOICES, default='none')
    valid_from = models.DateTimeField()
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vehicle.registration_number} - {self.bridge.name}"