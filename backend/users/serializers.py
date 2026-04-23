from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    nid_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'profile_picture', 'phone_number', 'nid_image')

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

    def get_phone_number(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.phone_number
        return None

    def get_nid_image(self, obj):
        if hasattr(obj, 'profile') and obj.profile.nid_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.nid_image.url)
            return obj.profile.nid_image.url
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
    otp = serializers.CharField(write_only=True, required=True, max_length=6)
    phone_number = serializers.CharField(write_only=True, required=True, max_length=20)
    nid_image = serializers.ImageField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'requested_role', 'otp', 'phone_number', 'nid_image')
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data):
        from django.utils import timezone
        from datetime import timedelta
        from .models import OTPRecord
        
        email = data.get('email')
        otp = data.get('otp')
        
        try:
            record = OTPRecord.objects.get(email=email)
            if record.otp != otp:
                raise serializers.ValidationError({"otp": "Invalid OTP."})
            
            # Check expiration (10 minutes)
            if timezone.now() > record.created_at + timedelta(minutes=10):
                record.delete()
                raise serializers.ValidationError({"otp": "OTP has expired."})
                
        except OTPRecord.DoesNotExist:
            raise serializers.ValidationError({"otp": "No OTP requested for this email."})
            
        return data

    def create(self, validated_data):
        from .models import OTPRecord
        requested_role = validated_data.pop('requested_role', 'driver')
        email = validated_data.get('email', '')
        phone_number = validated_data.pop('phone_number', '')
        nid_image = validated_data.pop('nid_image', None)
        
        # We can safely delete the OTP record now that it is validated
        validated_data.pop('otp', None)
        OTPRecord.objects.filter(email=email).delete()
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=email,
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )

        actual_role = 'employee_pending' if requested_role == 'employee' else 'driver'
        UserProfile.objects.create(
            user=user,
            role=actual_role,
            phone_number=phone_number,
            nid_image=nid_image,
        )

        return user
