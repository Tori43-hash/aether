// Shared API - Auth Service
// FSD: shared/api

import { httpClient, tokenStorage } from './http';

// Types
export interface User {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    email: string;
    password: string;
    name?: string;
}

// Auth API
export const authApi = {
    login: async (dto: LoginDto): Promise<Tokens> => {
        const tokens = await httpClient.post<Tokens>('/auth/login', dto, { skipAuth: true });
        tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
        return tokens;
    },

    register: async (dto: RegisterDto): Promise<Tokens> => {
        const tokens = await httpClient.post<Tokens>('/auth/register', dto, { skipAuth: true });
        tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
        return tokens;
    },

    refresh: async (): Promise<Tokens> => {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token');
        }
        const tokens = await httpClient.post<Tokens>(
            '/auth/refresh',
            { refreshToken },
            { skipAuth: true }
        );
        tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
        return tokens;
    },

    logout: async (): Promise<void> => {
        try {
            await httpClient.post('/auth/logout');
        } finally {
            tokenStorage.clearTokens();
        }
    },

    getMe: async (): Promise<User> => {
        return httpClient.get<User>('/auth/me');
    },
};
