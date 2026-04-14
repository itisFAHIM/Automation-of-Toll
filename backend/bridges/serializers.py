from rest_framework import serializers
from .models import Bridge, TollRate

class BridgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bridge
        fields = '__all__'

class TollRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TollRate
        fields = '__all__'