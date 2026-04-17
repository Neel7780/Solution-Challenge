import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useSocketStore } from './store/socketStore';
import { useAuthStore } from './store/authStore';

// Common
import Login from './pages/Login';
import Landing from './pages/Landing';
import AuthGuard from './components/AuthGuard';

// Admin Pages
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import Users from './pages/Users';
import Locations from './pages/Locations';
import Triage from './pages/Triage';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';

// Guest Pages
import GuestLayout from './components/GuestLayout';
import GuestDashboard from './pages/guest/GuestDashboard';
import GuestEmergency from './pages/guest/GuestEmergency';
import GuestNotifications from './pages/guest/GuestNotifications';
import GuestCheckIn from './pages/guest/GuestCheckIn';

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
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Public Routes */}
      <Route element={<AuthGuard requireAuth={false} />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Admin/Staff Routes */}
      <Route element={<AuthGuard allowedRoles={['admin', 'staff', 'security', 'responder']} />}>
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="triage" element={<Triage />} />
          <Route path="locations" element={<Locations />} />
          <Route path="users" element={<Users />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        {/* Redirect old paths to dashboard */}
        <Route path="/incidents" element={<Navigate to="/dashboard/incidents" replace />} />
        <Route path="/triage" element={<Navigate to="/dashboard/triage" replace />} />
        <Route path="/locations" element={<Navigate to="/dashboard/locations" replace />} />
        <Route path="/users" element={<Navigate to="/dashboard/users" replace />} />
        <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
      </Route>

      {/* Guest Routes */}
      <Route element={<AuthGuard allowedRoles={['guest']} />}>
        <Route path="/guest" element={<GuestLayout />}>
          <Route index element={<GuestDashboard />} />
          <Route path="emergency" element={<GuestEmergency />} />
          <Route path="notifications" element={<GuestNotifications />} />
          <Route path="check-in" element={<GuestCheckIn />} />
        </Route>
      </Route>

      {/* Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
