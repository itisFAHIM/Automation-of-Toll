import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from users.models import UserProfile

# Create Superuser / Admin
user, created = User.objects.get_or_create(username='admin', email='admin@admin.com')
user.set_password('admin123')
user.is_superuser = True
user.is_staff = True
user.save()

# Force the React Native Profile role to 'admin'
profile, p_created = UserProfile.objects.get_or_create(user=user)
profile.role = 'admin'
profile.save()

print("🎉 ADMIN CRATED SUCCESSFULLY! Username: admin | Password: admin123")
