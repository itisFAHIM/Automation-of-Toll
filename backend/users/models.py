from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('driver', 'Driver'),
        ('employee_pending', 'Pending Employee'),
        ('employee', 'Employee'),
        ('admin', 'Admin')
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='driver')
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"

class OTPRecord(models.Model):
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} - {self.otp}"
