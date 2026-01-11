import { useRef, useCallback } from 'react';
import { SelectionBounds } from 'entities/whiteboard';

export const useWhiteboardSelection = () => {
    const selectedStrokesRef = useRef<Set<number>>(new Set());
    const selectedTextsRef = useRef<Set<string>>(new Set());
    const selectionBoundsRef = useRef<SelectionBounds | null>(null);

    const clearSelection = useCallback(() => {
        selectedStrokesRef.current.clear();
        selectedTextsRef.current.clear();
        selectionBoundsRef.current = null;
    }, []);

    return {
        selectedStrokesRef,
        selectedTextsRef,
        selectionBoundsRef,
        clearSelection
    };
};
