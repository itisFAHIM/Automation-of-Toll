from django.contrib import admin
from .models import Bridge, TollRate, District, Route, RouteOption

@admin.register(Bridge)
class BridgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'is_active', 'status']
    list_filter = ['is_active', 'status']
    search_fields = ['name', 'location']

@admin.register(TollRate)
class TollRateAdmin(admin.ModelAdmin):
    list_display = ['bridge', 'vehicle_type', 'amount', 'disabled_at']
    list_filter = ['bridge', 'vehicle_type']

@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']

class RouteOptionInline(admin.TabularInline):
    model = RouteOption
    extra = 1
    filter_horizontal = ['bridges']

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ['origin', 'destination']
    list_filter = ['origin', 'destination']
    search_fields = ['origin__name', 'destination__name']
    inlines = [RouteOptionInline]

@admin.register(RouteOption)
class RouteOptionAdmin(admin.ModelAdmin):
    list_display = ['name', 'route', 'estimated_time', 'color']
    filter_horizontal = ['bridges']