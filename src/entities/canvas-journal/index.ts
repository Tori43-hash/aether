// Entity: Canvas Journal - Public API

// Types
export type {
    CanvasData,
    CanvasListItem,
    CanvasInitialData,
} from './model/types';

// Storage utilities (now async API-based)
export {
    generateCanvasId,
    getCanvasList,
    getCanvas,
    createCanvas,
    updateCanvas,
    deleteCanvas,
    generateThumbnail,
    createEmptyCanvasData,
} from './lib/storage';
