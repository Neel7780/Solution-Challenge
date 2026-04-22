import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '../store/authStore';

interface AuthGuardProps {
  allowedRoles?: string[];
  requireAuth?: boolean;
}

const getDashboardHomeByRole = (role?: string) => {
  if (role === 'responder') return '/dashboard/responder';
  if (role === 'security') return '/dashboard/security';
  if (role === 'staff') return '/dashboard/staff';
  return '/dashboard/command';
};

export default function AuthGuard({ allowedRoles, requireAuth = true }: AuthGuardProps) {
  const { isAuthenticated, isAuthChecking, user } = useAuthStore();
  const location = useLocation();

  if (isAuthChecking) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress color="primary" size={30} />
      </Box>
    );
  }

  if (requireAuth && (!isAuthenticated || !user)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthenticated && !requireAuth) {
    // If user is already logged in, redirect them to their respective dashboard
    if (user?.role === 'guest') {
      return <Navigate to="/guest" replace />;
    }
    return <Navigate to={getDashboardHomeByRole(user?.role)} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to home if they don't have the right role
    if (user.role === 'guest') {
      return <Navigate to="/guest" replace />;
    }
    return <Navigate to={getDashboardHomeByRole(user?.role)} replace />;
  }

  return <Outlet />;
}
