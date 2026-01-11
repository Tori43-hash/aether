// Canvas Journal Feature Hook

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CanvasData, CanvasListItem } from 'shared/api';
import {
    canvasApi,
    generateThumbnail,
    createEmptyCanvasData,
} from 'shared/api';


interface UseCanvasJournalReturn {
    canvasList: CanvasListItem[];
    activeCanvas: CanvasData | null;
    activeCanvasId: string | null;
    isLoading: boolean;
    isSaving: boolean;
    createCanvas: (name?: string) => Promise<CanvasData>;
    loadCanvas: (id: string) => Promise<CanvasData | null>;
    saveCurrentCanvas: (
        strokes: CanvasData['strokes'],
        texts: CanvasData['texts'],
        transform: CanvasData['transform'],
        canvasElement?: HTMLCanvasElement
    ) => Promise<void>;
    closeCanvas: () => void;
    deleteCanvas: (id: string) => Promise<void>;
    renameCanvas: (id: string, name: string) => Promise<void>;
    refreshList: () => Promise<void>;
}

export const useCanvasJournal = (): UseCanvasJournalReturn => {
    const [canvasList, setCanvasList] = useState<CanvasListItem[]>([]);
    const [activeCanvas, setActiveCanvas] = useState<CanvasData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const saveInProgress = useRef(false);

    // Load canvas list on mount
    useEffect(() => {
        const loadList = async () => {
            try {
                const list = await canvasApi.getAll();
                setCanvasList(list);
            } catch (e) {
                console.error('Failed to load canvas list:', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadList();
    }, []);

    const refreshList = useCallback(async () => {
        try {
            const list = await canvasApi.getAll();
            setCanvasList(list);
        } catch (e) {
            console.error('Failed to refresh canvas list:', e);
        }
    }, []);

    const handleCreateCanvas = useCallback(async (name?: string): Promise<CanvasData> => {
        const canvasData = createEmptyCanvasData(name);
        const newCanvas = await canvasApi.create({
            name: canvasData.name,
            strokes: canvasData.strokes,
            texts: canvasData.texts,
            transform: canvasData.transform,
        });
        setActiveCanvas(newCanvas);
        await refreshList();
        return newCanvas;
    }, [refreshList]);

    const loadCanvasHandler = useCallback(async (id: string): Promise<CanvasData | null> => {
        try {
            const canvas = await canvasApi.getOne(id);
            if (canvas) {
                setActiveCanvas(canvas);
            }
            return canvas;
        } catch (e) {
            console.error('Failed to load canvas:', e);
            return null;
        }
    }, []);

    const saveCurrentCanvas = useCallback(async (
        strokes: CanvasData['strokes'],
        texts: CanvasData['texts'],
        transform: CanvasData['transform'],
        canvasElement?: HTMLCanvasElement
    ) => {
        if (!activeCanvas || saveInProgress.current) return;

        // Prevent overwriting existing strokes with empty data (auto-save before WhiteboardCanvas initializes)
        if (strokes?.length === 0 && activeCanvas.strokes?.length > 0) {
            return;
        }

        saveInProgress.current = true;
        setIsSaving(true);

        try {
            const thumbnail = canvasElement ? generateThumbnail(canvasElement) : activeCanvas.thumbnail;
            const updated = await canvasApi.update(activeCanvas.id, {
                strokes,
                texts,
                transform,
                thumbnail,
            });
            setActiveCanvas(updated);
            await refreshList();
        } catch (e) {
            console.error('Failed to save canvas:', e);
        } finally {
            saveInProgress.current = false;
            setIsSaving(false);
        }
    }, [activeCanvas, refreshList]);

    const closeCanvas = useCallback(() => {
        setActiveCanvas(null);
    }, []);

    const handleDeleteCanvas = useCallback(async (id: string) => {
        try {
            await canvasApi.delete(id);
            if (activeCanvas?.id === id) {
                setActiveCanvas(null);
            }
            await refreshList();
        } catch (e) {
            console.error('Failed to delete canvas:', e);
        }
    }, [activeCanvas, refreshList]);

    const renameCanvas = useCallback(async (id: string, name: string) => {
        try {
            const updated = await canvasApi.update(id, { name });
            if (activeCanvas?.id === id) {
                setActiveCanvas(updated);
            }
            await refreshList();
        } catch (e) {
            console.error('Failed to rename canvas:', e);
        }
    }, [activeCanvas, refreshList]);

    return {
        canvasList,
        activeCanvas,
        activeCanvasId: activeCanvas?.id ?? null,
        isLoading,
        isSaving,
        createCanvas: handleCreateCanvas,
        loadCanvas: loadCanvasHandler,
        saveCurrentCanvas,
        closeCanvas,
        deleteCanvas: handleDeleteCanvas,
        renameCanvas,
        refreshList,
    };
};
