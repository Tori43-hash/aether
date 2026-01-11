// Canvas Journal Page

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasJournal } from 'features/canvas-journal';
import { CanvasJournalList } from 'widgets/canvas-journal-list';
import { WhiteboardCanvas } from 'widgets/whiteboard-canvas';
import type { Stroke, TextElement, TransformState } from 'entities/whiteboard';

export const CanvasJournalPage: React.FC = () => {
    const {
        canvasList,
        activeCanvas,
        activeCanvasId,
        isLoading,
        isSaving,
        createCanvas,
        loadCanvas,
        saveCurrentCanvas,
        closeCanvas,
        deleteCanvas,
        renameCanvas,
    } = useCanvasJournal();

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const stateRef = useRef<{
        strokes: Stroke[];
        texts: TextElement[];
        transform: TransformState;
    } | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Handle state changes from WhiteboardCanvas
    const handleStateChange = useCallback((data: {
        strokes: Stroke[];
        texts: TextElement[];
        transform: TransformState;
    }) => {
        stateRef.current = data;
    }, []);

    // Save current canvas when going back to list
    const handleBackToList = useCallback(async () => {
        if (stateRef.current && activeCanvas) {
            const canvasElement = document.querySelector('canvas') as HTMLCanvasElement | null;
            await saveCurrentCanvas(
                stateRef.current.strokes,
                stateRef.current.texts,
                stateRef.current.transform,
                canvasElement || undefined
            );
        }
        closeCanvas();
    }, [activeCanvas, saveCurrentCanvas, closeCanvas]);

    // Handle create canvas
    const handleCreateCanvas = useCallback(async () => {
        if (isCreating) return;
        setIsCreating(true);
        try {
            await createCanvas();
        } finally {
            setIsCreating(false);
        }
    }, [createCanvas, isCreating]);

    // Handle select canvas
    const handleSelectCanvas = useCallback(async (id: string) => {
        await loadCanvas(id);
    }, [loadCanvas]);

    // Handle delete canvas
    const handleDeleteCanvas = useCallback(async (id: string) => {
        await deleteCanvas(id);
    }, [deleteCanvas]);

    // Handle rename canvas
    const handleRenameCanvas = useCallback(async (id: string, name: string) => {
        await renameCanvas(id, name);
    }, [renameCanvas]);

    // Auto-save on interval when editing
    useEffect(() => {
        if (!activeCanvas) return;

        const interval = setInterval(async () => {
            if (stateRef.current) {
                const canvasElement = document.querySelector('canvas') as HTMLCanvasElement | null;
                await saveCurrentCanvas(
                    stateRef.current.strokes,
                    stateRef.current.texts,
                    stateRef.current.transform,
                    canvasElement || undefined
                );
            }
        }, 30000); // Auto-save every 30 seconds

        return () => clearInterval(interval);
    }, [activeCanvas, saveCurrentCanvas]);

    if (isLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-slate-500 text-sm font-medium">Загрузка...</span>
                </div>
            </div>
        );
    }

    // Editor mode
    if (activeCanvas) {
        return (
            <div className="fixed inset-0 w-full h-full bg-white">
                {/* Back button */}
                <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
                    <button
                        onClick={handleBackToList}
                        className="
              flex items-center gap-2 px-4 py-2
              bg-white/90 backdrop-blur-sm
              border border-slate-200
              rounded-xl shadow-lg
              text-slate-700 font-medium text-sm
              hover:bg-white hover:border-violet-300
              transition-all duration-200
            "
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        К списку
                    </button>

                    <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-600 font-medium">
                        {activeCanvas.name}
                    </span>

                    {isSaving && (
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs font-medium flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                            Сохранение...
                        </span>
                    )}
                </div>

                {/* Canvas */}
                <WhiteboardCanvas
                    className="w-full h-full"
                    initialData={{
                        strokes: activeCanvas.strokes,
                        texts: activeCanvas.texts,
                        transform: activeCanvas.transform,
                    }}
                    onStateChange={handleStateChange}
                />
            </div>
        );
    }

    // List mode
    return (
        <CanvasJournalList
            canvasList={canvasList}
            activeCanvasId={activeCanvasId}
            onCreateCanvas={handleCreateCanvas}
            onSelectCanvas={handleSelectCanvas}
            onDeleteCanvas={handleDeleteCanvas}
            onRenameCanvas={handleRenameCanvas}
        />
    );
};

CanvasJournalPage.displayName = 'CanvasJournalPage';
