from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role')

    def get_role(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.role
        return 'driver'

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
