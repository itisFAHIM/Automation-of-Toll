from rest_framework import serializers
from .models import Bridge, TollRate
from vehicles.models import VehicleType

class BridgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bridge
        fields = '__all__'

class TollRateSerializer(serializers.ModelSerializer):
    vehicle_type = serializers.SlugRelatedField(
        slug_field='name',
        queryset=VehicleType.objects.all()
    )
    class Meta:
        model = TollRate
        fields = '__all__'