import { MutableRefObject, useCallback, useRef } from 'react';
import { Stroke, ToolType, TransformState, Point, TextElement } from 'entities/canvas';
import { toWorldPos, isPointIntersectingStroke, calculateTextBounds } from '../../../lib/utils/geometry';
import { updateStrokeIndicesAfterDeletion, recalculateBoundsAfterScale } from '../../../lib/utils/selection';
import { QuadTree, getStrokeBounds } from '../../../lib/utils/QuadTree';

interface UseEraserToolProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    transformRef: MutableRefObject<TransformState>;
    strokesRef: MutableRefObject<Stroke[]>;
    selectedStrokesRef: MutableRefObject<Set<number>>;
    textsRef: MutableRefObject<TextElement[]>;
    selectedTextsRef: MutableRefObject<Set<string>>;
    selectionBoundsRef: MutableRefObject<{ minX: number; minY: number; maxX: number; maxY: number } | null>;
    size: number;
    scheduleRedraw: () => void;
    saveToHistory: () => void;
    tool: ToolType;
    getPointerPos: (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => Point;
    quadTreeRef: MutableRefObject<QuadTree>;
}

export const useEraser = ({
    canvasRef,
    transformRef,
    strokesRef,
    selectedStrokesRef,
    textsRef,
    selectedTextsRef,
    selectionBoundsRef,
    size,
    scheduleRedraw,
    saveToHistory,
    tool,
    getPointerPos,
    quadTreeRef
}: UseEraserToolProps) => {
    const isErasingRef = useRef(false);
    const eraserHistorySavedRef = useRef(false);

    const eraseAtPoint = useCallback((worldPos: Point) => {
        const indicesToRemove: number[] = [];
        const eraserRadius = size / 2;

        // Optimization: In a real large-scale app, we would use a spatial index (QuadTree/R-Tree) here.
        // For now, we iterate, but we can do a quick bounds check if we tracked stroke bounds.
        // Assuming geometry.ts isPointIntersectingStroke is reasonably efficient.

        // Use QuadTree for spatial query
        const bounds = {
            minX: worldPos.x - size / 2,
            minY: worldPos.y - size / 2,
            maxX: worldPos.x + size / 2,
            maxY: worldPos.y + size / 2
        };

        const candidates = quadTreeRef.current.retrieve(bounds);

        candidates.forEach(item => {
            // Check if it's a Stroke (has points)
            if ('points' in item) {
                const stroke = item as Stroke;
                if (isPointIntersectingStroke(worldPos, size, stroke)) {
                    const originalIndex = strokesRef.current.indexOf(stroke);
                    if (originalIndex !== -1) {
                        indicesToRemove.push(originalIndex);
                    }
                }
            } else {
                // It's a TextElement
                const text = item as TextElement;
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    const b = calculateTextBounds(ctx, text);
                    // Circle-Rectangle Intersection check
                    // Find closest point on rect to circle center
                    const closestX = Math.max(b.x, Math.min(worldPos.x, b.x + b.width));
                    const closestY = Math.max(b.y, Math.min(worldPos.y, b.y + b.height));

                    const dx = worldPos.x - closestX;
                    const dy = worldPos.y - closestY;

                    if ((dx * dx + dy * dy) < (eraserRadius * eraserRadius)) {
                        // WE MUST SAVE HISTORY FIRST if not saved.
                        if (!eraserHistorySavedRef.current) {
                            saveToHistory();
                            eraserHistorySavedRef.current = true;
                        }

                        // Remove from QuadTree
                        quadTreeRef.current.remove(text);
                        // Remove from textsRef
                        const textIdx = textsRef.current.findIndex(t => t.id === text.id);
                        if (textIdx !== -1) {
                            textsRef.current.splice(textIdx, 1);
                            // Also remove from selection if selected
                            if (selectedTextsRef.current.has(text.id)) {
                                selectedTextsRef.current.delete(text.id);
                            }
                        }

                        // Trigger redraw
                        scheduleRedraw();
                    }
                }
            }
        });

        // Remove duplicates if any (though retrieved unique strokes)
        // ... indicesToRemove should be unique if strokes are unique references

        if (indicesToRemove.length > 0) {
            if (!eraserHistorySavedRef.current) {
                saveToHistory();
                eraserHistorySavedRef.current = true;
            }

            // Update selection indices before removing strokes
            selectedStrokesRef.current = updateStrokeIndicesAfterDeletion(
                selectedStrokesRef.current,
                indicesToRemove
            );

            // Sort descending to remove without affecting earlier indices
            indicesToRemove.sort((a, b) => b - a).forEach(idx => {
                const stroke = strokesRef.current[idx];
                quadTreeRef.current.remove(stroke);
                strokesRef.current.splice(idx, 1);
            });

            const newBounds = recalculateBoundsAfterScale(
                strokesRef.current,
                selectedStrokesRef.current,
                textsRef.current,
                selectedTextsRef.current,
                canvasRef.current?.getContext('2d') || null
            );
            selectionBoundsRef.current = newBounds || null;
            scheduleRedraw();
        }
    }, [size, strokesRef, selectedStrokesRef, saveToHistory, scheduleRedraw, textsRef, selectedTextsRef, canvasRef, selectionBoundsRef]);

    const lastEraserPosRef = useRef<Point | null>(null);

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'eraser') return;

        isErasingRef.current = true;
        eraserHistorySavedRef.current = false;
        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        lastEraserPosRef.current = worldPos;
        eraseAtPoint(worldPos);
    }, [tool, transformRef, eraseAtPoint, getPointerPos]);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'eraser' || !isErasingRef.current) return;

        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        // Interpolate between last pos and current pos
        if (lastEraserPosRef.current) {
            const start = lastEraserPosRef.current;
            const end = worldPos;
            const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            const stepSize = size / 2; // Step by half eraser size for good coverage
            const steps = Math.ceil(dist / stepSize);

            if (steps > 1) {
                for (let i = 1; i < steps; i++) {
                    const t = i / steps;
                    const lerpX = start.x + (end.x - start.x) * t;
                    const lerpY = start.y + (end.y - start.y) * t;
                    eraseAtPoint({ x: lerpX, y: lerpY });
                }
            }
        }

        eraseAtPoint(worldPos);
        lastEraserPosRef.current = worldPos;
    }, [tool, transformRef, eraseAtPoint, getPointerPos, size]);

    const handleEnd = useCallback(() => {
        if (tool !== 'eraser') return;
        isErasingRef.current = false;
        eraserHistorySavedRef.current = false;
        lastEraserPosRef.current = null;
    }, [tool]);

    return {
        handleStart,
        handleMove,
        handleEnd,
        isErasingRef
    };
};
