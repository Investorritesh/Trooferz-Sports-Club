from django.db import models
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, UserRole, Notification
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, NotificationSerializer
from .permissions import IsAdmin, IsStaff, IsMember


def get_tokens_for_user(user):
    """Generate both refresh and access tokens with custom claims for user role."""
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['email'] = user.email
    refresh['full_name'] = user.full_name
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'token': str(refresh.access_token),  # Backwards compatibility with existing React frontend
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({**tokens, 'user': user_data}, status=status.HTTP_201_CREATED)
        return Response({'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class MemberLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({**tokens, 'user': user_data}, status=status.HTTP_200_OK)
        first_error = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Member login failed.'
        return Response({'message': str(first_error)}, status=status.HTTP_401_UNAUTHORIZED)


class StaffLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            if user.role not in [UserRole.STAFF, UserRole.ADMIN] and not user.is_superuser:
                return Response(
                    {'message': 'Access denied: This login method is exclusively for verified Club Staff and Operations team. Regular members should sign in via Member Login.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({**tokens, 'user': user_data}, status=status.HTTP_200_OK)
        first_error = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Staff login failed.'
        return Response({'message': str(first_error)}, status=status.HTTP_401_UNAUTHORIZED)


class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            if user.role != UserRole.ADMIN and not user.is_superuser:
                return Response(
                    {'message': 'Access denied: This login method is strictly restricted to Club Administrators. For staff access, please use the Staff Portal.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({**tokens, 'user': user_data}, status=status.HTTP_200_OK)
        first_error = next(iter(serializer.errors.values()))[0] if serializer.errors else 'Administrator login failed.'
        return Response({'message': str(first_error)}, status=status.HTTP_401_UNAUTHORIZED)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_data = UserSerializer(request.user).data
        return Response({'user': user_data})

    def put(self, request):
        user = request.user
        full_name = request.data.get('full_name') or request.data.get('fullName')
        phone = request.data.get('mobile') or request.data.get('phone')

        if full_name:
            user.full_name = full_name.strip()
        if phone:
            user.phone = phone.strip()
        user.save()

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['put', 'patch', 'post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'message': 'Notification marked as read.'})


class UserAdminViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsStaff]
    queryset = User.objects.all().order_by('-date_joined')

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', '').strip()
        user_status = self.request.query_params.get('status', '').strip()

        if search:
            qs = qs.filter(
                models.Q(full_name__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(phone__icontains=search)
            )
        if user_status == 'active':
            qs = qs.filter(is_active=True)
        elif user_status == 'inactive':
            qs = qs.filter(is_active=False)

        return qs
