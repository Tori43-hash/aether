// Shared API - Trades Service
// FSD: shared/api

import { httpClient } from './httpClient';
import type { Trade } from '../../entities/trade';

// Query params type
export interface TradeQueryParams {
    ticker?: string;
    direction?: 'Long' | 'Short';
    startDate?: string;
    endDate?: string;
}

// Create/Update DTO
export interface CreateTradeDto {
    date: string;
    entryDate: string;
    exitDate?: string;
    ticker: string;
    direction: 'Long' | 'Short';
    style?: 'Scalping' | 'Intraday' | 'Intraweek' | 'Swing';
    risk?: number;
    pnl: number;
    tda?: Array<{
        label: string;
        condition: 'met' | 'not-met' | 'partial';
        note?: string;
    }>;
}

export type UpdateTradeDto = Partial<CreateTradeDto>;

// Paginated response type
interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// Trades API
export const tradesApi = {
    getAll: async (query?: TradeQueryParams): Promise<Trade[]> => {
        const params = new URLSearchParams();
        if (query) {
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.append(key, String(value));
                }
            });
        }
        const queryString = params.toString();
        const endpoint = queryString ? `/trades?${queryString}` : '/trades';
        const response = await httpClient.get<PaginatedResponse<Trade>>(endpoint);
        return response.data;
    },

    getOne: async (id: number): Promise<Trade> => {
        return httpClient.get<Trade>(`/trades/${id}`);
    },

    create: async (dto: CreateTradeDto): Promise<Trade> => {
        return httpClient.post<Trade>('/trades', dto);
    },

    update: async (id: number, dto: UpdateTradeDto): Promise<Trade> => {
        return httpClient.patch<Trade>(`/trades/${id}`, dto);
    },

    delete: async (id: number): Promise<void> => {
        return httpClient.delete(`/trades/${id}`);
    },

    bulkCreate: async (dtos: CreateTradeDto[]): Promise<Trade[]> => {
        return httpClient.post<Trade[]>('/trades/bulk', dtos);
    },
};
