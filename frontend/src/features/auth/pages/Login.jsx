import AuthLayout from '../components/AuthLayout';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(form.email, form.password);
            navigate(location.state?.from || '/dashboard', { replace: true });
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to continue"
            linkText="Need an account?"
            linkTo="/register"
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                    <span>Email</span>
                    <input type="email" placeholder="john@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                </label>

                <label>
                    <span>Password</span>
                    <input type="password" placeholder="••••••••" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
                </label>

                {error && <p role="alert">{error}</p>}
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Login'}</button>
            </form>
        </AuthLayout>
    );
}
