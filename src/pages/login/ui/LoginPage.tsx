// Page: Login
// FSD: pages/login

import React from 'react';
import { Sparkles } from 'lucide-react';
import { LoginForm } from '../../../features/login-form';

export const LoginPage: React.FC = () => {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-violet-100/20 to-indigo-100/20 rounded-full blur-3xl" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/50 p-8 md:p-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-violet-500/30">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">
                            Welcome to Aethelir
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Sign in to your trading journal
                        </p>
                    </div>

                    {/* Form */}
                    <LoginForm />

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400">
                            Track your trades • Analyze performance • Grow as a trader
                        </p>
                    </div>
                </div>

                {/* Bottom decoration */}
                <div className="absolute -z-10 inset-0 bg-gradient-to-r from-violet-600/10 to-indigo-600/10 rounded-3xl blur-xl transform translate-y-4" />
            </div>
        </div>
    );
};

LoginPage.displayName = 'LoginPage';
