import { useRef, useState, useEffect, useCallback } from 'react';
import { TransformState } from 'entities/whiteboard';

interface UseWhiteboardTransformProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    transformRef: React.MutableRefObject<TransformState>;
    zoomSpeed: number;
    scheduleRedrawRef: React.MutableRefObject<() => void>;
    showZoom?: boolean;
}

export const useWhiteboardTransform = ({
    canvasRef,
    transformRef,
    zoomSpeed,
    scheduleRedrawRef,
    showZoom = true,
    onViewUpdatedRef
}: UseWhiteboardTransformProps & { onViewUpdatedRef: React.MutableRefObject<() => void> }) => {
    const [currentZoom, setCurrentZoom] = useState(1);

    const targetOffsetRef = useRef<{ x: number, y: number } | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastKnownOffsetRef = useRef<{ x: number, y: number } | null>(null);

    // Smooth Pan Animation Loop
    const smoothPan = useCallback(() => {
        if (!targetOffsetRef.current) {
            animationFrameRef.current = null;
            return;
        }

        const { scale, offset } = transformRef.current;
        const target = targetOffsetRef.current;

        // Interruption Detection
        if (lastKnownOffsetRef.current) {
            const dist = Math.hypot(offset.x - lastKnownOffsetRef.current.x, offset.y - lastKnownOffsetRef.current.y);
            if (dist > 1.0) {
                targetOffsetRef.current = null;
                lastKnownOffsetRef.current = null;
                animationFrameRef.current = null;
                return;
            }
        }

        // Lerp
        const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
        const factor = 0.3;

        const newX = lerp(offset.x, target.x, factor);
        const newY = lerp(offset.y, target.y, factor);

        // Check if close enough to stop
        if (Math.abs(newX - target.x) < 0.5 && Math.abs(newY - target.y) < 0.5) {
            transformRef.current = { scale, offset: { x: target.x, y: target.y } };
            targetOffsetRef.current = null;
            lastKnownOffsetRef.current = null;
            animationFrameRef.current = null;
            scheduleRedrawRef.current();
            onViewUpdatedRef.current();
            return;
        }

        // Apply new offset
        transformRef.current = { scale, offset: { x: newX, y: newY } };
        lastKnownOffsetRef.current = { x: newX, y: newY };
        scheduleRedrawRef.current();
        onViewUpdatedRef.current();

        animationFrameRef.current = requestAnimationFrame(smoothPan);
    }, [transformRef, scheduleRedrawRef, onViewUpdatedRef]);

    // Handle Wheel (Zoom & Pan)
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const { scale, offset } = transformRef.current;
            const canvas = canvasRef.current;
            if (!canvas) return;

            if (e.ctrlKey) {
                // Zoom
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                    targetOffsetRef.current = null;
                    lastKnownOffsetRef.current = null;
                }

                const rect = canvas.getBoundingClientRect();
                const delta = -e.deltaY * zoomSpeed;
                const newScale = Math.min(Math.max(0.1, scale + delta), 10);

                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const dpr = window.devicePixelRatio || 1;
                const canvasX = x * dpr;
                const canvasY = y * dpr;

                const worldX = (canvasX - offset.x) / scale;
                const worldY = (canvasY - offset.y) / scale;

                const newOffsetX = canvasX - worldX * newScale;
                const newOffsetY = canvasY - worldY * newScale;

                transformRef.current = {
                    scale: newScale,
                    offset: { x: newOffsetX, y: newOffsetY }
                };

                if (showZoom) {
                    setCurrentZoom(newScale);
                }

                scheduleRedrawRef.current();
                onViewUpdatedRef.current();
            } else {
                // Pan - Smooth
                const dpr = window.devicePixelRatio || 1;

                if (!targetOffsetRef.current) {
                    targetOffsetRef.current = { ...offset };
                    lastKnownOffsetRef.current = { ...offset };
                }

                if (e.shiftKey) {
                    targetOffsetRef.current.x -= e.deltaY * dpr;
                    targetOffsetRef.current.x -= e.deltaX * dpr;
                } else {
                    targetOffsetRef.current.x -= e.deltaX * dpr;
                    targetOffsetRef.current.y -= e.deltaY * dpr;
                }

                if (!animationFrameRef.current) {
                    animationFrameRef.current = requestAnimationFrame(smoothPan);
                }
            }
        };

        const handleContextMenu = (e: Event) => {
            e.preventDefault();
        };

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('wheel', handleWheel, { passive: false });
            canvas.addEventListener('contextmenu', handleContextMenu);
        }

        return () => {
            if (canvas) {
                canvas.removeEventListener('wheel', handleWheel);
                canvas.removeEventListener('contextmenu', handleContextMenu);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [scheduleRedrawRef, zoomSpeed, showZoom, canvasRef, transformRef, smoothPan]);

    const resetView = useCallback(() => {
        transformRef.current = { scale: 1, offset: { x: 0, y: 0 } };
        setCurrentZoom(1);
        scheduleRedrawRef.current();
    }, [scheduleRedrawRef, transformRef]);

    const zoomToPoint = useCallback((point: { x: number, y: number }, newScale: number) => {
        transformRef.current = {
            ...transformRef.current,
            scale: newScale
        };
        setCurrentZoom(newScale);
        scheduleRedrawRef.current();
    }, [scheduleRedrawRef, transformRef]);

    return {
        currentZoom,
        setCurrentZoom,
        resetView,
        zoomToPoint
    };
};
