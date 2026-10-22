from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, UserRole, Notification


class UserSerializer(serializers.ModelSerializer):
    mobile = serializers.CharField(source='phone', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone', 'mobile',
            'role', 'wallet_balance', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'role', 'wallet_balance', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(write_only=True, required=False)
    mobile = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, min_length=8)
    confirmPassword = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['fullName', 'email', 'mobile', 'phone', 'password', 'confirmPassword']

    def validate(self, attrs):
        if 'confirmPassword' in attrs and attrs.get('password') != attrs.get('confirmPassword'):
            raise serializers.ValidationError({"confirmPassword": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop('fullName', '') or validated_data.get('full_name', '')
        phone = validated_data.pop('mobile', '') or validated_data.get('phone', '')
        validated_data.pop('confirmPassword', None)
        email = validated_data['email'].lower().strip()
        password = validated_data.pop('password')

        # Use email prefix or unique slug for username
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            phone=phone,
            role=UserRole.MEMBER,
            is_active=True
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password', '')

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password.")

        if not user.is_active:
            raise serializers.ValidationError("This account is inactive. Please contact club administration.")

        attrs['user'] = user
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 'created_at']
        read_only_fields = ['id', 'title', 'message', 'notification_type', 'created_at']
