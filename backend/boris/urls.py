"""
BORIS URL Configuration
"""
from django.conf.urls import url, include
from django.contrib import admin

urlpatterns = [
    url(r'', include('boris.registration.urls')),
    url(r'^secret-backend/', admin.site.urls),
]
