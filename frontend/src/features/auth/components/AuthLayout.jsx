import { Link } from 'react-router-dom';
import { SignalLogo } from '../../../components/Icons';

export default function AuthLayout({ title, subtitle, children, linkText, linkTo }) {
    return (
        <div className="auth-canvas">
            <div className="ambient-glow glow-top-left" />
            <div className="ambient-glow glow-top-right" />

            <div className="auth-card-wrap">
                <div className="auth-brand-head">
                    <Link className="brand-logo" to="/login">
                        <span className="brand-icon"><SignalLogo size={18} /></span>
                        career<span className="brand-highlight">signal</span>
                    </Link>
                </div>

                <div className="glass-auth-card">
                    <div className="auth-card-intro">
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                    </div>

                    {children}

                    <div className="auth-footer-link">
                        <span>{linkText}</span>{' '}
                        <Link to={linkTo} className="accent-link">
                            {linkTo === '/login' ? 'Sign in' : 'Create account'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
