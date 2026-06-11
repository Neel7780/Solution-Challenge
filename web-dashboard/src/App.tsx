import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useSocketStore } from './store/socketStore';
import { useAuthStore } from './store/authStore';

// Common
import Login from './pages/Login';
import Landing from './pages/Landing';
import AuthGuard from './components/AuthGuard';
import LiveCrisisOverlay from './components/LiveCrisisOverlay';
import NotificationToast from './components/NotificationToast';

// Admin Pages
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import Users from './pages/Users';
import Locations from './pages/Locations';
import Triage from './pages/Triage';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import PlatformAdmin from './pages/PlatformAdmin';
import OrganizationAdmin from './pages/OrganizationAdmin';
import Simulation from './pages/Simulation';
import ResponderDashboard from './pages/ResponderDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import StaffDashboard from './pages/StaffDashboard';
import Chat from './pages/Chat';

// Guest Pages
import GuestLayout from './components/GuestLayout';
import GuestDashboard from './pages/guest/GuestDashboard';
import GuestEmergency from './pages/guest/GuestEmergency';
import GuestNotifications from './pages/guest/GuestNotifications';
import GuestCheckIn from './pages/guest/GuestCheckIn';
import GuestMap from './pages/guest/GuestMap';
import NotFound from './pages/NotFound';

function getDashboardHomeByRole(role?: string) {
  if (role === 'responder') return '/dashboard/responder';
  if (role === 'security') return '/dashboard/security';
  if (role === 'staff') return '/dashboard/staff';
  if (role === 'org_admin' || role === 'admin') return '/dashboard/organization';
  return '/dashboard/command';
}

function RoleDashboardIndex() {
  const { user } = useAuthStore();
  return <Navigate to={getDashboardHomeByRole(user?.role)} replace />;
}

function App() {
  const { connect, disconnect, connected } = useSocketStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !connected) {
      connect();
    }
    
    return () => {
      if (connected) {
        disconnect();
      }
    };
  }, [isAuthenticated, connected, connect, disconnect]);

  return (
    <>
    <NotificationToast />
    <LiveCrisisOverlay />
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Public Routes */}
      <Route element={<AuthGuard requireAuth={false} />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Admin/Staff Routes */}
      <Route element={<AuthGuard allowedRoles={['admin', 'staff', 'security', 'responder', 'super_admin', 'org_admin']} />}>
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<RoleDashboardIndex />} />
          <Route path="command" element={<Dashboard />} />
          <Route path="responder" element={<ResponderDashboard />} />
          <Route path="security" element={<SecurityDashboard />} />
          <Route path="staff" element={<StaffDashboard />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="triage" element={<Triage />} />
          <Route path="locations" element={<Locations />} />
          <Route path="users" element={<Users />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="platform" element={<PlatformAdmin />} />
          <Route path="organization" element={<OrganizationAdmin />} />
          <Route path="chat" element={<Chat />} />
          <Route path="simulation" element={<Simulation />} />
        </Route>
        {/* Redirect old paths to dashboard */}
        <Route path="/incidents" element={<Navigate to="/dashboard/incidents" replace />} />
        <Route path="/triage" element={<Navigate to="/dashboard/triage" replace />} />
        <Route path="/locations" element={<Navigate to="/dashboard/locations" replace />} />
        <Route path="/users" element={<Navigate to="/dashboard/users" replace />} />
        <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
        <Route path="/command" element={<Navigate to="/dashboard/command" replace />} />
      </Route>

      {/* Guest Routes */}
      <Route element={<AuthGuard allowedRoles={['guest']} />}>
        <Route path="/guest" element={<GuestLayout />}>
          <Route index element={<GuestDashboard />} />
          <Route path="emergency" element={<GuestEmergency />} />
          <Route path="notifications" element={<GuestNotifications />} />
          <Route path="check-in" element={<GuestCheckIn />} />
          <Route path="map" element={<GuestMap />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Route>

      {/* Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}

export default App;
