import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
    email: string;
    name: string;
    role?: 'admin' | 'user';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT payload safely
function decodeToken(token: string): User | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    // Initialize user immediately if token exists (Optimistic Auth)
    const [user, setUser] = useState<User | null>(() => {
        if (token) return decodeToken(token);
        return null;
    });

    // If we have a user from token, we are not "loading" visually
    const [isLoading, setIsLoading] = useState(!token);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    // Still verify with backend
                    const res = await fetch('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // Update with fresh data from server (e.g. role changes)
                        setUser(data.user);
                    } else {
                        // Token invalid/expired on server side
                        logout();
                    }
                } catch (error) {
                    console.error('Auth check failed', error);
                    // Don't logout immediately on network error, keep optimistic state?
                    // Or logout if we want to be strict. 
                    // Usually safe to keep the session until explicit failure.
                    // But if 401, initAuth handles it via res.ok check.
                    // Network error: maybe legitimate offline usage?
                    // Let's NOT logout on network error to allow "offline mode" feel, 
                    // but if it's actually 401 it will be caught above.
                }
            } else {
                // No token, so we are definitely done loading
                setUser(null);
            }
            setIsLoading(false);
        };
        initAuth();
    }, [token]);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = async () => {
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error('Failed to notify server of logout', error);
            }
        }
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
