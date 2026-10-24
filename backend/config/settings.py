"""
Django settings for Trooferz Sports Club Backend.
Configured for Python 3.11+ / Django 5 / MySQL 8.
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# Security Settings
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-trooferz-change-in-production-baner')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

raw_hosts = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver,.onrender.com,.vercel.app')
ALLOWED_HOSTS = [host.strip() for host in raw_hosts.split(',') if host.strip()]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')
if '*' not in ALLOWED_HOSTS and DEBUG:
    ALLOWED_HOSTS.append('*')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-Party Packages
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',

    # Local Project Apps
    'users.apps.UsersConfig',
    'facilities.apps.FacilitiesConfig',
    'bookings.apps.BookingsConfig',
    'memberships.apps.MembershipsConfig',
    'payments.apps.PaymentsConfig',
    'analytics.apps.AnalyticsConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

import sys
import socket

# Database Configuration (MySQL 8 with automatic SQLite fallback)
RUNNING_TESTS = 'test' in sys.argv
DB_ENGINE_CONF = os.getenv('DB_ENGINE', 'mysql').lower()

def _check_mysql_active(host, port, timeout=0.5):
    try:
        sock = socket.create_connection((host, int(port)), timeout=timeout)
        sock.close()
        return True
    except OSError:
        return False

MYSQL_HOST = os.getenv('DB_HOST', '127.0.0.1')
MYSQL_PORT = os.getenv('DB_PORT', '3306')

if DB_ENGINE_CONF == 'mysql' and not RUNNING_TESTS and _check_mysql_active(MYSQL_HOST, MYSQL_PORT):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('DB_NAME', 'trooferz_db'),
            'USER': os.getenv('DB_USER', 'trooferz_user'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'TrooferzPass@2026'),
            'HOST': MYSQL_HOST,
            'PORT': MYSQL_PORT,
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES', time_zone='+05:30'",
            },
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'trooferz_fallback.sqlite3',
            'OPTIONS': {
                'timeout': 20,
            }
        }
    }

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.getenv('VENUE_TIMEZONE', 'Asia/Kolkata')
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': None,
}

# SimpleJWT Configuration
JWT_ACCESS_MINUTES = int(os.getenv('JWT_ACCESS_MINUTES', 60))
JWT_REFRESH_DAYS = int(os.getenv('JWT_REFRESH_DAYS', 7))

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=JWT_ACCESS_MINUTES),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=JWT_REFRESH_DAYS),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'id',
    'SIGNING_KEY': os.getenv('JWT_SECRET_KEY', SECRET_KEY),
}

# CORS Configuration
raw_cors = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,https://trooferz-sports-club.onrender.com,https://trooferz-sports-club.vercel.app')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in raw_cors.split(',') if origin.strip()]
CORS_ALLOW_ALL_ORIGINS = DEBUG or os.getenv('CORS_ALLOW_ALL', 'False').lower() in ('true', '1')
CORS_ALLOW_CREDENTIALS = True

# Razorpay Test Configuration
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_placeholder')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'placeholder_secret')

# Configurable Booking Cancellation Policy
CANCELLATION_FULL_REFUND_HOURS = int(os.getenv('CANCELLATION_FULL_REFUND_HOURS', 24))
CANCELLATION_PARTIAL_REFUND_HOURS = int(os.getenv('CANCELLATION_PARTIAL_REFUND_HOURS', 6))
CANCELLATION_PARTIAL_REFUND_PERCENT = float(os.getenv('CANCELLATION_PARTIAL_REFUND_PERCENT', 50.0))

# Venue Geographic Coordinates (Baner, Pune)
VENUE_LATITUDE = float(os.getenv('VENUE_LATITUDE', 18.5590))
VENUE_LONGITUDE = float(os.getenv('VENUE_LONGITUDE', 73.7868))
