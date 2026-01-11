// Whiteboard Constants

import { Shortcuts } from '../model/types';

export const DEFAULT_SHORTCUTS: Shortcuts = {
    undo: { key: 'z', ctrl: true },
    redo: { key: 'y', ctrl: true },
    pen: { key: 'p' },
    eraser: { key: 'e' },
    cursor: { key: 'v' },
    text: { key: 't' },
    clear: { key: 'c', ctrl: true },
    hideUI: { key: 'h', ctrl: true }
};

export const TOOLBAR_COLORS = ['#000000', '#FF0000', '#0000FF'];

// LocalStorage keys
export const LS_KEYS = {
    SHORTCUTS: 'whiteboard-shortcuts',
    SHOW_COORDINATES: 'whiteboard-show-coordinates',
    SHOW_ZOOM: 'whiteboard-show-zoom',
    ZOOM_SPEED: 'whiteboard-zoom-speed',
    DISPLAY_POSITION: 'whiteboard-display-position',
    DISPLAY_SIZE: 'whiteboard-display-size',
    BACKGROUND_TYPE: 'whiteboard-background-type',
    UI_HIDDEN: 'whiteboard-ui-hidden',
} as const;

// TextToolbar constants (shared)
export const FONT_SIZES = [
    { label: 'Small', value: 16 },
    { label: 'Normal', value: 24 },
    { label: 'Large', value: 32 },
    { label: 'Pro', value: 48 },
];

export const FONTS = [
    { label: 'Inter', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Mono', value: 'monospace' },
    { label: 'Cursive', value: 'cursive' },
];

export const TEXT_COLORS = [
    '#000000', // Black
    '#ffffff', // White
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#64748b', // Slate
    '#fca5a5', // Light Red
    '#fdba74', // Light Orange
    '#fde047', // Light Yellow
    '#86efac', // Light Green
    '#99f6e4', // Light Teal
    '#93c5fd', // Light Blue
    '#d8b4fe', // Light Purple
    '#f9a8d4', // Light Pink
];

// Default values
export const DEFAULT_BRUSH_SIZE = 3;
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_ZOOM_SPEED = 0.001;
export const HISTORY_LIMIT = 50;
