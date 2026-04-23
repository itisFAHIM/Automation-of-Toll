import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bridges.models import District, Route, RouteOption, Bridge

ALL_DISTRICTS = [
    "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogura", "Brahmanbaria",
    "Chandpur", "Chapai Nawabganj", "Chattogram", "Chuadanga", "Cox's Bazar", "Cumilla",
    "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj",
    "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat",
    "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur",
    "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar",
    "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi",
    "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
    "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur",
    "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet",
    "Tangail", "Thakurgaon",
]

# Create all districts
district_objects = {}
for name in ALL_DISTRICTS:
    d, _ = District.objects.get_or_create(name=name, defaults={'is_active': True})
    d.is_active = True
    d.save()
    district_objects[name] = d

print(f"✅ {len(ALL_DISTRICTS)} districts seeded!")

# Get bridges
bridges = {b.name: b for b in Bridge.objects.all()}

def create_route(origin_name, dest_name, options_data):
    origin = district_objects.get(origin_name)
    dest = district_objects.get(dest_name)
    if not origin or not dest:
        print(f"⚠️  Skipping {origin_name} -> {dest_name}: district not found")
        return
    route, _ = Route.objects.get_or_create(origin=origin, destination=dest)
    RouteOption.objects.filter(route=route).delete()
    for opt in options_data:
        ro = RouteOption.objects.create(
            route=route,
            name=opt['name'],
            estimated_time=opt['time'],
            icon=opt.get('icon', 'flash'),
            color=opt.get('color', '#8b5cf6'),
        )
        for bname in opt.get('bridges', []):
            if bname in bridges:
                ro.bridges.add(bridges[bname])
    print(f"  Route: {origin_name} -> {dest_name}")

# Sample routes
create_route('Rajshahi', "Cox's Bazar", [
    {'name': 'Fastest Route', 'time': '10h 15m', 'icon': 'flash', 'color': '#8b5cf6',
     'bridges': ['Lalon Shah Bridge', 'Padma Bridge', 'Karnaphuli Tunnel']},
    {'name': 'Less Cost Option', 'time': '13h 45m', 'icon': 'cash-outline', 'color': '#10b981',
     'bridges': ['Lalon Shah Bridge']},
])

create_route('Dhaka', 'Chattogram', [
    {'name': 'Fastest Route', 'time': '4h 30m', 'icon': 'flash', 'color': '#8b5cf6',
     'bridges': ['Dhaka Elevated Expressway', 'Karnaphuli Tunnel']},
    {'name': 'No Toll Route', 'time': '6h 00m', 'icon': 'leaf-outline', 'color': '#10b981',
     'bridges': []},
])

create_route('Kushtia', 'Munshiganj', [
    {'name': 'Direct Route', 'time': '3h 20m', 'icon': 'car-sport', 'color': '#38bdf8',
     'bridges': ['Lalon Shah Bridge', 'Padma Bridge']},
])

create_route('Dhaka', "Cox's Bazar", [
    {'name': 'Fastest Route', 'time': '8h 00m', 'icon': 'flash', 'color': '#8b5cf6',
     'bridges': ['Karnaphuli Tunnel']},
    {'name': 'No Toll Route', 'time': '9h 30m', 'icon': 'leaf-outline', 'color': '#10b981',
     'bridges': []},
])

create_route('Rajshahi', 'Dhaka', [
    {'name': 'Fastest Route', 'time': '5h 30m', 'icon': 'flash', 'color': '#8b5cf6',
     'bridges': ['Padma Bridge']},
    {'name': 'Less Cost Option', 'time': '7h 00m', 'icon': 'cash-outline', 'color': '#10b981',
     'bridges': []},
])

print("✅ Sample routes seeded!")
