import { useUser } from '../contexts/UserContext';
import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <p>Loading session...</p>;
  }

  if (!user.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
