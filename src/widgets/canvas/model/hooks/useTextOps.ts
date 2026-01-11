/**
 * Hook for text element operations (update, style apply)
 * Extracted from Whiteboard.tsx for better separation of concerns
 */

import { useCallback } from 'react';
import type {
    TextElement,
    TextElementUpdate,
    Stroke,
    SelectionBounds,
} from 'entities/canvas';
import type { QuadTree } from '../../lib/utils/QuadTree';
import {
    applyStyleToRange,
    getFullText,
} from '../../lib/utils/richText';
import { calculateTextBounds, calculateSelectionBounds } from '../../lib/utils/geometry';



export interface UseTextOperationsProps {
    textsRef: React.MutableRefObject<TextElement[]>;
    strokesRef: React.MutableRefObject<Stroke[]>;
    quadTreeRef: React.MutableRefObject<QuadTree>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    selectedStrokesRef: React.MutableRefObject<Set<number>>;
    selectedTextsRef: React.MutableRefObject<Set<string>>;
    selectionBoundsRef: React.MutableRefObject<SelectionBounds | null>;
    textEditableRef: React.RefObject<HTMLDivElement>;
    textSelectionStartRef: React.MutableRefObject<number | null>;
    textSelectionEndRef: React.MutableRefObject<number | null>;
    editingTextIdRef: React.MutableRefObject<string | null>;
    saveToHistory: () => void;
    scheduleRedraw: () => void;
}

export const useTextOperations = ({
    textsRef,
    strokesRef,
    quadTreeRef,
    canvasRef,
    selectedStrokesRef,
    selectedTextsRef,
    selectionBoundsRef,
    textEditableRef,
    textSelectionStartRef,
    textSelectionEndRef,
    editingTextIdRef,
    saveToHistory,
    scheduleRedraw,
}: UseTextOperationsProps) => {
    /**
     * Handle updating text element properties (color, fontSize, etc.)
     */
    const handleTextUpdate = useCallback(
        (
            targetId: string,
            targetText: TextElement,
            updates: TextElementUpdate
        ) => {
            const updatedTexts = textsRef.current.map((t) =>
                t.id === targetId ? { ...t, ...updates } : t
            );
            textsRef.current = updatedTexts;

            // Update QuadTree and Selection Bounds
            const updatedText = updatedTexts.find((t) => t.id === targetId);
            if (updatedText) {
                // Remove old bounds from QuadTree
                quadTreeRef.current.remove(targetText);

                // Calculate new bounds
                const cvs = canvasRef.current;
                if (cvs) {
                    const ctx = cvs.getContext('2d');
                    if (ctx) {
                        const newBounds = calculateTextBounds(ctx, updatedText);
                        quadTreeRef.current.insert({
                            item: updatedText,
                            bounds: {
                                minX: newBounds.x,
                                minY: newBounds.y,
                                maxX: newBounds.x + newBounds.width,
                                maxY: newBounds.y + newBounds.height,
                            },
                        });
                    }
                }

                // If this text was selected, update selection bounds
                if (selectedTextsRef.current.has(targetId)) {
                    const newSelectionBounds = calculateSelectionBounds(
                        strokesRef.current,
                        selectedStrokesRef.current,
                        updatedTexts,
                        selectedTextsRef.current,
                        canvasRef.current?.getContext('2d') || null
                    );
                    selectionBoundsRef.current = newSelectionBounds;
                }
            }

            // Restore focus to text editor if editing
            if (editingTextIdRef.current === targetId) {
                if (textEditableRef.current) {
                    textEditableRef.current.focus();
                }
            }

            saveToHistory();
            scheduleRedraw();
        },
        [
            textsRef,
            quadTreeRef,
            canvasRef,
            strokesRef,
            selectedStrokesRef,
            selectedTextsRef,
            selectionBoundsRef,
            editingTextIdRef,
            textEditableRef,
            saveToHistory,
            scheduleRedraw,
        ]
    );

    /**
     * Handle applying style (bold, italic, strikethrough) to text
     */
    const handleStyleApply = useCallback(
        (
            targetId: string,
            targetText: TextElement,
            style: 'bold' | 'italic' | 'strikethrough'
        ) => {
            const selStart = textSelectionStartRef.current;
            const selEnd = textSelectionEndRef.current;
            const hasSelection =
                selStart != null && selEnd != null && selStart !== selEnd;

            // Ensure runs exist
            const currentRuns = targetText.runs || [{ text: targetText.text }];

            let newRuns;
            if (hasSelection) {
                // Apply style to range
                newRuns = applyStyleToRange(currentRuns, selStart!, selEnd!, style);
            } else {
                // Apply to entire text - toggle the style for all runs
                const fullTextLength = getFullText(currentRuns).length;
                if (fullTextLength > 0) {
                    newRuns = applyStyleToRange(currentRuns, 0, fullTextLength, style);
                } else {
                    newRuns = currentRuns;
                }
            }

            // Update text element
            const updatedTexts = textsRef.current.map((t) =>
                t.id === targetId
                    ? {
                        ...t,
                        runs: newRuns,
                        text: getFullText(newRuns),
                    }
                    : t
            );
            textsRef.current = updatedTexts;

            // Update QuadTree
            quadTreeRef.current.remove(targetText);
            const cvs = canvasRef.current;
            if (cvs) {
                const ctx = cvs.getContext('2d');
                if (ctx) {
                    const updatedText = updatedTexts.find((t) => t.id === targetId);
                    if (updatedText) {
                        const newBounds = calculateTextBounds(ctx, updatedText);
                        quadTreeRef.current.insert({
                            item: updatedText,
                            bounds: {
                                minX: newBounds.x,
                                minY: newBounds.y,
                                maxX: newBounds.x + newBounds.width,
                                maxY: newBounds.y + newBounds.height,
                            },
                        });
                    }
                }
            }

            saveToHistory();
            scheduleRedraw();

            // Restore focus to text editor
            if (textEditableRef.current) {
                textEditableRef.current.focus();
            }
        },
        [
            textsRef,
            quadTreeRef,
            canvasRef,
            textSelectionStartRef,
            textSelectionEndRef,
            textEditableRef,
            saveToHistory,
            scheduleRedraw,
        ]
    );

    return { handleTextUpdate, handleStyleApply };
};
