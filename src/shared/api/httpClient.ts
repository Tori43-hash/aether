// Shared API - HTTP Client
// FSD: shared/api

const API_BASE_URL = 'http://localhost:3100/api';

const TOKEN_KEYS = {
    ACCESS: 'auth_access_token',
    REFRESH: 'auth_refresh_token',
} as const;

// Token management
export const tokenStorage = {
    getAccessToken: (): string | null => localStorage.getItem(TOKEN_KEYS.ACCESS),
    getRefreshToken: (): string | null => localStorage.getItem(TOKEN_KEYS.REFRESH),
    setTokens: (accessToken: string, refreshToken: string): void => {
        localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
        localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
    },
    clearTokens: (): void => {
        localStorage.removeItem(TOKEN_KEYS.ACCESS);
        localStorage.removeItem(TOKEN_KEYS.REFRESH);
    },
    hasToken: (): boolean => !!localStorage.getItem(TOKEN_KEYS.ACCESS),
};

// HTTP Error
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// Request options type
interface RequestOptions {
    headers?: Record<string, string>;
    skipAuth?: boolean;
}

// Base fetch with auth
async function request<T>(
    endpoint: string,
    options: RequestInit & RequestOptions = {}
): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;
    const customHeaders = (options.headers as Record<string, string> | undefined) || {};

    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders,
    };

    // Add auth header if token exists
    if (!skipAuth) {
        const token = tokenStorage.getAccessToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers: requestHeaders,
    });

    // Handle non-OK responses
    if (!response.ok) {
        let errorData: unknown;
        try {
            errorData = await response.json();
        } catch {
            errorData = { message: response.statusText };
        }

        throw new ApiError(
            response.status,
            (errorData as { message?: string })?.message || 'Request failed',
            errorData
        );
    }

    // Handle empty responses
    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

// HTTP client methods
export const httpClient = {
    get: <T>(endpoint: string, options?: RequestOptions) =>
        request<T>(endpoint, { method: 'GET', ...options }),

    post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
        request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        }),

    patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
        request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
            ...options,
        }),

    delete: <T>(endpoint: string, options?: RequestOptions) =>
        request<T>(endpoint, { method: 'DELETE', ...options }),
};
