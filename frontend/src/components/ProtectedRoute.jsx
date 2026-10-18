import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './UI';

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  
  if (loading) return <Spinner label="Verifying session..." />;
  
  if (!user) {
    return <Navigate to={role === 'ADMIN' ? '/admin/login' : '/login'} replace />;
  }
  
  if (role === 'ADMIN') {
    const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'STAFF' || user.is_superuser;
    if (!isStaffOrAdmin) {
      return <Navigate to="/" replace />;
    }
  }
  
  // Any authenticated user (MEMBER, USER, STAFF, ADMIN) can access member routes
  return <Outlet />;
}
