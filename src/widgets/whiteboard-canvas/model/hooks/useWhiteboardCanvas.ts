/**
 * Hook for whiteboard canvas rendering (redraw, scheduleRedraw)
 * Provides optimized canvas rendering with requestAnimationFrame
 */

import { useCallback, useRef } from 'react';
import type {
    Point,
    Stroke,
    TextElement,
    SelectionBounds,
    TransformState,
    BackgroundType,
} from 'entities/whiteboard';
import {
    drawStroke,
    drawBackground,
    drawTextElement,
    drawPhantomText,
    drawSelectionRect,
    drawSelectionBounds,
} from '../../lib/utils/canvas';

export interface UseWhiteboardCanvasProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    containerRef: React.RefObject<HTMLDivElement>;
    transformRef: React.MutableRefObject<TransformState>;
    strokesRef: React.MutableRefObject<Stroke[]>;
    textsRef: React.MutableRefObject<TextElement[]>;
    currentStrokeRef: React.MutableRefObject<Stroke | null>;
    selectionBoundsRef: React.MutableRefObject<SelectionBounds | null>;
    isSelectingRef: React.MutableRefObject<boolean>;
    selectionStartRef: React.MutableRefObject<Point | null>;
    selectionEndRef: React.MutableRefObject<Point | null>;
    editingTextIdRef: React.MutableRefObject<string | null>;
    cursorPositionRef: React.MutableRefObject<number>;
    isCursorVisibleRef: React.MutableRefObject<boolean>;
    textSelectionStartRef: React.MutableRefObject<number | null>;
    textSelectionEndRef: React.MutableRefObject<number | null>;
    toolRef: React.MutableRefObject<string>;
    colorRef: React.MutableRefObject<string>;
    fontSizeRef: React.MutableRefObject<number>;
    phantomTextPosRef: React.MutableRefObject<Point | null>;
    backgroundType: BackgroundType;
    editingTextPosition: Point | null;
    setEditingTextPosition: (pos: Point | null) => void;
}

export const useWhiteboardCanvas = ({
    canvasRef,
    containerRef,
    transformRef,
    strokesRef,
    textsRef,
    currentStrokeRef,
    selectionBoundsRef,
    isSelectingRef,
    selectionStartRef,
    selectionEndRef,
    editingTextIdRef,
    cursorPositionRef,
    isCursorVisibleRef,
    textSelectionStartRef,
    textSelectionEndRef,
    toolRef,
    colorRef,
    fontSizeRef,
    phantomTextPosRef,
    backgroundType,
    editingTextPosition,
    setEditingTextPosition,
}: UseWhiteboardCanvasProps) => {
    // Animation frame management
    const isScheduledRef = useRef(false);
    const requestRef = useRef<number | null>(null);

    /**
     * Main redraw function - renders all canvas content
     */
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get actual canvas dimensions (in device pixels)
        const dpr = window.devicePixelRatio || 1;
        const containerRect = container.getBoundingClientRect();
        const actualCanvasWidth = containerRect.width * dpr;
        const actualCanvasHeight = containerRect.height * dpr;

        // Ensure canvas dimensions match actual size
        if (canvas.width !== actualCanvasWidth || canvas.height !== actualCanvasHeight) {
            canvas.width = actualCanvasWidth;
            canvas.height = actualCanvasHeight;
            canvas.style.width = `${containerRect.width}px`;
            canvas.style.height = `${containerRect.height}px`;
        }

        const { scale, offset } = transformRef.current;

        // Clear and set transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, actualCanvasWidth, actualCanvasHeight);

        // Apply transform for drawing
        ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);

        // Draw background based on type
        drawBackground(ctx, backgroundType, transformRef.current, actualCanvasWidth, actualCanvasHeight);

        // Draw strokes
        strokesRef.current.forEach((stroke) => {
            drawStroke(ctx, stroke, false);
        });
        if (currentStrokeRef.current) {
            drawStroke(ctx, currentStrokeRef.current);
        }

        // Update text input position if editing
        if (editingTextIdRef.current && editingTextPosition) {
            const textElement = textsRef.current.find(t => t.id === editingTextIdRef.current);
            if (textElement) {
                const newX = textElement.x * scale + offset.x;
                const newY = textElement.y * scale + offset.y;
                if (Math.abs(newX - editingTextPosition.x) > 1 || Math.abs(newY - editingTextPosition.y) > 1) {
                    setEditingTextPosition({ x: newX, y: newY });
                }
            }
        }

        // Draw text elements
        textsRef.current.forEach((textElement) => {
            drawTextElement(
                ctx,
                textElement,
                textElement.id === editingTextIdRef.current,
                cursorPositionRef.current,
                isCursorVisibleRef.current,
                transformRef.current.scale,
                textSelectionStartRef.current,
                textSelectionEndRef.current
            );
        });

        // Draw phantom text if tool is text and not editing
        if (toolRef.current === 'text' && !editingTextIdRef.current && phantomTextPosRef.current) {
            drawPhantomText(
                ctx,
                phantomTextPosRef.current,
                fontSizeRef.current,
                colorRef.current,
                transformRef.current.scale
            );
        }

        // Reset transform to identity for selection overlays
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Draw selection rectangle if selecting
        if (isSelectingRef.current && selectionStartRef.current && selectionEndRef.current) {
            drawSelectionRect(ctx, selectionStartRef.current, selectionEndRef.current, transformRef.current);
        }

        // Draw selection bounds
        if (selectionBoundsRef.current) {
            drawSelectionBounds(ctx, selectionBoundsRef.current, transformRef.current);
        }
    }, [
        canvasRef,
        containerRef,
        transformRef,
        strokesRef,
        textsRef,
        currentStrokeRef,
        selectionBoundsRef,
        isSelectingRef,
        selectionStartRef,
        selectionEndRef,
        editingTextIdRef,
        cursorPositionRef,
        isCursorVisibleRef,
        textSelectionStartRef,
        textSelectionEndRef,
        toolRef,
        colorRef,
        fontSizeRef,
        phantomTextPosRef,
        backgroundType,
        editingTextPosition,
        setEditingTextPosition,
    ]);

    /**
     * Schedule a redraw on next animation frame
     */
    const scheduleRedraw = useCallback(() => {
        if (!isScheduledRef.current) {
            isScheduledRef.current = true;
            if (requestRef.current !== null) {
                cancelAnimationFrame(requestRef.current);
            }
            requestRef.current = requestAnimationFrame(() => {
                redraw();
                isScheduledRef.current = false;
                requestRef.current = null;
            });
        }
    }, [redraw]);

    return {
        redraw,
        scheduleRedraw,
        isScheduledRef,
        requestRef,
    };
};
