import { Navigate, useLocation } from 'react-router-dom';

export default function Protected({ children, user }) {
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return children;
}
