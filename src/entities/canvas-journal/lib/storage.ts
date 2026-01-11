// Canvas Journal Storage Utilities - API-based
// Replaces localStorage with backend API calls

import type { CanvasData, CanvasListItem } from '../model/types';
import { canvasesApi, type CreateCanvasDto, type UpdateCanvasDto } from 'shared/api';

/**
 * Generate unique canvas ID (used for temporary local ID before server response)
 */
export const generateCanvasId = (): string => {
    return `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Get list of all saved canvases (metadata only)
 */
export const getCanvasList = async (): Promise<CanvasListItem[]> => {
    try {
        return await canvasesApi.getAll();
    } catch (e) {
        console.error('Failed to fetch canvas list:', e);
        return [];
    }
};

/**
 * Get full canvas data by ID
 */
export const getCanvas = async (id: string): Promise<CanvasData | null> => {
    try {
        return await canvasesApi.getOne(id);
    } catch (e) {
        console.error('Failed to fetch canvas:', e);
        return null;
    }
};

/**
 * Create a new canvas
 */
export const createCanvas = async (dto: CreateCanvasDto): Promise<CanvasData> => {
    return await canvasesApi.create(dto);
};

/**
 * Update canvas data
 */
export const updateCanvas = async (id: string, dto: UpdateCanvasDto): Promise<CanvasData> => {
    return await canvasesApi.update(id, dto);
};

/**
 * Delete canvas
 */
export const deleteCanvas = async (id: string): Promise<void> => {
    await canvasesApi.delete(id);
};

/**
 * Generate thumbnail from canvas element
 */
export const generateThumbnail = (
    canvasElement: HTMLCanvasElement,
    maxWidth = 200,
    maxHeight = 150
): string => {
    // Check for zero-size canvas
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
 * Create a new empty canvas with default data (local helper, for initial creation)
 */
export const createEmptyCanvasData = (name?: string): Omit<CanvasData, 'id'> & { id?: string } => {
    const now = Date.now();
    return {
        name: name || `Холст ${new Date().toLocaleDateString('ru-RU')}`,
        strokes: [],
        texts: [],
        transform: { scale: 1, offset: { x: 0, y: 0 } },
        createdAt: now,
        updatedAt: now,
    };
};
