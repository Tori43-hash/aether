// Shared API - Canvases Service
// FSD: shared/api

import { httpClient } from './httpClient';
import type { CanvasData, CanvasListItem } from '../../entities/canvas-journal';

// DTOs
export interface CreateCanvasDto {
    name: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: {
        scale: number;
        offset: { x: number; y: number };
    };
}

export interface UpdateCanvasDto {
    name?: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: {
        scale: number;
        offset: { x: number; y: number };
    };
    thumbnail?: string;
}

// Canvases API
export const canvasesApi = {
    getAll: async (): Promise<CanvasListItem[]> => {
        return httpClient.get<CanvasListItem[]>('/canvases');
    },

    getOne: async (id: string): Promise<CanvasData> => {
        return httpClient.get<CanvasData>(`/canvases/${id}`);
    },

    create: async (dto: CreateCanvasDto): Promise<CanvasData> => {
        return httpClient.post<CanvasData>('/canvases', dto);
    },

    update: async (id: string, dto: UpdateCanvasDto): Promise<CanvasData> => {
        return httpClient.patch<CanvasData>(`/canvases/${id}`, dto);
    },

    delete: async (id: string): Promise<void> => {
        return httpClient.delete(`/canvases/${id}`);
    },
};
