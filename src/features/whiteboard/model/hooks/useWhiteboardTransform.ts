import { useRef, useState, useEffect, useCallback } from 'react';
import { TransformState } from '../../lib/types';

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

        // Interruption Detection:
        // If the current offset is different from what we set last frame (and it's not the first frame),
        // then something else (e.g., RMB drag) moved the view. We should stop animating.
        if (lastKnownOffsetRef.current) {
            const dist = Math.hypot(offset.x - lastKnownOffsetRef.current.x, offset.y - lastKnownOffsetRef.current.y);
            // Threshold for external movement. 
            // Note: Floating point errors can cause minute differences, so keep threshold > 0.
            // If movement is detected, we stop the smooth scroll to give user control.
            if (dist > 1.0) {
                targetOffsetRef.current = null;
                lastKnownOffsetRef.current = null;
                animationFrameRef.current = null; // Clear key to allow restart
                return;
            }
        }

        // Lerp
        const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
        const factor = 0.3; // Increased slightly for responsiveness

        const newX = lerp(offset.x, target.x, factor);
        const newY = lerp(offset.y, target.y, factor);

        // Check if close enough to stop
        if (Math.abs(newX - target.x) < 0.5 && Math.abs(newY - target.y) < 0.5) {
            transformRef.current = { scale, offset: { x: target.x, y: target.y } };
            targetOffsetRef.current = null;
            lastKnownOffsetRef.current = null;
            animationFrameRef.current = null; // Clear key to allow restart
            scheduleRedrawRef.current();
            onViewUpdatedRef.current(); // Sync UI
            return;
        }

        // Apply new offset
        transformRef.current = { scale, offset: { x: newX, y: newY } };
        lastKnownOffsetRef.current = { x: newX, y: newY };
        scheduleRedrawRef.current();
        onViewUpdatedRef.current(); // Sync UI

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
                // Zoom (Keep existing logic, maybe rigorous? strictly focused on Pan as requested)
                // Stop any smooth panning if zooming
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                    targetOffsetRef.current = null;
                    lastKnownOffsetRef.current = null;
                }

                const rect = canvas.getBoundingClientRect();
                const delta = -e.deltaY * zoomSpeed;
                const newScale = Math.min(Math.max(0.1, scale + delta), 10);

                // Mouse position relative to canvas
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Canvas coordinate space (DPI corrected)
                const dpr = window.devicePixelRatio || 1;
                const canvasX = x * dpr;
                const canvasY = y * dpr;

                // World coordinate before zoom
                const worldX = (canvasX - offset.x) / scale;
                const worldY = (canvasY - offset.y) / scale;

                // New offset to keep world coordinate stationary
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

                // Initialize target if not already animating
                if (!targetOffsetRef.current) {
                    targetOffsetRef.current = { ...offset };
                    lastKnownOffsetRef.current = { ...offset }; // Sync to current to avoid interruption trigger on start
                }

                // Update target
                // Note: user said "holding RMB and moving wheel up/down". Browsers treat this as simple wheel events usually.
                // Standard wheel pan:

                // If Shift is held, swap axes for horizontal scrolling (common UX)
                if (e.shiftKey) {
                    targetOffsetRef.current.x -= e.deltaY * dpr;
                    // Also handle horizontal wheel if present (e.g. trackpad)
                    targetOffsetRef.current.x -= e.deltaX * dpr;
                } else {
                    targetOffsetRef.current.x -= e.deltaX * dpr;
                    targetOffsetRef.current.y -= e.deltaY * dpr;
                }

                // Start loop if not running
                if (!animationFrameRef.current) {
                    animationFrameRef.current = requestAnimationFrame(smoothPan);
                }
            }
        };

        // Prevent context menu (often used for pointing)
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
            // Cleanup animation
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
        // Logic to zoom to a specific point could be added here if needed
        // For now simple zoom set:
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
