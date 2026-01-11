import { MutableRefObject, useCallback, useRef } from 'react';
import { TextElement, ToolType, TransformState, Point } from 'entities/whiteboard';
import { toWorldPos, calculateTextBounds } from '../../../lib/utils/geometry';

interface UseTextToolProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    transformRef: MutableRefObject<TransformState>;
    textsRef: MutableRefObject<TextElement[]>;
    editingTextId: string | null;
    setEditingTextId: (id: string | null) => void;
    setEditingTextValue: (val: string) => void;
    setEditingTextOriginalValue: (val: string) => void;
    setEditingTextPosition: (pos: Point | null) => void;
    isCreatingTextRef: MutableRefObject<boolean>;
    isSwitchingTextRef: MutableRefObject<boolean>;
    phantomTextPosRef: MutableRefObject<Point | null>;
    cursorPositionRef: MutableRefObject<number>;
    selectedTextsRef: MutableRefObject<Set<string>>;
    selectionBoundsRef: MutableRefObject<{ minX: number; minY: number; maxX: number; maxY: number } | null>;
    color: string;
    fontSize: number;
    scheduleRedraw: () => void;
    saveToHistory: () => void;
    finishEditing: () => void;
    tool: ToolType;
    setTool: (tool: ToolType) => void;
    getPointerPos: (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => Point;
}

export const useTextTool = ({
    canvasRef,
    transformRef,
    textsRef,
    editingTextId,
    setEditingTextId,
    setEditingTextValue,
    setEditingTextOriginalValue,
    setEditingTextPosition,
    isCreatingTextRef,
    isSwitchingTextRef,
    phantomTextPosRef,
    cursorPositionRef,
    selectedTextsRef,
    selectionBoundsRef,
    color,
    fontSize,
    scheduleRedraw,
    saveToHistory,
    finishEditing,
    tool,
    setTool,
    getPointerPos,
}: UseTextToolProps) => {

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'text') return;

        // If we are already editing, finish that first (handled by main hook or blur normally, but good safety)
        if (editingTextId) {
            // Usually the click outside would trigger finishEditing in the main loop before we get here
            // But if we clicked specifically to create new text
            return;
        }

        const isMouseEvent = 'button' in e;
        const isCtrlKey = isMouseEvent && ((e as React.MouseEvent).ctrlKey || (e as React.MouseEvent).metaKey);

        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        // Check if clicked on existing text
        let clickedText: TextElement | null = null;
        if (textsRef.current.length > 0) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                for (let i = textsRef.current.length - 1; i >= 0; i--) {
                    const textElement = textsRef.current[i];
                    if (textElement.id === editingTextId) continue;

                    const bounds = calculateTextBounds(ctx, textElement);
                    const padding = 10;
                    if (worldPos.x >= bounds.x - padding && worldPos.x <= bounds.x + bounds.width + padding &&
                        worldPos.y >= bounds.y - padding && worldPos.y <= bounds.y + bounds.height + padding) {
                        clickedText = textElement;
                        break;
                    }
                }
            }
        }

        if (clickedText) {
            if (isMouseEvent) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (isCtrlKey) {
                saveToHistory();
                textsRef.current = textsRef.current.filter(t => t.id !== clickedText!.id);
                scheduleRedraw();
            } else {
                isSwitchingTextRef.current = true;
                isCreatingTextRef.current = false;
                cursorPositionRef.current = clickedText.text.length; // Set cursor to end
                // Clear any cursor tool selection
                selectedTextsRef.current.clear();
                selectionBoundsRef.current = null;
                setEditingTextId(clickedText.id);
                setEditingTextValue(clickedText.text);
                setEditingTextOriginalValue(clickedText.text);
                const { scale, offset } = transformRef.current;
                setEditingTextPosition({
                    x: clickedText.x * scale + offset.x,
                    y: clickedText.y * scale + offset.y
                });
                scheduleRedraw();
            }
        } else {
            // Create new text
            saveToHistory();
            const newTextId = `text-${Date.now()}-${Math.random()}`;
            const { scale, offset } = transformRef.current;
            const offsetDistance = 12 / scale;

            const newText: TextElement = {
                id: newTextId,
                x: worldPos.x + offsetDistance,
                y: worldPos.y + offsetDistance,
                text: '',
                runs: [{ text: '' }],
                color,
                fontSize,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                listType: 'none'
            };
            textsRef.current.push(newText);
            isSwitchingTextRef.current = true;
            isCreatingTextRef.current = true;
            // Clear any cursor tool selection
            selectedTextsRef.current.clear();
            selectionBoundsRef.current = null;
            setEditingTextId(newTextId);
            setEditingTextValue('');
            setEditingTextOriginalValue('');

            const { scale: currentScale, offset: currentOffset } = transformRef.current;
            setEditingTextPosition({
                x: (worldPos.x + offsetDistance) * currentScale + currentOffset.x,
                y: (worldPos.y + offsetDistance) * currentScale + currentOffset.y
            });
            phantomTextPosRef.current = null;
            scheduleRedraw();

            // Switch to cursor tool immediately after creating text
            // Text remains in editing mode, but tool is cursor for further interactions
            setTool('cursor');
        }

    }, [tool, editingTextId, textsRef, canvasRef, transformRef, saveToHistory, scheduleRedraw, isSwitchingTextRef, isCreatingTextRef, setEditingTextId, setEditingTextValue, setEditingTextOriginalValue, setEditingTextPosition, color, fontSize, phantomTextPosRef, getPointerPos, setTool]);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (tool !== 'text' || editingTextId) return;

        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);
        phantomTextPosRef.current = worldPos;
        scheduleRedraw();
    }, [tool, editingTextId, getPointerPos, transformRef, phantomTextPosRef, scheduleRedraw]);

    return {
        handleStart,
        handleMove
    }
};
