/**
 * Container component for TextToolbar with positioning logic
 * Extracted from Whiteboard.tsx for better separation of concerns
 */

import React from 'react';
import { TextToolbar } from './textToolbar';
import { useTextOperations } from '../model/hooks/useTextOps';
import { calculateToolbarPosition } from '../lib/utils/position';
import { calculateTextBounds } from '../lib/utils/geometry';
import type {
    TextElement,
    Stroke,
    SelectionBounds,
    TransformState,
} from 'entities/canvas';
import type { QuadTree } from '../lib/utils/QuadTree';

export interface WhiteboardTextToolbarContainerProps {
    editingTextId: string | null;
    textsRef: React.MutableRefObject<TextElement[]>;
    selectedTextsRef: React.MutableRefObject<Set<string>>;
    selectedStrokesRef: React.MutableRefObject<Set<number>>;
    strokesRef: React.MutableRefObject<Stroke[]>;
    quadTreeRef: React.MutableRefObject<QuadTree>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    containerRef: React.RefObject<HTMLDivElement>;
    transformRef: React.MutableRefObject<TransformState>;
    textSelectionStartRef: React.MutableRefObject<number | null>;
    textSelectionEndRef: React.MutableRefObject<number | null>;
    textEditableRef: React.RefObject<HTMLDivElement>;
    editingTextIdRef: React.MutableRefObject<string | null>;
    selectionBoundsRef: React.MutableRefObject<SelectionBounds | null>;
    isInteractionHidden: boolean;
    saveToHistory: () => void;
    scheduleRedraw: () => void;
}

export const WhiteboardTextToolbarContainer: React.FC<
    WhiteboardTextToolbarContainerProps
> = ({
    editingTextId,
    textsRef,
    selectedTextsRef,
    selectedStrokesRef,
    strokesRef,
    quadTreeRef,
    canvasRef,
    containerRef,
    transformRef,
    textSelectionStartRef,
    textSelectionEndRef,
    textEditableRef,
    editingTextIdRef,
    selectionBoundsRef,
    isInteractionHidden,
    saveToHistory,
    scheduleRedraw,
}) => {
        // Connect to useTextOperations hook
        const { handleTextUpdate, handleStyleApply } = useTextOperations({
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
        });

        // Determine if toolbar should be shown
        const shouldShowToolbar =
            (editingTextId ||
                (selectedTextsRef.current.size === 1 &&
                    selectedStrokesRef.current.size === 0)) &&
            !isInteractionHidden;

        if (!shouldShowToolbar) {
            return null;
        }

        // Get target text element
        const targetId =
            editingTextId || Array.from(selectedTextsRef.current)[0];
        const targetText = textsRef.current.find((t) => t.id === targetId);

        if (!targetText) {
            return null;
        }

        // Calculate text bounds
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) {
            return null;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }

        const bounds = calculateTextBounds(ctx, targetText);
        const containerRect = container.getBoundingClientRect();

        // Calculate toolbar position using utility
        const toolbarPosition = calculateToolbarPosition(
            {
                boundsX: bounds.x,
                boundsY: bounds.y,
                boundsWidth: bounds.width,
                boundsHeight: bounds.height,
            },
            transformRef.current,
            containerRect,
            window.innerHeight,
            window.innerWidth
        );

        // Handler wrappers for TextToolbar
        const handleUpdate = (updates: any) => {
            handleTextUpdate(targetId, targetText, updates);
        };

        const handleStyle = (style: 'bold' | 'italic' | 'strikethrough') => {
            handleStyleApply(targetId, targetText, style);
        };

        return (
            <TextToolbar
                text={targetText}
                onChange={handleUpdate}
                position={toolbarPosition}
                onClose={() => { }}
                selectionStart={textSelectionStartRef.current}
                selectionEnd={textSelectionEndRef.current}
                onStyleApply={handleStyle}
            />
        );
    };

WhiteboardTextToolbarContainer.displayName = 'WhiteboardTextToolbarContainer';
