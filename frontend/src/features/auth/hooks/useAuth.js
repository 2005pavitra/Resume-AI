import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('resume_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [token, setToken] = useState(() => localStorage.getItem('resume_token') || '');

    useEffect(() => {
        if (user) {
            localStorage.setItem('resume_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('resume_user');
        }
    }, [user]);

    useEffect(() => {
        if (token) {
            localStorage.setItem('resume_token', token);
        } else {
            localStorage.removeItem('resume_token');
        }
    }, [token]);

    const login = async (email, password) => {
        const response = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Login failed');
        }

        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const register = async (username, email, password) => {
        const response = await fetch('http://localhost:4000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    };

    const logout = async () => {
        if (!token) {
            setUser(null);
            setToken('');
            return;
        }

        try {
            await fetch('http://localhost:4000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            setUser(null);
            setToken('');
        }
    };

    const getCurrentUser = async () => {
        if (!token) return null;

        const response = await fetch('http://localhost:4000/api/auth/me', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            setUser(null);
            setToken('');
            return null;
        }

        setUser(data.user);
        return data.user;
    };

    const value = useMemo(
        () => ({
            user,
            token,
            setUser,
            login,
            register,
            logout,
            getCurrentUser,
        }),
        [user, token]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider');
    }

    return context;
}
