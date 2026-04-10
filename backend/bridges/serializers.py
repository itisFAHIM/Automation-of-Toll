from rest_framework import serializers
from .models import Bridge

class BridgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bridge
        fields = '__all__'