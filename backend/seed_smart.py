import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bridges.models import Bridge, TollRate
from vehicles.models import VehicleType

# Ensure vehicle types exist
if not VehicleType.objects.exists():
    for v in ['Motor Cycle', 'Car', 'Micro Bus', 'Minibus', 'Bus', 'Truck']:
        VehicleType.objects.create(name=v)

v_types = VehicleType.objects.all()

b1, _ = Bridge.objects.get_or_create(name='Lalon Shah Bridge', defaults={'is_active': True, 'status': 'active', 'location': 'Rajshahi'})
b2, _ = Bridge.objects.get_or_create(name='Padma Bridge', defaults={'is_active': True, 'status': 'active', 'location': 'Munshiganj'})
b3, _ = Bridge.objects.get_or_create(name='Karnaphuli Tunnel', defaults={'is_active': True, 'status': 'active', 'location': 'Chattogram'})

b1.is_active = True
b2.is_active = True
b3.is_active = True
b1.status = 'active'
b2.status = 'active'
b3.status = 'active'
b1.save()
b2.save()
b3.save()

def create_rates(bridge, car_rate, bus_rate, truck_rate, default_rate):
    for vt in v_types:
        name = vt.name.lower()
        if 'car' in name or 'micro' in name:
            amt = car_rate
        elif 'bus' in name:
            amt = bus_rate
        elif 'truck' in name or 'trailer' in name:
            amt = truck_rate
        else:
            amt = default_rate
        TollRate.objects.update_or_create(bridge=bridge, vehicle_type=vt, defaults={'amount': amt, 'disabled_at': None})

create_rates(b1, 150, 250, 450, 50)
create_rates(b2, 750, 2400, 5500, 100)
create_rates(b3, 250, 500, 1000, 50)

print("Smart bridges seeded!")
