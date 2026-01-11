// Shared API - Canvas Service
// FSD: shared/api

import { httpClient } from './http';

// ============================================================================
// Canvas Types
// ============================================================================

/**
 * Transform state for canvas pan/zoom
 */
export interface TransformState {
    scale: number;
    offset: { x: number; y: number };
}

/**
 * Full canvas data including all drawing content
 */
export interface CanvasData {
    id: string;
    name: string;
    strokes: unknown[];
    texts: unknown[];
    transform: TransformState;
    createdAt: number;
    updatedAt: number;
    thumbnail?: string;
}

/**
 * Lightweight canvas item for list display
 */
export interface CanvasListItem {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    thumbnail?: string;
}

/**
 * Initial data for loading a canvas
 */
export interface CanvasInitialData {
    strokes: unknown[];
    texts: unknown[];
    transform?: TransformState;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateCanvasDto {
    name: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: TransformState;
}

export interface UpdateCanvasDto {
    name?: string;
    strokes?: unknown[];
    texts?: unknown[];
    transform?: TransformState;
    thumbnail?: string;
}

// ============================================================================
// Canvas API
// ============================================================================

export const canvasApi = {
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

// ============================================================================
// Canvas Utilities
// ============================================================================

/**
 * Generate thumbnail from canvas element
 */
export const generateThumbnail = (
    canvasElement: HTMLCanvasElement,
    maxWidth = 200,
    maxHeight = 150
): string => {
    if (canvasElement.width === 0 || canvasElement.height === 0) {
        return '';
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const ratio = Math.min(maxWidth / canvasElement.width, maxHeight / canvasElement.height);
    canvas.width = canvasElement.width * ratio;
    canvas.height = canvasElement.height * ratio;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvasElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.6);
};

/**
 * Create a new empty canvas with default data
 */
export const createEmptyCanvasData = (name?: string): Omit<CanvasData, 'id'> & { id?: string } => {
    const now = Date.now();
    const defaultTransform: TransformState = { scale: 1, offset: { x: 0, y: 0 } };
    return {
        name: name || `Холст ${new Date().toLocaleDateString('ru-RU')}`,
        strokes: [],
        texts: [],
        transform: defaultTransform,
        createdAt: now,
        updatedAt: now,
    };
};
