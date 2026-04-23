from rest_framework import serializers
from .models import Bridge, TollRate, District, Route, RouteOption
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

class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name', 'is_active']

class RouteOptionSerializer(serializers.ModelSerializer):
    bridges = serializers.SerializerMethodField()

    class Meta:
        model = RouteOption
        fields = ['id', 'name', 'estimated_time', 'icon', 'color', 'bridges']

    def get_bridges(self, obj):
        return [b.name for b in obj.bridges.all()]

class RouteSerializer(serializers.ModelSerializer):
    options = RouteOptionSerializer(many=True, read_only=True)
    origin = DistrictSerializer(read_only=True)
    destination = DistrictSerializer(read_only=True)

    class Meta:
        model = Route
        fields = ['id', 'origin', 'destination', 'options']