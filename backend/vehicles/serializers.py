from rest_framework import serializers
from .models import Vehicle, VehicleType

class VehicleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleType
        fields = '__all__'

class VehicleSerializer(serializers.ModelSerializer):
    vehicle_type = serializers.SlugRelatedField(
        slug_field='name',
        queryset=VehicleType.objects.all()
    )

    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['user', 'created_at']