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
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"
