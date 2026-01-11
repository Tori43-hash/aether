import { MutableRefObject, useCallback, useRef } from 'react';
import { Stroke, ToolType, TransformState, Point } from 'entities/whiteboard';
import { toWorldPos } from '../../../lib/utils/geometry';
import { QuadTree, getStrokeBounds } from '../../../lib/utils/QuadTree';

interface UsePenToolProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    transformRef: MutableRefObject<TransformState>;
    strokesRef: MutableRefObject<Stroke[]>;
    currentStrokeRef: MutableRefObject<Stroke | null>;
    color: string;
    size: number;
    scheduleRedraw: () => void;
    saveToHistory: () => void;
    tool: ToolType;
    getPointerPos: (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => Point;
    quadTreeRef: MutableRefObject<QuadTree>;
}

export const usePenTool = ({
    canvasRef,
    transformRef,
    strokesRef,
    currentStrokeRef,
    color,
    size,
    scheduleRedraw,
    saveToHistory,
    tool,
    getPointerPos,
    quadTreeRef
}: UsePenToolProps) => {
    const isDrawingRef = useRef(false);

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'pen') return;

        isDrawingRef.current = true;
        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        currentStrokeRef.current = {
            points: [worldPos],
            color,
            size,
            tool: 'pen'
        };
        scheduleRedraw();
    }, [tool, color, size, transformRef, currentStrokeRef, scheduleRedraw, getPointerPos]);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'pen' || !isDrawingRef.current || !currentStrokeRef.current) return;

        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        currentStrokeRef.current.points.push(worldPos);
        scheduleRedraw();
    }, [tool, transformRef, currentStrokeRef, scheduleRedraw, getPointerPos]);

    const handleEnd = useCallback(() => {
        if (tool !== 'pen' || !isDrawingRef.current) return;

        if (currentStrokeRef.current) {
            saveToHistory();
            strokesRef.current.push(currentStrokeRef.current);

            // Add to QuadTree
            quadTreeRef.current.insert({
                item: currentStrokeRef.current,
                bounds: getStrokeBounds(currentStrokeRef.current)
            });

            currentStrokeRef.current = null;
        }

        isDrawingRef.current = false;
        scheduleRedraw();
    }, [tool, strokesRef, currentStrokeRef, saveToHistory, scheduleRedraw]);

    return {
        handleStart,
        handleMove,
        handleEnd,
        isDrawingRef
    };
};
