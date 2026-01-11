// Features/LoginForm - Login Form Component
// FSD: features/login-form/ui

import React, { useState, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../auth';

interface LoginFormProps {
    onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
    const { login, isLoading, error } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!email.trim()) {
            setLocalError('Please enter your email');
            return;
        }
        if (!password) {
            setLocalError('Please enter your password');
            return;
        }

        const success = await login({ email: email.trim(), password });
        if (success && onSuccess) {
            onSuccess();
        }
    }, [email, password, login, onSuccess]);

    const displayError = localError || error;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                </label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                        disabled={isLoading}
                        autoComplete="email"
                    />
                </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                        disabled={isLoading}
                        autoComplete="current-password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {displayError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in">
                    {displayError}
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing in...</span>
                    </>
                ) : (
                    <>
                        <span>Sign In</span>
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>
    );
};

LoginForm.displayName = 'LoginForm';
