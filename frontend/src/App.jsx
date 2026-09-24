import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import Home from './features/home/pages/Home';
import Protected from './features/auth/components/Protected';
import { useAuth } from './features/auth/hooks/useAuth';
import Analyze from './features/analysis/pages/Analyze';
import Report from './features/analysis/pages/Report';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <Protected user={user}>
            <Home />
          </Protected>
        }
      />
      <Route
        path="/analyze"
        element={
          <Protected user={user}>
            <Analyze />
          </Protected>
        }
      />
      <Route
        path="/reports/:id"
        element={
          <Protected user={user}>
            <Report />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
