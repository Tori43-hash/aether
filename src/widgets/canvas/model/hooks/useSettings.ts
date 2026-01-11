// Whiteboard Settings Hook

import { useState, useEffect } from 'react';
import {
    Shortcuts,
    BackgroundType,
    DisplayPosition,
    DisplaySize,
    DEFAULT_SHORTCUTS,
    LS_KEYS,
    DEFAULT_ZOOM_SPEED
} from 'entities/canvas';

interface UseWhiteboardSettingsReturn {
    // Shortcuts
    shortcuts: Shortcuts;
    setShortcuts: React.Dispatch<React.SetStateAction<Shortcuts>>;

    // Display settings
    showCoordinates: boolean;
    setShowCoordinates: React.Dispatch<React.SetStateAction<boolean>>;
    showZoom: boolean;
    setShowZoom: React.Dispatch<React.SetStateAction<boolean>>;
    zoomSpeed: number;
    setZoomSpeed: React.Dispatch<React.SetStateAction<number>>;
    displayPosition: DisplayPosition;
    setDisplayPosition: React.Dispatch<React.SetStateAction<DisplayPosition>>;
    displaySize: DisplaySize;
    setDisplaySize: React.Dispatch<React.SetStateAction<DisplaySize>>;

    // Background
    backgroundType: BackgroundType;
    setBackgroundType: React.Dispatch<React.SetStateAction<BackgroundType>>;

    // UI visibility
    isUIHidden: boolean;
    setIsUIHidden: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useSettings = (): UseWhiteboardSettingsReturn => {
    // Shortcuts
    const [shortcuts, setShortcuts] = useState<Shortcuts>(() => {
        const saved = localStorage.getItem(LS_KEYS.SHORTCUTS);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...DEFAULT_SHORTCUTS, ...parsed };
        }
        return DEFAULT_SHORTCUTS;
    });

    // Display settings
    const [showCoordinates, setShowCoordinates] = useState<boolean>(() => {
        const saved = localStorage.getItem(LS_KEYS.SHOW_COORDINATES);
        return saved ? JSON.parse(saved) : false;
    });

    const [showZoom, setShowZoom] = useState<boolean>(() => {
        const saved = localStorage.getItem(LS_KEYS.SHOW_ZOOM);
        return saved ? JSON.parse(saved) : false;
    });

    const [zoomSpeed, setZoomSpeed] = useState<number>(() => {
        const saved = localStorage.getItem(LS_KEYS.ZOOM_SPEED);
        return saved ? parseFloat(saved) : DEFAULT_ZOOM_SPEED;
    });

    const [displayPosition, setDisplayPosition] = useState<DisplayPosition>(() => {
        const saved = localStorage.getItem(LS_KEYS.DISPLAY_POSITION);
        return (saved as DisplayPosition) || 'bottom-right';
    });

    const [displaySize, setDisplaySize] = useState<DisplaySize>(() => {
        const saved = localStorage.getItem(LS_KEYS.DISPLAY_SIZE);
        return (saved as DisplaySize) || 'medium';
    });

    // Background
    const [backgroundType, setBackgroundType] = useState<BackgroundType>(() => {
        const saved = localStorage.getItem(LS_KEYS.BACKGROUND_TYPE);
        return (saved as BackgroundType) || 'solid';
    });

    // UI visibility
    const [isUIHidden, setIsUIHidden] = useState<boolean>(() => {
        const saved = localStorage.getItem(LS_KEYS.UI_HIDDEN);
        return saved ? JSON.parse(saved) : false;
    });

    // Persist all settings to localStorage
    useEffect(() => {
        localStorage.setItem(LS_KEYS.SHORTCUTS, JSON.stringify(shortcuts));
    }, [shortcuts]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.SHOW_COORDINATES, JSON.stringify(showCoordinates));
    }, [showCoordinates]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.SHOW_ZOOM, JSON.stringify(showZoom));
    }, [showZoom]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.ZOOM_SPEED, zoomSpeed.toString());
    }, [zoomSpeed]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.DISPLAY_POSITION, displayPosition);
    }, [displayPosition]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.DISPLAY_SIZE, displaySize);
    }, [displaySize]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.BACKGROUND_TYPE, backgroundType);
    }, [backgroundType]);

    useEffect(() => {
        localStorage.setItem(LS_KEYS.UI_HIDDEN, JSON.stringify(isUIHidden));
        // Dispatch custom event for same-tab synchronization
        window.dispatchEvent(new CustomEvent('ui-hidden-changed', { detail: { isUIHidden } }));
    }, [isUIHidden]);

    return {
        shortcuts,
        setShortcuts,
        showCoordinates,
        setShowCoordinates,
        showZoom,
        setShowZoom,
        zoomSpeed,
        setZoomSpeed,
        displayPosition,
        setDisplayPosition,
        displaySize,
        setDisplaySize,
        backgroundType,
        setBackgroundType,
        isUIHidden,
        setIsUIHidden,
    };
};
