import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from users.models import UserProfile
from vehicles.models import VehicleType

print("Creating admin user...")
user, _ = User.objects.get_or_create(username='admin', email='admin@admin.com')
user.set_password('admin123')
user.is_superuser = True
user.is_staff = True
user.save()

profile, _ = UserProfile.objects.get_or_create(user=user)
profile.role = 'admin'
profile.save()

print("Creating default vehicle types...")
defaults = [('car', 'car-sport'), ('bus', 'bus'), ('truck', 'construct'), ('bike', 'bicycle')]
for name, icon in defaults:
    VehicleType.objects.get_or_create(name=name, defaults={'icon': icon})

print("🎉 Database Initialized Successfully!")
