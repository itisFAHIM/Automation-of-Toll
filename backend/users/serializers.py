from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile_picture')

    def get_role(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.role
        return 'driver'

    def get_profile_picture(self, obj):
        if hasattr(obj, 'profile') and obj.profile.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.profile_picture.url)
            return obj.profile.profile_picture.url
        return None

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()
        
        request = self.context.get('request')
        if request and request.FILES.get('profile_picture'):
            if hasattr(instance, 'profile'):
                instance.profile.profile_picture = request.FILES['profile_picture']
                instance.profile.save()
                # Refresh from DB so the returned URL is up-to-date
                instance.profile.refresh_from_db()
                
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    requested_role = serializers.CharField(write_only=True, required=False, default='driver')

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'requested_role')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        requested_role = validated_data.pop('requested_role', 'driver')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )

        actual_role = 'employee_pending' if requested_role == 'employee' else 'driver'
        UserProfile.objects.create(user=user, role=actual_role)

        return user
