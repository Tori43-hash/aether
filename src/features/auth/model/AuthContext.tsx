// Features/Auth - Auth Context
// FSD: features/auth/model

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, tokenStorage, User, LoginDto, RegisterDto } from '../../../shared/api';

// Context state type
interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (dto: LoginDto) => Promise<boolean>;
    register: (dto: RegisterDto) => Promise<boolean>;
    logout: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider props
interface AuthProviderProps {
    children: ReactNode;
}

// Provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check auth on mount
    useEffect(() => {
        const initAuth = async () => {
            if (!tokenStorage.hasToken()) {
                setIsLoading(false);
                return;
            }

            try {
                const userData = await authApi.getMe();
                setUser(userData);
            } catch (err) {
                console.error('Failed to get user:', err);
                tokenStorage.clearTokens();
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // Login
    const login = useCallback(async (dto: LoginDto): Promise<boolean> => {
        setError(null);
        setIsLoading(true);

        try {
            await authApi.login(dto);
            const userData = await authApi.getMe();
            setUser(userData);
            // Notify other components that auth state changed
            window.dispatchEvent(new Event('auth-state-changed'));
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Register
    const register = useCallback(async (dto: RegisterDto): Promise<boolean> => {
        setError(null);
        setIsLoading(true);

        try {
            await authApi.register(dto);
            const userData = await authApi.getMe();
            setUser(userData);
            // Notify other components that auth state changed
            window.dispatchEvent(new Event('auth-state-changed'));
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout
    const logout = useCallback(async (): Promise<void> => {
        try {
            await authApi.logout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            // Notify other components that auth state changed
            window.dispatchEvent(new Event('auth-state-changed'));
        }
    }, []);

    const value: AuthContextValue = {
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook
export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
