import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children, linkText, linkTo }) {
    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </div>

                {children}

                <p className="auth-switch">
                    {linkText}{' '}
                    <Link to={linkTo}>{linkTo === '/login' ? 'Login' : 'Register'}</Link>
                </p>
            </div>
        </div>
    );
}
