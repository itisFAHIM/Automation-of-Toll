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
    vehicle_image_url = serializers.SerializerMethodField()
    number_plate_image_url = serializers.SerializerMethodField()
    document_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'owner_name', 'registration_number', 'vehicle_type',
            'vehicle_image', 'number_plate_image', 'document_image',
            'vehicle_image_url', 'number_plate_image_url', 'document_image_url',
            'status', 'submitted_at', 'eligible_for_approval_at', 'approved_at',
            'user',
        ]
        read_only_fields = ['user', 'submitted_at', 'status', 'eligible_for_approval_at', 'approved_at']
        extra_kwargs = {
            'vehicle_image': {'write_only': True},
            'number_plate_image': {'write_only': True},
            'document_image': {'write_only': True},
        }

    def get_vehicle_image_url(self, obj):
        if obj.vehicle_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.vehicle_image.url)
            return obj.vehicle_image.url
        return None

    def get_number_plate_image_url(self, obj):
        if obj.number_plate_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.number_plate_image.url)
            return obj.number_plate_image.url
        return None

    def get_document_image_url(self, obj):
        if obj.document_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document_image.url)
            return obj.document_image.url
        return None