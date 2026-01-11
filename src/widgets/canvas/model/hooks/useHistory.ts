// Whiteboard History Hook

import { useRef, useState, useCallback } from 'react';
import { Stroke, TextElement, HistoryState, HISTORY_LIMIT } from 'entities/canvas';
import { deepCopyStrokes, deepCopyTexts } from '../../lib/utils/selection';

interface UseWhiteboardHistoryProps {
    strokesRef: React.MutableRefObject<Stroke[]>;
    textsRef: React.MutableRefObject<TextElement[]>;
    onStateRestored?: () => void;
}

interface UseWhiteboardHistoryReturn {
    undoCount: number;
    redoCount: number;
    saveToHistory: () => void;
    handleUndo: () => HistoryState | null;
    handleRedo: () => HistoryState | null;
    historyRef: React.MutableRefObject<HistoryState[]>;
    redoHistoryRef: React.MutableRefObject<HistoryState[]>;
}

export const useHistory = ({
    strokesRef,
    textsRef,
    onStateRestored
}: UseWhiteboardHistoryProps): UseWhiteboardHistoryReturn => {
    const historyRef = useRef<HistoryState[]>([]);
    const redoHistoryRef = useRef<HistoryState[]>([]);

    const [undoCount, setUndoCount] = useState(0);
    const [redoCount, setRedoCount] = useState(0);

    const saveToHistory = useCallback(() => {
        // Save current state to history before making changes (deep copy)
        const deepCopiedStrokes = deepCopyStrokes(strokesRef.current);
        const deepCopiedTexts = deepCopyTexts(textsRef.current);
        historyRef.current.push({ strokes: deepCopiedStrokes, texts: deepCopiedTexts });

        // Keep history size reasonable
        if (historyRef.current.length > HISTORY_LIMIT) {
            historyRef.current.shift();
        }
        setUndoCount(historyRef.current.length);

        // Clear redo history when making a new change
        redoHistoryRef.current = [];
        setRedoCount(0);
    }, [strokesRef, textsRef]);

    const handleUndo = useCallback((): HistoryState | null => {
        if (historyRef.current.length === 0) return null;

        // Save current state to redo history before undoing
        const currentStateStrokes = deepCopyStrokes(strokesRef.current);
        const currentStateTexts = deepCopyTexts(textsRef.current);
        redoHistoryRef.current.push({ strokes: currentStateStrokes, texts: currentStateTexts });

        if (redoHistoryRef.current.length > HISTORY_LIMIT) {
            redoHistoryRef.current.shift();
        }
        setRedoCount(redoHistoryRef.current.length);

        // Restore previous state from history
        const previousState = historyRef.current.pop();
        if (previousState) {
            strokesRef.current = previousState.strokes;
            textsRef.current = previousState.texts;
            setUndoCount(historyRef.current.length);
            onStateRestored?.();
            return previousState;
        }
        return null;
    }, [strokesRef, textsRef, onStateRestored]);

    const handleRedo = useCallback((): HistoryState | null => {
        if (redoHistoryRef.current.length === 0) return null;

        // Save current state to undo history before redoing
        const currentStateStrokes = deepCopyStrokes(strokesRef.current);
        const currentStateTexts = deepCopyTexts(textsRef.current);
        historyRef.current.push({ strokes: currentStateStrokes, texts: currentStateTexts });

        if (historyRef.current.length > HISTORY_LIMIT) {
            historyRef.current.shift();
        }
        setUndoCount(historyRef.current.length);

        // Restore next state from redo history
        const nextState = redoHistoryRef.current.pop();
        if (nextState) {
            strokesRef.current = nextState.strokes;
            textsRef.current = nextState.texts;
            setRedoCount(redoHistoryRef.current.length);
            onStateRestored?.();
            return nextState;
        }
        return null;
    }, [strokesRef, textsRef, onStateRestored]);

    return {
        undoCount,
        redoCount,
        saveToHistory,
        handleUndo,
        handleRedo,
        historyRef,
        redoHistoryRef
    };
};
