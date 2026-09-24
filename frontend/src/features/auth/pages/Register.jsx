import AuthLayout from '../components/AuthLayout';

export default function Register() {
    return (
        <AuthLayout
            title="Create account"
            subtitle="Build your profile in a minute"
            linkText="Already have an account?"
            linkTo="/login"
        >
            <form className="auth-form">
                <label>
                    <span>Username</span>
                    <input type="text" placeholder="john" />
                </label>

                <label>
                    <span>Email</span>
                    <input type="email" placeholder="john@example.com" />
                </label>

                <label>
                    <span>Password</span>
                    <input type="password" placeholder="••••••••" />
                </label>

                <button type="submit">Register</button>
            </form>
        </AuthLayout>
    );
}
