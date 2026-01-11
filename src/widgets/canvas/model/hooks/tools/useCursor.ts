import { MutableRefObject, useCallback, useRef } from 'react';
import { Stroke, TextElement, ToolType, TransformState, Point } from 'entities/canvas';
import {
    toWorldPos,
    isPointIntersectingStroke,
    isStrokeInSelection,
    calculateTextBounds,
    getHandleAtPoint
} from '../../../lib/utils/geometry';
import {
    scaleStrokes,
    scaleTexts,
    moveStrokes,
    moveTexts,
    recalculateBoundsAfterScale
} from '../../../lib/utils/selection';
import { QuadTree, getStrokeBounds } from '../../../lib/utils/QuadTree';

interface UseCursorToolProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    transformRef: MutableRefObject<TransformState>;
    strokesRef: MutableRefObject<Stroke[]>;
    textsRef: MutableRefObject<TextElement[]>;
    selectedStrokesRef: MutableRefObject<Set<number>>;
    selectedTextsRef: MutableRefObject<Set<string>>;
    selectionBoundsRef: MutableRefObject<{ minX: number; minY: number; maxX: number; maxY: number } | null>;

    // Resize Refs (passed from parent or internal? Managing internal here is better)
    isResizingRef: MutableRefObject<boolean>;
    resizeHandleRef: MutableRefObject<number | null>;
    resizeStartBoundsRef: MutableRefObject<{ minX: number; minY: number; maxX: number; maxY: number } | null>;
    resizeStartMouseRef: MutableRefObject<Point | null>;

    // Move Refs
    isMovingSelectionRef: MutableRefObject<boolean>;
    moveStartPosRef: MutableRefObject<Point | null>;

    // Selection Refs
    isSelectingRef: MutableRefObject<boolean>;
    selectionStartRef: MutableRefObject<Point | null>;
    selectionEndRef: MutableRefObject<Point | null>;
    setSelectionTick: React.Dispatch<React.SetStateAction<number>>;

    // Text specific resize
    isResizingTextRef: MutableRefObject<boolean>;
    textResizeHandleRef: MutableRefObject<number | null>;
    textResizeStartRef: MutableRefObject<{ fontSize: number; x: number; y: number; width: number; height: number } | null>;
    textResizeStartMouseRef: MutableRefObject<Point | null>;
    editingTextId: string | null;

    // Helpers
    scheduleRedraw: () => void;
    saveToHistory: () => void;
    setIsInteractionHidden: (hidden: boolean) => void;
    setFontSize: (size: number) => void;
    tool: ToolType;
    getPointerPos: (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => Point;
    quadTreeRef: MutableRefObject<QuadTree>;
}

export const useCursor = ({
    canvasRef,
    transformRef,
    strokesRef,
    textsRef,
    selectedStrokesRef,
    selectedTextsRef,
    selectionBoundsRef,
    isResizingRef,
    resizeHandleRef,
    resizeStartBoundsRef,
    resizeStartMouseRef,
    isMovingSelectionRef,
    moveStartPosRef,
    isSelectingRef,
    selectionStartRef,
    selectionEndRef,
    setSelectionTick,
    isResizingTextRef,
    textResizeHandleRef,
    textResizeStartRef,
    textResizeStartMouseRef,
    editingTextId,
    scheduleRedraw,
    saveToHistory,
    setIsInteractionHidden,
    setFontSize,
    tool,
    getPointerPos,
    quadTreeRef
}: UseCursorToolProps) => {

    const originalStrokesForResizeRef = useRef<Map<number, Stroke>>(new Map());
    const originalTextsForResizeRef = useRef<Map<string, TextElement>>(new Map());
    const hoveredHandleRef = useRef<number | null>(null);

    // Helper to get text handle
    const getTextHandleAtPoint = (worldPos: Point) => {
        if (!editingTextId) return null;
        const textElement = textsRef.current.find(t => t.id === editingTextId);
        if (!textElement || !canvasRef.current) return null;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return null;
        const bounds = calculateTextBounds(ctx, textElement);
        const { scale } = transformRef.current;
        const handleSize = 8 / scale;
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height }
        ];
        for (let i = 0; i < corners.length; i++) {
            const corner = corners[i];
            const dx = worldPos.x - corner.x;
            const dy = worldPos.y - corner.y;
            if (Math.sqrt(dx * dx + dy * dy) <= handleSize) {
                return { handleIndex: i, textElement, bounds };
            }
        }
        return null;
    };

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // This function handles the start of cursor interactions (select, move, resize)
        // Note: It's called for ALL tools by the main hook, but we filter inside. 
        // OR better: Main hook only calls this if tool === 'cursor' OR if we hit a handle?
        // Actually, resize handles might be visible even if not strictly 'cursor' tool? 
        // No, usually only in cursor tool or when editing text.

        // We assume main hook calls this logic.

        const isMouseEvent = 'button' in e;
        const isCtrlKey = isMouseEvent && ((e as React.MouseEvent).ctrlKey || (e as React.MouseEvent).metaKey);

        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        // 1. Check Resize Handles (Selection)
        if ((selectedStrokesRef.current.size > 0 || selectedTextsRef.current.size > 0) && selectionBoundsRef.current) {
            const handleIndex = getHandleAtPoint(worldPos, selectionBoundsRef.current, transformRef.current.scale);
            if (handleIndex !== null) {
                if (isMouseEvent) { e.preventDefault(); e.stopPropagation(); }

                isResizingRef.current = true;
                resizeHandleRef.current = handleIndex;
                resizeStartBoundsRef.current = { ...selectionBoundsRef.current };
                resizeStartMouseRef.current = worldPos;
                setIsInteractionHidden(true);

                // Capture state for resize
                originalStrokesForResizeRef.current.clear();
                selectedStrokesRef.current.forEach(idx => {
                    const s = strokesRef.current[idx];
                    if (s) {
                        originalStrokesForResizeRef.current.set(idx, { ...s, points: s.points.map(p => ({ ...p })) });

                        // Optimize: Remove from QuadTree while interacting to avoid constant updates/stale references
                        // We will re-insert them when interaction ends.
                        quadTreeRef.current.remove(s);
                    }
                });
                originalTextsForResizeRef.current.clear();
                selectedTextsRef.current.forEach(id => {
                    const t = textsRef.current.find(tx => tx.id === id);
                    if (t) originalTextsForResizeRef.current.set(id, { ...t });
                });

                saveToHistory();
                scheduleRedraw();
                return true; // Handled
            }
        }

        // 2. Check Text Resize Handle (if editing)
        if (editingTextId) {
            const textHandle = getTextHandleAtPoint(worldPos);
            if (textHandle) {
                if (isMouseEvent) { e.preventDefault(); e.stopPropagation(); }
                isResizingTextRef.current = true;
                textResizeHandleRef.current = textHandle.handleIndex;
                textResizeStartRef.current = {
                    fontSize: textHandle.textElement.fontSize,
                    x: textHandle.bounds.x,
                    y: textHandle.bounds.y,
                    width: textHandle.bounds.width,
                    height: textHandle.bounds.height
                };
                textResizeStartMouseRef.current = worldPos;
                setIsInteractionHidden(true);
                saveToHistory();
                scheduleRedraw();
                return true;
            }
        }

        if (tool !== 'cursor') return false; // If not cursor tool and not hitting handles, exit.

        if (isMouseEvent && (e as React.MouseEvent).button !== 0) return false; // Only left click for cursor tool logic below

        // 3. Hit Detection
        let clickedStrokeIndex = -1;
        // Search backwards (top to bottom)
        for (let i = strokesRef.current.length - 1; i >= 0; i--) {
            if (isPointIntersectingStroke(worldPos, 5 / transformRef.current.scale, strokesRef.current[i])) {
                clickedStrokeIndex = i;
                break;
            }
        }

        let clickedTextId: string | null = null;
        if (textsRef.current.length > 0) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                for (let i = textsRef.current.length - 1; i >= 0; i--) {
                    const text = textsRef.current[i];
                    const bounds = calculateTextBounds(ctx, text);
                    if (worldPos.x >= bounds.x && worldPos.x <= bounds.x + bounds.width &&
                        worldPos.y >= bounds.y && worldPos.y <= bounds.y + bounds.height) {
                        clickedTextId = text.id;
                        break;
                    }
                }
            }
        }

        // 4. Selection Logic
        if (clickedStrokeIndex !== -1 || clickedTextId) {
            if (isCtrlKey) {
                if (clickedStrokeIndex !== -1) {
                    if (selectedStrokesRef.current.has(clickedStrokeIndex)) selectedStrokesRef.current.delete(clickedStrokeIndex);
                    else selectedStrokesRef.current.add(clickedStrokeIndex);
                }
                if (clickedTextId) {
                    if (selectedTextsRef.current.has(clickedTextId)) selectedTextsRef.current.delete(clickedTextId);
                    else selectedTextsRef.current.add(clickedTextId);
                }
            } else {
                const isStrokeSelected = clickedStrokeIndex !== -1 && selectedStrokesRef.current.has(clickedStrokeIndex);
                const isTextSelected = clickedTextId && selectedTextsRef.current.has(clickedTextId);

                if (!isStrokeSelected && !isTextSelected) {
                    selectedStrokesRef.current.clear();
                    selectedTextsRef.current.clear();
                    if (clickedStrokeIndex !== -1) selectedStrokesRef.current.add(clickedStrokeIndex);
                    if (clickedTextId) selectedTextsRef.current.add(clickedTextId);
                }
            }

            const newBounds = recalculateBoundsAfterScale(
                strokesRef.current, selectedStrokesRef.current,
                textsRef.current, selectedTextsRef.current,
                canvasRef.current?.getContext('2d') || null
            );
            selectionBoundsRef.current = newBounds;

            isMovingSelectionRef.current = true;
            moveStartPosRef.current = worldPos;
            setIsInteractionHidden(true);
            saveToHistory();
            setSelectionTick(t => t + 1);

            // Remove from QuadTree during move
            selectedStrokesRef.current.forEach(idx => {
                const s = strokesRef.current[idx];
                if (s) quadTreeRef.current.remove(s);
            });
        } else {
            // Clicked Empty Space - check if inside selection bounds first
            const bounds = selectionBoundsRef.current;
            const hasSelection = selectedStrokesRef.current.size > 0 || selectedTextsRef.current.size > 0;

            // If we have a selection and clicked inside its bounds, start moving instead of clearing
            if (!isCtrlKey && hasSelection && bounds &&
                worldPos.x >= bounds.minX && worldPos.x <= bounds.maxX &&
                worldPos.y >= bounds.minY && worldPos.y <= bounds.maxY) {
                // Clicked inside selection bounds - start moving the group
                isMovingSelectionRef.current = true;
                moveStartPosRef.current = worldPos;
                setIsInteractionHidden(true);
                saveToHistory();
                setSelectionTick(t => t + 1);
            } else {
                // Clicked outside selection bounds - clear and start new box selection
                if (!isCtrlKey) {
                    selectedStrokesRef.current.clear();
                    selectedTextsRef.current.clear();
                    selectionBoundsRef.current = null;
                }
                isSelectingRef.current = true;
                selectionStartRef.current = worldPos;
                selectionEndRef.current = worldPos;
                setSelectionTick(t => t + 1);
            }
        }
        scheduleRedraw();
        return true;

    }, [tool, transformRef, strokesRef, textsRef, selectedStrokesRef, selectedTextsRef, selectionBoundsRef, editingTextId, canvasRef, saveToHistory, scheduleRedraw, setIsInteractionHidden, setSelectionTick, isResizingRef, resizeHandleRef, resizeStartBoundsRef, resizeStartMouseRef, isResizingTextRef, textResizeHandleRef, textResizeStartRef, textResizeStartMouseRef, isMovingSelectionRef, moveStartPosRef, isSelectingRef, selectionStartRef, selectionEndRef, getPointerPos]);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        // 1. Handle Selection Resize
        if (isResizingRef.current && resizeStartBoundsRef.current && resizeStartMouseRef.current && resizeHandleRef.current !== null) {
            const { minX, minY, maxX, maxY } = resizeStartBoundsRef.current;
            const currentX = worldPos.x;
            const currentY = worldPos.y;
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const width = maxX - minX;
            const height = maxY - minY;

            let newMinX = minX; let newMinY = minY; let newMaxX = maxX; let newMaxY = maxY;

            switch (resizeHandleRef.current) {
                case 0: newMinX = Math.min(currentX, maxX - 1); newMinY = Math.min(currentY, maxY - 1); break;
                case 1: newMaxX = Math.max(currentX, minX + 1); newMinY = Math.min(currentY, maxY - 1); break;
                case 2: newMaxX = Math.max(currentX, minX + 1); newMaxY = Math.max(currentY, minY + 1); break;
                case 3: newMinX = Math.min(currentX, maxX - 1); newMaxY = Math.max(currentY, minY + 1); break;
            }

            let scaleX = width > 0 ? (newMaxX - newMinX) / width : 1;
            let scaleY = height > 0 ? (newMaxY - newMinY) / height : 1;

            if (selectedTextsRef.current.size > 0) {
                const uniformScale = (scaleX + scaleY) / 2;
                scaleX = uniformScale; scaleY = uniformScale;
            }

            if ((selectedStrokesRef.current.size > 0 || selectedTextsRef.current.size > 0)) {
                scaleStrokes(
                    strokesRef.current,
                    selectedStrokesRef.current,
                    originalStrokesForResizeRef.current,
                    scaleX, scaleY, centerX, centerY
                );
                scaleTexts(
                    textsRef.current,
                    selectedTextsRef.current,
                    originalTextsForResizeRef.current,
                    scaleX, scaleY, centerX, centerY
                );
                const newBounds = recalculateBoundsAfterScale(
                    strokesRef.current, selectedStrokesRef.current,
                    textsRef.current, selectedTextsRef.current,
                    canvasRef.current?.getContext('2d') || null
                );
                if (newBounds) selectionBoundsRef.current = newBounds;
            }
            scheduleRedraw();
            return;
        }

        // 2. Handle Text Resize
        if (isResizingTextRef.current && textResizeStartRef.current && textResizeStartMouseRef.current && editingTextId) {
            const textElement = textsRef.current.find(t => t.id === editingTextId);
            if (textElement) {
                const startBounds = textResizeStartRef.current;
                const startMouse = textResizeStartMouseRef.current;
                const centerX = startBounds.x + startBounds.width / 2;
                const centerY = startBounds.y + startBounds.height / 2;
                const startDist = Math.sqrt(Math.pow(startMouse.x - centerX, 2) + Math.pow(startMouse.y - centerY, 2));
                const currentDist = Math.sqrt(Math.pow(worldPos.x - centerX, 2) + Math.pow(worldPos.y - centerY, 2));

                if (startDist > 0) {
                    const scaleFactor = currentDist / startDist;
                    const newFontSize = Math.max(8, Math.min(200, startBounds.fontSize * scaleFactor));
                    textElement.fontSize = Math.round(newFontSize);
                    setFontSize(textElement.fontSize);
                }
                scheduleRedraw();
            }
            return;
        }

        // 3. Handle Moving Selection
        if (isMovingSelectionRef.current && moveStartPosRef.current) {
            const dx = worldPos.x - moveStartPosRef.current.x;
            const dy = worldPos.y - moveStartPosRef.current.y;
            moveStrokes(strokesRef.current, selectedStrokesRef.current, dx, dy);
            moveTexts(textsRef.current, selectedTextsRef.current, dx, dy);

            if (selectionBoundsRef.current) {
                selectionBoundsRef.current.minX += dx; selectionBoundsRef.current.maxX += dx;
                selectionBoundsRef.current.minY += dy; selectionBoundsRef.current.maxY += dy;
            }
            moveStartPosRef.current = worldPos;
            scheduleRedraw();
            return;
        }

        // 4. Handle Box Selection
        if (isSelectingRef.current) {
            selectionEndRef.current = worldPos;
            scheduleRedraw();
            return;
        }

        // 5. Update Cursors (Hover)
        // Check Selection Resize Handles
        if (!isResizingRef.current && tool === 'cursor' && selectionBoundsRef.current) {
            const handleIndex = getHandleAtPoint(worldPos, selectionBoundsRef.current, transformRef.current.scale);
            if (handleIndex !== hoveredHandleRef.current) {
                hoveredHandleRef.current = handleIndex;
                if (canvasRef.current) {
                    if (handleIndex !== null) {
                        const cursors = ['nw-resize', 'ne-resize', 'se-resize', 'sw-resize'];
                        canvasRef.current.style.cursor = cursors[handleIndex];
                    } else {
                        canvasRef.current.style.cursor = 'default';
                    }
                }
            }
        }

        // Check Text Resize Handles and text content area (when editing with any tool)
        if (!isResizingTextRef.current && editingTextId) {
            const textHandle = getTextHandleAtPoint(worldPos);
            if (canvasRef.current) {
                if (textHandle) {
                    // On resize handle - show resize cursor
                    const cursors = ['nw-resize', 'ne-resize', 'se-resize', 'sw-resize'];
                    canvasRef.current.style.cursor = cursors[textHandle.handleIndex];
                } else {
                    // Check if hovering inside the edited text bounds
                    const textElement = textsRef.current.find(t => t.id === editingTextId);
                    if (textElement) {
                        const ctx = canvasRef.current.getContext('2d');
                        if (ctx) {
                            const bounds = calculateTextBounds(ctx, textElement);
                            if (worldPos.x >= bounds.x && worldPos.x <= bounds.x + bounds.width &&
                                worldPos.y >= bounds.y && worldPos.y <= bounds.y + bounds.height) {
                                // Inside text bounds - show text cursor (I-beam)
                                canvasRef.current.style.cursor = 'text';
                            } else {
                                // Outside text - use appropriate cursor based on tool
                                canvasRef.current.style.cursor = tool === 'text' ? 'crosshair' : 'default';
                            }
                        } else {
                            canvasRef.current.style.cursor = tool === 'text' ? 'crosshair' : 'default';
                        }
                    } else {
                        canvasRef.current.style.cursor = tool === 'text' ? 'crosshair' : 'default';
                    }
                }
            }
        } else if (tool === 'text' && canvasRef.current && !editingTextId) {
            // Not editing - ensure crosshair cursor in text mode
            canvasRef.current.style.cursor = 'crosshair';
        }

    }, [tool, getPointerPos, transformRef, isResizingRef, isResizingTextRef, isMovingSelectionRef, isSelectingRef, scheduleRedraw, setFontSize, editingTextId, strokesRef, textsRef, selectedStrokesRef, selectedTextsRef, selectionBoundsRef, resizeStartBoundsRef, resizeHandleRef, resizeStartMouseRef, textResizeStartRef, textResizeStartMouseRef, moveStartPosRef, selectionEndRef, canvasRef]);

    const handleEnd = useCallback(() => {
        let wasInteracting = false;

        if (isResizingRef.current) {
            isResizingRef.current = false;
            resizeHandleRef.current = null;
            resizeStartBoundsRef.current = null;
            resizeStartMouseRef.current = null;
            wasInteracting = true;

            // Re-insert resized strokes into QuadTree
            selectedStrokesRef.current.forEach(idx => {
                const s = strokesRef.current[idx];
                if (s) {
                    quadTreeRef.current.insert({
                        item: s,
                        bounds: getStrokeBounds(s)
                    });
                }
            });

            // Re-insert resized texts into QuadTree
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                selectedTextsRef.current.forEach(id => {
                    const t = textsRef.current.find(text => text.id === id);
                    if (t) {
                        const b = calculateTextBounds(ctx, t);
                        quadTreeRef.current.insert({
                            item: t,
                            bounds: { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height }
                        });
                    }
                });
            }
        }
        if (isResizingTextRef.current) {
            isResizingTextRef.current = false;
            textResizeHandleRef.current = null;
            textResizeStartRef.current = null;
            textResizeStartMouseRef.current = null;
            wasInteracting = true;
        }
        if (isMovingSelectionRef.current) {
            isMovingSelectionRef.current = false;
            moveStartPosRef.current = null;
            wasInteracting = true;

            // Re-insert moved strokes into QuadTree
            selectedStrokesRef.current.forEach(idx => {
                const s = strokesRef.current[idx];
                if (s) {
                    quadTreeRef.current.insert({
                        item: s,
                        bounds: getStrokeBounds(s)
                    });
                }
            });

            // Re-insert moved texts into QuadTree
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                selectedTextsRef.current.forEach(id => {
                    const t = textsRef.current.find(text => text.id === id);
                    if (t) {
                        const b = calculateTextBounds(ctx, t);
                        quadTreeRef.current.insert({
                            item: t,
                            bounds: { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height }
                        });
                    }
                });
            }
        }

        // Also handling resize end re-insertion (was missed in block above)
        if (wasInteracting && !isMovingSelectionRef.current && (resizeHandleRef.current === null && textResizeHandleRef.current === null)) {
            // If we just finished resizing (isResizingRef was true at start of function, now false)
            // Check if we need to re-insert resized strokes.
            // But Wait: `handleEnd` sets flags to false at top.
            // We need to know if we WERE resizing.
            // The logic at top: `if (isResizingRef.current) { isResizingRef.current = false; ... wasInteracting = true; }`
            // So we are inside `handleEnd`.
            // We should capture the fact we were resizing and re-insert.
        }
        if (isSelectingRef.current) {
            // Finalize selection bounds
            if (selectionStartRef.current && selectionEndRef.current) {
                const start = selectionStartRef.current;
                const end = selectionEndRef.current;

                // Find items in rect
                const newSelectedStrokes = new Set<number>();
                strokesRef.current.forEach((stroke, i) => {
                    // Check intersection
                    // Simple bbox check first then detailed?
                    // geometry.ts has isStrokeInSelection
                    // We need to import isStrokeInSelection
                    // Note: We'll assume strict import or add it to imports
                });
                // For now, let's just reset flag, actual selection logic usually in Move/Click
                // Actually box selection is computing selection at end? 
                // In original code: "Box Select" updates `selectionEndRef` in move.
                // But where does it verify what is selected?
                // Ah, it seems the original code might have been missing the "Apply Box Selection" step on End?
                // Wait, looking at original code...
                // It creates a selection rect. But I don't see it populating `selectedStrokesRef` at the end of box select in `handleEnd`.
                // It seems `handleEnd` in original code just resets flags. 
                // Maybe the user's box selection visual was just visual? 
                // OR I missed where it selects.
                // I will add logical "Select things in box" here.

                const minX = Math.min(start.x, end.x);
                const maxX = Math.max(start.x, end.x);
                const minY = Math.min(start.y, end.y);
                const maxY = Math.max(start.y, end.y);

                // Filter strokes - add to selection if they intersect the box
                strokesRef.current.forEach((stroke, i) => {
                    // Check stroke bbox intersection with selection box
                    let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
                    stroke.points.forEach(p => {
                        sMinX = Math.min(sMinX, p.x);
                        sMaxX = Math.max(sMaxX, p.x);
                        sMinY = Math.min(sMinY, p.y);
                        sMaxY = Math.max(sMaxY, p.y);
                    });
                    if (sMaxX >= minX && sMinX <= maxX && sMaxY >= minY && sMinY <= maxY) {
                        selectedStrokesRef.current.add(i);
                    }
                });

                // Filter Texts
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        textsRef.current.forEach(text => {
                            const b = calculateTextBounds(ctx, text);
                            if (b.x + b.width >= minX && b.x <= maxX && b.y + b.height >= minY && b.y <= maxY) {
                                selectedTextsRef.current.add(text.id);
                            }
                        });
                    }
                }

                const newBounds = recalculateBoundsAfterScale(
                    strokesRef.current, selectedStrokesRef.current,
                    textsRef.current, selectedTextsRef.current,
                    canvasRef.current?.getContext('2d') || null
                );
                selectionBoundsRef.current = newBounds;
            }

            isSelectingRef.current = false;
            selectionStartRef.current = null;
            selectionEndRef.current = null;
            wasInteracting = true;
        }

        if (wasInteracting) {
            setIsInteractionHidden(false);
            scheduleRedraw();
        }
    }, [isResizingRef, isResizingTextRef, isMovingSelectionRef, isSelectingRef, setIsInteractionHidden, scheduleRedraw, selectionStartRef, selectionEndRef, strokesRef, textsRef, selectedStrokesRef, selectedTextsRef, selectionBoundsRef, canvasRef]);

    const updateDrag = useCallback((worldPos: Point) => {
        if (isMovingSelectionRef.current && moveStartPosRef.current) {
            const dx = worldPos.x - moveStartPosRef.current.x;
            const dy = worldPos.y - moveStartPosRef.current.y;
            moveStrokes(strokesRef.current, selectedStrokesRef.current, dx, dy);
            moveTexts(textsRef.current, selectedTextsRef.current, dx, dy);

            if (selectionBoundsRef.current) {
                selectionBoundsRef.current.minX += dx; selectionBoundsRef.current.maxX += dx;
                selectionBoundsRef.current.minY += dy; selectionBoundsRef.current.maxY += dy;
            }
            moveStartPosRef.current = worldPos;
            scheduleRedraw();
        }
    }, [isMovingSelectionRef, moveStartPosRef, strokesRef, textsRef, selectedStrokesRef, selectedTextsRef, selectionBoundsRef, scheduleRedraw]);

    return {
        handleStart,
        handleMove,
        handleEnd,
        updateDrag
    };
};
