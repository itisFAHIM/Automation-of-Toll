from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

def home(request):
    return HttpResponse("Toll Management Backend is Running")

urlpatterns = [
    path('', home),

    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/bridges/', include('bridges.urls')),
    path('api/vehicles/', include('vehicles.urls')),
    path('api/users/', include('users.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/passes/', include('tollpasses.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)