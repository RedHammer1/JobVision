import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {  login, register } from '../api/auth';
import type {User  } from '../types/user';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, tag: string, role?: 'student' | 'teacher') => Promise<void>;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
            try {
                const userData = JSON.parse(userStr);
                setUser(userData);
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = async (email: string, password: string) => {
        const data = await login({ email, password });
        setUser(data);
        localStorage.setItem('token', 'dummy-token');
        localStorage.setItem('user', JSON.stringify(data));
    };

    const handleRegister = async (
        name: string, 
        email: string, 
        password: string, 
        tag: string,
        role?: 'student' | 'teacher'
    ) => {
        const userRole: 'student' | 'teacher' = role || 'student';
        const data = await register({ name, email, password, tag, role: userRole });
        setUser(data);
        localStorage.setItem('token', 'dummy-token');
        localStorage.setItem('user', JSON.stringify(data));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const updateUser = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login: handleLogin,
            register: handleRegister,
            logout,
            updateUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};