import { useRef, useCallback, useEffect } from 'react';
import { Point, Stroke, TextElement, ToolType, TransformState } from 'entities/canvas';
import { toWorldPos, calculateTextBounds } from '../../lib/utils/geometry';
import { QuadTree } from '../../lib/utils/QuadTree';

// Tool Hooks
import { usePen } from './tools/usePen';
import { useEraser } from './tools/useEraser';
import { useCursor } from './tools/useCursor';
import { useText } from './tools/useText';

interface UseWhiteboardEventsProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    containerRef: React.RefObject<HTMLDivElement>;
    strokesRef: React.MutableRefObject<Stroke[]>;
    textsRef: React.MutableRefObject<TextElement[]>;
    currentStrokeRef: React.MutableRefObject<Stroke | null>;
    transformRef: React.MutableRefObject<TransformState>;

    // Selection State
    selectedStrokesRef: React.MutableRefObject<Set<number>>;
    selectedTextsRef: React.MutableRefObject<Set<string>>;
    selectionBoundsRef: React.MutableRefObject<{ minX: number; minY: number; maxX: number; maxY: number } | null>;

    // Tool Settings
    tool: ToolType;
    setTool: (tool: ToolType) => void;
    color: string;
    size: number;
    fontSize: number;
    setFontSize: (size: number) => void;

    // Status / Flags
    isUIHidden: boolean;
    showCoordinates: boolean;

    // Callbacks
    scheduleRedraw: () => void;
    saveToHistory: () => void;

    // Text Editing State
    editingTextId: string | null;
    setEditingTextId: (id: string | null) => void;
    setEditingTextValue: (val: string) => void;
    setEditingTextOriginalValue: (val: string) => void;
    setEditingTextPosition: (pos: Point | null) => void;
    finishEditing: () => void;
    isCreatingTextRef: React.MutableRefObject<boolean>;
    isSwitchingTextRef: React.MutableRefObject<boolean>;
    cursorPositionRef: React.MutableRefObject<number>;

    // Setters
    setIsInteractionHidden: (hidden: boolean) => void;
    setMousePosition: (pos: Point | null) => void;
    setSelectionTick: React.Dispatch<React.SetStateAction<number>>;

    phantomTextPosRef: React.MutableRefObject<Point | null>;

    // Refs for internal state tracking passed from parent (hoisted)
    isSelectingRef: React.MutableRefObject<boolean>;
    selectionStartRef: React.MutableRefObject<Point | null>;
    selectionEndRef: React.MutableRefObject<Point | null>;

    // Other Refs
    isCursorVisibleRef: React.MutableRefObject<boolean>;
    textEditableRef: React.RefObject<HTMLDivElement>;

    // Text selection refs for mouse-drag selection
    textSelectionStartRef: React.MutableRefObject<number | null>;
    textSelectionEndRef: React.MutableRefObject<number | null>;
    quadTreeRef: React.MutableRefObject<QuadTree>;

    onViewUpdatedRef: React.MutableRefObject<() => void>;
}

export const useEvents = (props: UseWhiteboardEventsProps) => {
    const {
        canvasRef,
        transformRef,
        tool,
        showCoordinates,
        setMousePosition,
        setIsInteractionHidden,
        scheduleRedraw,
        editingTextId,
        finishEditing,
        phantomTextPosRef
    } = props;

    // Internal Global State (Panning)
    const isPanningRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    // Internal state for text selection drag
    const isSelectingTextRef = useRef(false);

    // Internal Tool State (that needs to be passed to sub-hooks or managed)
    // We create Refs for state that was previously local to this hook but now needs to be shared or passed.
    // Ideally, sub-hooks manage their own internal state (like isDrawingRef), but some state like 'isResizingRef' 
    // was shared across move/end handlers. We passed those to useCursor.

    // 1. Initialize Sub-Hooks

    // -- Helpers --
    const getPointerPos = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e && (e as TouchEvent).touches.length > 0) {
            clientX = (e as TouchEvent).touches[0].clientX;
            clientY = (e as TouchEvent).touches[0].clientY;
        } else if ('clientX' in e) {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        } else {
            return { x: 0, y: 0 };
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const dpr = window.devicePixelRatio || 1;
        return { x: x * dpr, y: y * dpr };
    }, [canvasRef]);

    // -- Pen Tool --
    const penTool = usePen({
        ...props,
        quadTreeRef: props.quadTreeRef,
        getPointerPos
    });

    // -- Eraser Tool --
    const eraserTool = useEraser({
        ...props,
        quadTreeRef: props.quadTreeRef,
        getPointerPos
    });

    // -- Text Tool --
    const textTool = useText({
        ...props,
        getPointerPos
    });

    // -- Cursor Tool (Selection) --
    // We need to hold the resize refs here to persist across render if they aren't hoisted to parent?
    // Actually, useCursor defines its own refs? 
    // Wait, in my implementation of useCursor, I asked for them as props.
    // I should create them here and pass them down.

    const isResizingRef = useRef(false);
    const resizeHandleRef = useRef<number | null>(null);
    const resizeStartBoundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
    const resizeStartMouseRef = useRef<Point | null>(null);
    const isMovingSelectionRef = useRef(false);
    const moveStartPosRef = useRef<Point | null>(null);
    const isResizingTextRef = useRef(false);
    const textResizeHandleRef = useRef<number | null>(null);
    const textResizeStartRef = useRef<{ fontSize: number; x: number; y: number; width: number; height: number } | null>(null);
    const textResizeStartMouseRef = useRef<Point | null>(null);

    const cursorTool = useCursor({
        ...props,
        isResizingRef,
        resizeHandleRef,
        resizeStartBoundsRef,
        resizeStartMouseRef,
        isMovingSelectionRef,
        moveStartPosRef,
        isResizingTextRef,
        textResizeHandleRef,
        textResizeStartRef,
        textResizeStartMouseRef,
        quadTreeRef: props.quadTreeRef,
        getPointerPos
    });

    // -- Sync Logic for Scroll --
    // Track last raw pointer position (client/canvas space)
    const lastPointerRawPosRef = useRef<{ x: number, y: number } | null>(null);

    // Update onViewUpdatedRef
    useEffect(() => {
        props.onViewUpdatedRef.current = () => {
            if (!lastPointerRawPosRef.current) return;

            // Recalculate World Pos with new Transform
            const worldPos = toWorldPos(lastPointerRawPosRef.current, transformRef.current);

            // 1. Update Coordinates Display
            if (showCoordinates) {
                setMousePosition({ x: worldPos.x, y: worldPos.y });
            }

            // 2. Update Drag Positions (Move Selection)
            // If we are currently moving selection, we need to update the move delta
            if (isMovingSelectionRef.current && moveStartPosRef.current) {
                // We call cursorTool.updateDrag to recalculate positions based on new world pos
                // But updateDrag logic relies on dx/dy from moveStartPosRef.
                // moveStartPosRef is in World Coordinates from when drag STARTED.
                // As we pan effectively "under" the mouse, the world pos under mouse changes.
                // Wait. 
                // If I hold an object and scroll down, the camera moves down. 
                // The mouse stays at screen (100, 100).
                // Before scroll: World (100, 100). Obj at (100, 100).
                // Scroll down by 50. Offset changes.
                // New World at mouse (100, 150).
                // If I simply update drag, Obj moves to (150, 150).
                // Visual result: Object "slides" on screen?
                // User said: "if I don't move mouse, objects stay in place" (BAD).
                // "if I move mouse, they move to key" (GOOD? or BAD?)
                // User wants: "objects move with cursor".
                // If I hold pointer and screen moves, object should stay with pointer?
                // Yes. In standard apps, if you drag and scroll, the object follows the mouse (screen space).
                // So if I scroll, world pos under mouse changes. Object should move to new world pos.

                cursorTool.updateDrag(worldPos);
            }
        };
    }, [transformRef, showCoordinates, setMousePosition, cursorTool]);

    // -- Event Handlers --

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // 1. Global Checks (Panning, Finishing Edit)
        const isMouseEvent = 'button' in e;
        const isMiddleClick = isMouseEvent && (e as React.MouseEvent).button === 1;
        const isRightClick = isMouseEvent && (e as React.MouseEvent).button === 2;

        if (isMiddleClick || isRightClick) {
            isPanningRef.current = true;
            const pos = getPointerPos(e);
            lastMousePosRef.current = pos;
            setIsInteractionHidden(true);
            return;
        }

        // Handle click-to-position cursor when editing text
        if (editingTextId) {
            const pos = getPointerPos(e);
            const worldPos = toWorldPos(pos, transformRef.current);
            const textElement = props.textsRef.current.find(t => t.id === editingTextId);

            if (textElement) {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    const bounds = calculateTextBounds(ctx, textElement);

                    // Check if click is inside the text bounds
                    if (worldPos.x >= bounds.x && worldPos.x <= bounds.x + bounds.width &&
                        worldPos.y >= bounds.y && worldPos.y <= bounds.y + bounds.height) {

                        // Calculate cursor position from click coordinates
                        ctx.font = `${textElement.fontStyle || 'normal'} ${textElement.fontWeight || 'normal'} ${textElement.fontSize}px ${textElement.fontFamily || 'sans-serif'}`;
                        const lines = textElement.text.split('\n');
                        const lineHeight = textElement.fontSize * 1.2;

                        // Find which line was clicked
                        const relativeY = worldPos.y - textElement.y;
                        let lineIndex = Math.floor(relativeY / lineHeight);
                        lineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));

                        // Find character position within the line
                        const relativeX = worldPos.x - textElement.x;
                        const line = lines[lineIndex];
                        let charPos = 0;

                        // Binary search or linear scan to find closest character
                        for (let i = 0; i <= line.length; i++) {
                            const textWidth = ctx.measureText(line.substring(0, i)).width;
                            if (textWidth > relativeX) {
                                // Check if closer to previous or current char
                                if (i > 0) {
                                    const prevWidth = ctx.measureText(line.substring(0, i - 1)).width;
                                    charPos = (relativeX - prevWidth < textWidth - relativeX) ? i - 1 : i;
                                } else {
                                    charPos = 0;
                                }
                                break;
                            }
                            charPos = i;
                        }

                        // Calculate absolute character position (sum of previous lines + current pos)
                        let absolutePos = 0;
                        for (let i = 0; i < lineIndex; i++) {
                            absolutePos += lines[i].length + 1; // +1 for \n
                        }
                        absolutePos += charPos;

                        // Update cursor position
                        props.cursorPositionRef.current = absolutePos;
                        props.isCursorVisibleRef.current = true;

                        // Initialize text selection - start drag selection
                        props.textSelectionStartRef.current = absolutePos;
                        props.textSelectionEndRef.current = null; // Will be set on move
                        isSelectingTextRef.current = true;

                        // Sync cursor in hidden contentEditable DOM element
                        if (props.textEditableRef.current) {
                            const editable = props.textEditableRef.current;
                            editable.focus();

                            // Set cursor position in contentEditable
                            const selection = window.getSelection();
                            if (selection) {
                                // Get text nodes and find position
                                const walker = document.createTreeWalker(
                                    editable,
                                    NodeFilter.SHOW_TEXT,
                                    null
                                );

                                let currentOffset = 0;
                                let targetNode: Node | null = null;
                                let targetOffset = 0;

                                let node: Node | null = walker.nextNode();
                                while (node) {
                                    const nodeLength = node.textContent?.length || 0;
                                    if (currentOffset + nodeLength >= absolutePos) {
                                        targetNode = node;
                                        targetOffset = absolutePos - currentOffset;
                                        break;
                                    }
                                    currentOffset += nodeLength;
                                    node = walker.nextNode();
                                }

                                // If no text nodes, set cursor at editable start
                                if (!targetNode && editable.firstChild) {
                                    targetNode = editable.firstChild;
                                    targetOffset = 0;
                                }

                                if (targetNode) {
                                    const range = document.createRange();
                                    range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
                                    range.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                }
                            }
                        }

                        scheduleRedraw();

                        // Set cursor to text immediately
                        if (canvasRef.current) {
                            canvasRef.current.style.cursor = 'text';
                        }

                        // Prevent further handling - we handled the click
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                }
            }
        }

        // 2. Delegate to Tools
        // Priority: Cursor/Selection handles -> Active Tool

        // Try Cursor Tool Logic first (Handles & Selection)
        // Even if tool is NOT cursor, sometimes handles (like text resize) might be active?
        // useCursor handles: Selection Handles (only if tool==cursor), Text Resize Handles (if editingTextId)

        const handledByCursor = cursorTool.handleStart(e);
        if (handledByCursor) return;

        // If not handled by cursor interactions, try active tool
        if (tool === 'pen') {
            penTool.handleStart(e);
        } else if (tool === 'eraser') {
            eraserTool.handleStart(e);
        } else if (tool === 'text') {
            textTool.handleStart(e);
        } else if (tool === 'cursor') {
            // Logic already attempted in cursorTool.handleStart
            // If it returned false/void (wait, my useCursor returns boolean handled?), it means it missed.
            // My useCursor returns {handleStart...} 
            // I should modify useCursor to return boolean or handle "miss" internally?
            // In my implementation of useCursor, handleStart returns `true` if it did something or matched.
            // It returns `false` if it ignored the event (e.g. wrong button).
            // But for 'cursor' tool, it handles "Click Empty Space" too. So it should always return true if tool is cursor.
        }

        // If editing text and we clicked somewhere else (and not handled by text tool logic), finish editing
        // But only if click was OUTSIDE the edited text bounds
        if (editingTextId && !handledByCursor) {
            // Check if click was inside the edited text - if so, don't finish editing
            const textElement = props.textsRef.current.find(t => t.id === editingTextId);
            let clickedInsideText = false;

            if (textElement) {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    const bounds = calculateTextBounds(ctx, textElement);
                    const pos = getPointerPos(e);
                    const worldPos = toWorldPos(pos, transformRef.current);

                    // Check if click is inside text bounds
                    if (worldPos.x >= bounds.x && worldPos.x <= bounds.x + bounds.width &&
                        worldPos.y >= bounds.y && worldPos.y <= bounds.y + bounds.height) {
                        clickedInsideText = true;
                    }
                }
            }

            // Only finish editing if clicked outside the text
            if (!clickedInsideText) {
                finishEditing();
            }
        }

    }, [editingTextId, tool, cursorTool, penTool, eraserTool, textTool, finishEditing, setIsInteractionHidden, getPointerPos, canvasRef, transformRef, scheduleRedraw, props.textsRef, props.cursorPositionRef, props.isCursorVisibleRef]);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPointerPos(e);
        lastPointerRawPosRef.current = pos; // Track raw pos for scroll sync
        const worldPos = toWorldPos(pos, transformRef.current);

        if (showCoordinates) {
            setMousePosition({ x: worldPos.x, y: worldPos.y });
        }

        // 1. Panning
        if (isPanningRef.current) {
            const dx = pos.x - lastMousePosRef.current.x;
            const dy = pos.y - lastMousePosRef.current.y;
            const { scale, offset } = transformRef.current;
            transformRef.current = { scale, offset: { x: offset.x + dx, y: offset.y + dy } };
            lastMousePosRef.current = pos;
            scheduleRedraw();
            return;
        }

        // 1b. Text selection dragging
        if (isSelectingTextRef.current && editingTextId) {
            const textElement = props.textsRef.current.find(t => t.id === editingTextId);
            if (textElement) {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    ctx.font = `${textElement.fontStyle || 'normal'} ${textElement.fontWeight || 'normal'} ${textElement.fontSize}px ${textElement.fontFamily || 'sans-serif'}`;
                    const lines = textElement.text.split('\n');
                    const lineHeight = textElement.fontSize * 1.2;

                    // Find which line the cursor is on
                    const relativeY = worldPos.y - textElement.y;
                    let lineIndex = Math.floor(relativeY / lineHeight);
                    lineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));

                    // Find character position within the line
                    const relativeX = worldPos.x - textElement.x;
                    const line = lines[lineIndex];
                    let charPos = 0;

                    // Handle case when mouse is to the left of text
                    if (relativeX <= 0) {
                        charPos = 0;
                    } else {
                        // Find closest character position
                        let found = false;
                        for (let i = 0; i <= line.length; i++) {
                            const textWidth = ctx.measureText(line.substring(0, i)).width;
                            if (textWidth > relativeX) {
                                if (i > 0) {
                                    const prevWidth = ctx.measureText(line.substring(0, i - 1)).width;
                                    charPos = (relativeX - prevWidth < textWidth - relativeX) ? i - 1 : i;
                                } else {
                                    charPos = 0;
                                }
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            charPos = line.length;
                        }
                    }

                    // Calculate absolute character position
                    let absolutePos = 0;
                    for (let i = 0; i < lineIndex; i++) {
                        absolutePos += lines[i].length + 1;
                    }
                    absolutePos += charPos;

                    // Clamp to valid range
                    absolutePos = Math.max(0, Math.min(absolutePos, textElement.text.length));

                    // Update selection end and cursor position
                    props.textSelectionEndRef.current = absolutePos;
                    props.cursorPositionRef.current = absolutePos;
                    props.isCursorVisibleRef.current = true;

                    // Sync selection with contentEditable
                    if (props.textEditableRef.current) {
                        const editable = props.textEditableRef.current;
                        const selection = window.getSelection();
                        if (selection && props.textSelectionStartRef.current !== null) {
                            const startPos = props.textSelectionStartRef.current;
                            const endPos = absolutePos;

                            // Find nodes for start and end
                            const findNodeAtPosition = (targetPos: number): { node: Node | null, offset: number } => {
                                const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT, null);
                                let currentOffset = 0;
                                let node: Node | null = walker.nextNode();
                                while (node) {
                                    const nodeLength = node.textContent?.length || 0;
                                    if (currentOffset + nodeLength >= targetPos) {
                                        return { node, offset: targetPos - currentOffset };
                                    }
                                    currentOffset += nodeLength;
                                    node = walker.nextNode();
                                }
                                return { node: editable.firstChild, offset: 0 };
                            };

                            const startInfo = findNodeAtPosition(Math.min(startPos, endPos));
                            const endInfo = findNodeAtPosition(Math.max(startPos, endPos));

                            if (startInfo.node && endInfo.node) {
                                const range = document.createRange();
                                // startInfo is always the smaller position, endInfo the larger
                                // regardless of selection direction
                                range.setStart(startInfo.node, Math.min(startInfo.offset, startInfo.node.textContent?.length || 0));
                                range.setEnd(endInfo.node, Math.min(endInfo.offset, endInfo.node.textContent?.length || 0));
                                selection.removeAllRanges();
                                selection.addRange(range);
                            }
                        }
                    }

                    scheduleRedraw();
                    return;
                }
            }
        }

        // 2. Delegate
        if (tool === 'pen') {
            penTool.handleMove(e);
        } else if (tool === 'eraser') {
            eraserTool.handleMove(e);
        } else if (tool === 'text') {
            textTool.handleMove(e);
            // Also need to handle cursor tool interactions (resize text) if editing
            cursorTool.handleMove(e); // delegates internally checks refs
        } else if (tool === 'cursor') {
            cursorTool.handleMove(e);
        } else {
            // Fallback for interactions that might span tools (like text resize while in text tool?)
            // cursorTool handles text resize logic if refs are active
            cursorTool.handleMove(e);
        }

    }, [showCoordinates, tool, penTool, eraserTool, textTool, cursorTool, transformRef, scheduleRedraw, setMousePosition, getPointerPos, editingTextId, props.textsRef, props.textSelectionStartRef, props.textSelectionEndRef, props.cursorPositionRef, props.isCursorVisibleRef, props.textEditableRef, canvasRef]);

    const handleEnd = useCallback(() => {
        // 1. Panning
        if (isPanningRef.current) {
            isPanningRef.current = false;
            setIsInteractionHidden(false);
            return;
        }

        // 1b. Text selection dragging - stop
        if (isSelectingTextRef.current) {
            isSelectingTextRef.current = false;
            // If no move happened (end is still null), clear selection entirely
            if (props.textSelectionEndRef.current === null) {
                props.textSelectionStartRef.current = null;
            }
            // Otherwise keep selection visible
        }

        // 2. Delegate
        // For 'End', we often want to notify ALL tools to reset state just in case,
        // or just the active one. Safest is to call all or active.
        // Since hooks filter by tool internally, calling all is safe-ish, but check implementation.
        // penTool checks tool==pen. 
        // cursorTool checks refs (isResizing, etc).

        penTool.handleEnd();
        eraserTool.handleEnd();
        // textTool has no handleEnd logic really (atomic clicks), but check file.
        // textTool: "return { handleStart, handleMove }" - no handleEnd.

        cursorTool.handleEnd();

    }, [isPanningRef, setIsInteractionHidden, penTool, eraserTool, cursorTool]);

    // Double Click
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        // If already editing text, ignore double-click to preserve cursor position
        if (editingTextId) return;

        const pos = getPointerPos(e);
        const worldPos = toWorldPos(pos, transformRef.current);

        if (tool === 'cursor') {
            // Check if clicked text to enter edit mode
            if (props.textsRef.current.length > 0) {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    for (let i = props.textsRef.current.length - 1; i >= 0; i--) {
                        const textElement = props.textsRef.current[i];
                        // Assuming calculateTextBounds is available in this scope
                        const bounds = calculateTextBounds(ctx, textElement);
                        if (worldPos.x >= bounds.x && worldPos.x <= bounds.x + bounds.width &&
                            worldPos.y >= bounds.y && worldPos.y <= bounds.y + bounds.height) {

                            // Enter Edit Mode
                            props.cursorPositionRef.current = textElement.text.length; // Set cursor to end
                            props.setEditingTextId(textElement.id);
                            props.setEditingTextValue(textElement.text);
                            props.setEditingTextOriginalValue(textElement.text);
                            const { scale, offset } = transformRef.current;
                            props.setEditingTextPosition({
                                x: textElement.x * scale + offset.x,
                                y: textElement.y * scale + offset.y
                            });

                            // Clear selection to avoid artifacts
                            props.selectedTextsRef.current.clear();
                            props.selectionBoundsRef.current = null;

                            // Keep cursor tool - editing works with any tool
                            // props.setTool('text'); // Removed - tool stays on cursor
                            props.isSwitchingTextRef.current = true;
                            props.isCreatingTextRef.current = false;
                            props.scheduleRedraw();
                            return;
                        }
                    }
                }
            }
        }
    }, [tool, editingTextId, transformRef, canvasRef, props.textsRef, props.setEditingTextId, props.setEditingTextValue, props.setEditingTextOriginalValue, props.setEditingTextPosition, props.setTool, props.scheduleRedraw, props.isSwitchingTextRef, props.isCreatingTextRef, getPointerPos]);

    return {
        handleStart,
        handleMove,
        handleEnd,
        handleDoubleClick
    };
};
