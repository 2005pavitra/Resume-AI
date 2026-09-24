import AuthLayout from '../components/AuthLayout';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await register(form.username, form.email, form.password);
            navigate('/login');
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Create account"
            subtitle="Build your profile in a minute"
            linkText="Already have an account?"
            linkTo="/login"
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                    <span>Username</span>
                    <input type="text" placeholder="john" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
                </label>

                <label>
                    <span>Email</span>
                    <input type="email" placeholder="john@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                </label>

                <label>
                    <span>Password</span>
                    <input type="password" placeholder="••••••••" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
                </label>

                {error && <p role="alert">{error}</p>}
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Register'}</button>
            </form>
        </AuthLayout>
    );
}
