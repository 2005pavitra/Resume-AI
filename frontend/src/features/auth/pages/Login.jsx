import AuthLayout from '../components/AuthLayout';

export default function Login() {
    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to continue"
            linkText="Need an account?"
            linkTo="/register"
        >
            <form className="auth-form">
                <label>
                    <span>Email</span>
                    <input type="email" placeholder="john@example.com" />
                </label>

                <label>
                    <span>Password</span>
                    <input type="password" placeholder="••••••••" />
                </label>

                <button type="submit">Login</button>
            </form>
        </AuthLayout>
    );
}
