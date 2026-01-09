import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TextToolbar } from './TextToolbar';

// Types
import {
  Point,
  Stroke,
  TextElement,
  ShortcutConfig,
  Shortcuts,
  SelectionBounds,
  TransformState,
  ToolType,
} from '../lib/types';

// Constants
import { DEFAULT_SHORTCUTS, TOOLBAR_COLORS, DEFAULT_BRUSH_SIZE, DEFAULT_FONT_SIZE } from '../lib/constants';

// Utils
import {
  toWorldPos,
  calculateTextBounds,
  isPointIntersectingStroke,
  isStrokeInSelection,
  getHandleAtPoint,
  calculateSelectionBounds,
  getEnglishKeyFromCode,
} from '../lib/utils/geometry';
import {
  drawStroke,
  drawBackground,
  drawTextElement,
  drawPhantomText,
  drawSelectionRect,
  drawSelectionBounds,
} from '../lib/utils/canvas';
import {
  scaleStrokes,
  scaleTexts,
  moveStrokes,
  moveTexts,
  recalculateBoundsAfterScale,
  updateStrokeIndicesAfterDeletion,
  deepCopyStrokes,
  deepCopyTexts,
} from '../lib/utils/selection';
import {
  applyStyleToRange,
  getFullText,
  updateRunsFromText,
} from '../lib/utils/richText';

import { useWhiteboardSettings } from '../model/hooks/useWhiteboardSettings';
import { useWhiteboardHistory } from '../model/hooks/useWhiteboardHistory';
import { useWhiteboardTransform } from '../model/hooks/useWhiteboardTransform';
import { useWhiteboardSelection } from '../model/hooks/useWhiteboardSelection';
import { useWhiteboardEvents } from '../model/hooks/useWhiteboardEvents';

// Sub-components
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { WhiteboardSettingsModal } from './WhiteboardSettingsModal';
import { DisplayInfo } from './DisplayInfo';
import { WhiteboardTextEditor } from './WhiteboardTextEditor';
import { useWhiteboardShortcuts } from '../model/hooks/useWhiteboardShortcuts';
import { QuadTree, getStrokeBounds } from '../lib/utils/QuadTree';


interface WhiteboardProps {
  className?: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);

  // QuadTree for spatial indexing of strokes
  const quadTreeRef = useRef<QuadTree>(new QuadTree({ minX: -100000, minY: -100000, maxX: 100000, maxY: 100000 }));

  const currentStrokeRef = useRef<Stroke | null>(null);
  const transformRef = useRef({ scale: 1, offset: { x: 0, y: 0 } });
  const scheduleRedrawRef = useRef(() => { });

  const textsRef = useRef<TextElement[]>([]);

  // useWhiteboardHistory hook replacement
  const {
    undoCount,
    redoCount,
    saveToHistory,
    handleUndo,
    handleRedo,
    historyRef,
    redoHistoryRef
  } = useWhiteboardHistory({
    strokesRef,
    textsRef,
    onStateRestored: () => {
      // Rebuild QuadTree after history restore
      quadTreeRef.current.clear();
      strokesRef.current.forEach(stroke => {
        quadTreeRef.current.insert({
          item: stroke,
          bounds: getStrokeBounds(stroke)
        });
      });

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        textsRef.current.forEach(text => {
          const b = calculateTextBounds(ctx, text);
          quadTreeRef.current.insert({
            item: text,
            bounds: { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height }
          });
        });
      }

      // Callback to schedule redraw after undo/redo
      // Will be connected below
      scheduleRedraw();
    }
  });

  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(3);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [editingTextOriginalValue, setEditingTextOriginalValue] = useState('');
  const [editingTextPosition, setEditingTextPosition] = useState<Point | null>(null);
  const [fontSize, setFontSize] = useState(16);


  const textEditableRef = useRef<HTMLDivElement>(null);
  const editingTextIdRef = useRef<string | null>(editingTextId);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const fontSizeRef = useRef(fontSize);

  // Sync ref with state to allow stable redraw function
  React.useLayoutEffect(() => {
    editingTextIdRef.current = editingTextId;
    toolRef.current = tool;
    colorRef.current = color;
    fontSizeRef.current = fontSize;
  }, [editingTextId, tool, color, fontSize]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const cursorPositionRef = useRef(0);
  const textSelectionStartRef = useRef<number | null>(null);
  const textSelectionEndRef = useRef<number | null>(null);
  const isCursorVisibleRef = useRef(true);
  const isSwitchingTextRef = useRef(false);
  const isCreatingTextRef = useRef(false);

  // useWhiteboardSettings hook replacement
  const {
    shortcuts,
    setShortcuts,
    showCoordinates,
    setShowCoordinates,
    showZoom,
    setShowZoom,
    zoomSpeed,
    setZoomSpeed,
    displayPosition,
    setDisplayPosition,
    displaySize,
    setDisplaySize,
    backgroundType,
    setBackgroundType,
    isUIHidden,
    setIsUIHidden,
  } = useWhiteboardSettings();

  const [mousePosition, setMousePosition] = useState<Point | null>(null);

  // Callback ref for View Updates (Pan/Zoom) to sync Mouse/Drag
  const onViewUpdatedRef = useRef<() => void>(() => { });

  const { currentZoom, setCurrentZoom, resetView } = useWhiteboardTransform({
    canvasRef,
    transformRef,
    zoomSpeed,
    scheduleRedrawRef,
    showZoom,
    onViewUpdatedRef
  });

  const [isInteractionHidden, setIsInteractionHidden] = useState(false);
  const [selectionTick, setSelectionTick] = useState(0);

  // Hoisted Refs for Redraw Access
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<Point | null>(null);
  const selectionEndRef = useRef<Point | null>(null);




  const {
    selectedStrokesRef,
    selectedTextsRef,
    selectionBoundsRef,
    clearSelection
  } = useWhiteboardSelection();


  // Phantom text ref
  const phantomTextPosRef = useRef<Point | null>(null);



  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get actual canvas dimensions (in device pixels)
    // Recalculate to handle browser zoom correctly
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

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke, false);
    });
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }

    // Update text input position if editing (only if position changed significantly)
    if (editingTextIdRef.current && editingTextPosition) {
      const textElement = textsRef.current.find(t => t.id === editingTextIdRef.current);
      if (textElement) {
        const { scale, offset } = transformRef.current;
        const newX = textElement.x * scale + offset.x;
        const newY = textElement.y * scale + offset.y;
        // Only update if position changed significantly (more than 1px)
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

    // Reset transform to identity for selection overlays which handle their own coordinate transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw selection rectangle if selecting
    if (isSelectingRef.current && selectionStartRef.current && selectionEndRef.current) {
      drawSelectionRect(ctx, selectionStartRef.current, selectionEndRef.current, transformRef.current);
    }

    if (selectionBoundsRef.current) {
      drawSelectionBounds(ctx, selectionBoundsRef.current, transformRef.current);
    }

    // I will restore the needed refs here (isSelectingRef, selectionStartRef, selectionEndRef, isDrawingRef, isPanningRef, etc.)
  }, [backgroundType]);

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

  // Sync scheduleRedraw to ref for use in hooks that need to be defined before scheduleRedraw
  useEffect(() => {
    scheduleRedrawRef.current = scheduleRedraw;
  }, [scheduleRedraw]);

  const finishEditing = useCallback(() => {
    if (!editingTextId) return;

    const textElement = textsRef.current.find(t => t.id === editingTextId);
    if (textElement && textEditableRef.current) {
      const finalText = textEditableRef.current.textContent || '';
      if (finalText.trim() === '') {
        // Remove empty text
        if (!isCreatingTextRef.current) {
          saveToHistory();
        }

        // Remove from QuadTree
        quadTreeRef.current.remove(textElement);

        textsRef.current = textsRef.current.filter(t => t.id !== editingTextId);
      } else {
        // Text changed
        // Remove old bounds from QuadTree
        quadTreeRef.current.remove(textElement);

        textElement.text = finalText;

        // Insert new bounds into QuadTree
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          const b = calculateTextBounds(ctx, textElement);
          quadTreeRef.current.insert({
            item: textElement,
            bounds: { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height }
          });
        }

        // Save history when text is edited, but skip if it's a new text creation
        if (!isCreatingTextRef.current) {
          saveToHistory();
        }
      }
    }

    setEditingTextId(null);
    setEditingTextValue('');
    setEditingTextOriginalValue('');
    setEditingTextPosition(null);
    isCreatingTextRef.current = false;
    isSwitchingTextRef.current = false;
    if (tool === 'text') {
      setTool('cursor');
    }
    // Reset canvas cursor to default
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
    scheduleRedraw();
  }, [editingTextId, saveToHistory, scheduleRedraw, tool]);

  const clearCanvas = useCallback(() => {
    if (editingTextId) {
      finishEditing();
    }
    // Save current state to history before clearing
    saveToHistory();
    strokesRef.current = [];
    textsRef.current = [];

    // Clear editing state (handled by finishEditing if active, but ensure reset here too)
    if (!editingTextId) {
      setEditingTextId(null);
      setEditingTextValue('');
      setEditingTextOriginalValue('');
      setEditingTextPosition(null);
      isCreatingTextRef.current = false;
    }

    scheduleRedraw();
  }, [scheduleRedraw, saveToHistory, finishEditing, editingTextId]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const { width, height } = container.getBoundingClientRect();
      // Handle high DPI
      const dpr = window.devicePixelRatio || 1;
      const newWidth = width * dpr;
      const newHeight = height * dpr;

      // Only update if dimensions changed to avoid clearing canvas unnecessarily
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      scheduleRedraw();
    };

    window.addEventListener('resize', handleResize);
    // Initial resize
    handleResize();

    // Observer for container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [scheduleRedraw]);

  // Sync currentZoom with transformRef when showZoom is enabled
  useEffect(() => {
    if (showZoom) {
      setCurrentZoom(transformRef.current.scale);
    }
  }, [showZoom]);

  // Set initial content in editable div when editing starts
  useEffect(() => {
    if (editingTextId && textEditableRef.current) {
      textEditableRef.current.textContent = editingTextValue;
    }
  }, [editingTextId, editingTextValue]);

  // Focus and select text when editing starts
  useEffect(() => {
    if (editingTextId && textEditableRef.current) {
      // Clear any previous text selection
      textSelectionStartRef.current = null;
      textSelectionEndRef.current = null;

      // Use setTimeout to ensure the element is fully mounted and ready for focus
      // and to avoid conflict with any ongoing mouse events
      const timer = setTimeout(() => {
        if (textEditableRef.current) {
          textEditableRef.current.focus();
          // Select all text to allow immediate overwrite if creating new text,
          // otherwise place cursor at the end for appending
          const range = document.createRange();
          range.selectNodeContents(textEditableRef.current);
          if (!isCreatingTextRef.current) {
            range.collapse(false); // Collapse to end for existing text
          }
          // For new text: keep DOM selection of "Add Text" so first keystroke replaces it
          // Canvas selection refs stay null (cleared above)
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);

          cursorPositionRef.current = isCreatingTextRef.current ? 0 : (textEditableRef.current.textContent?.length || 0);
          isCursorVisibleRef.current = true;

          // Keep isCreatingTextRef true for a bit longer to ignore async onSelect events
          // that would otherwise set canvas selection refs
          setTimeout(() => {
            isCreatingTextRef.current = false;
            // Final cleanup - clear any selection that might have snuck in
            textSelectionStartRef.current = null;
            textSelectionEndRef.current = null;
            scheduleRedraw();
          }, 50);
        }
      }, 10);

      return () => clearTimeout(timer);
    }
  }, [editingTextId, scheduleRedraw]);

  // Update text input position when transform changes (using redraw)
  // This is handled in the redraw function and scheduleRedraw calls

  // Clear selection when switching from cursor to pen or eraser
  useEffect(() => {
    if (tool !== 'cursor' && (selectedStrokesRef.current.size > 0 || selectedTextsRef.current.size > 0)) {
      selectedStrokesRef.current.clear();
      selectedTextsRef.current.clear();
      selectionBoundsRef.current = null;
      scheduleRedraw();
    }

    // Clear phantom text when changing tools
    phantomTextPosRef.current = null;
    scheduleRedraw();

    // Update cursor when tool changes
    const canvas = canvasRef.current;
    if (canvas) {
      if (tool === 'cursor') {
        canvas.style.cursor = 'default';
      } else if (tool === 'text') {
        canvas.style.cursor = 'crosshair';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    }
  }, [tool, scheduleRedraw]);

  // Blinking cursor effect
  useEffect(() => {
    if (!editingTextId) return;

    // Reset cursor visibility when editing starts or text changes
    isCursorVisibleRef.current = true;

    // Set canvas cursor to text immediately when editing starts
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'text';
    }

    scheduleRedraw();

    const interval = setInterval(() => {
      isCursorVisibleRef.current = !isCursorVisibleRef.current;
      scheduleRedraw();
    }, 500);

    return () => clearInterval(interval);
  }, [editingTextId, scheduleRedraw]);

  // Handle shortcut key capture state
  // Convert keyboard code to English letter (works regardless of keyboard layout)

  // Keyboard Handler
  // Use Shortcuts Hook
  useWhiteboardShortcuts({
    shortcuts,
    isSettingsOpen,
    setIsSettingsOpen,
    setIsUIHidden,
    handleUndo,
    handleRedo,
    clearCanvas,
    saveToHistory,
    tool,
    setTool,
    editingTextId,
    strokesRef,
    textsRef,
    selectedStrokesRef,
    selectedTextsRef,
    selectionBoundsRef,
    setSelectionTick,
    scheduleRedraw,
    isSwitchingTextRef,
    isCreatingTextRef,
    setEditingTextId,
    setEditingTextValue,
    setEditingTextOriginalValue,
    setEditingTextPosition,
    transformRef,
    cursorPositionRef,
    textSelectionStartRef,
    textSelectionEndRef,
    textEditableRef
  });

  // Refs needed for redraw() that were previously deleted but are now restored for scope visibility
  const isScheduledRef = useRef(false);
  const requestRef = useRef<number | null>(null);

  // Use the hook
  const {
    handleStart,
    handleMove,
    handleEnd,
    handleDoubleClick
  } = useWhiteboardEvents({
    canvasRef,
    containerRef,
    transformRef,
    strokesRef,
    textsRef,
    selectedStrokesRef,
    selectedTextsRef,
    selectionBoundsRef,
    tool,
    setTool,
    color,
    size,
    fontSize,
    setFontSize,
    editingTextId,
    setEditingTextId,
    setEditingTextValue,
    setEditingTextOriginalValue,
    setEditingTextPosition,
    cursorPositionRef,
    isCursorVisibleRef,
    isSwitchingTextRef,
    isCreatingTextRef,
    saveToHistory,
    scheduleRedraw,
    setIsInteractionHidden,
    setSelectionTick,
    setMousePosition,
    showCoordinates,
    phantomTextPosRef,
    currentStrokeRef,
    isUIHidden,
    finishEditing,
    isSelectingRef,
    selectionStartRef,
    selectionEndRef,
    textEditableRef,
    textSelectionStartRef,
    textSelectionEndRef,
    onViewUpdatedRef,
    quadTreeRef
  });

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-white overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block touch-none w-full h-full"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={(e) => {
          handleEnd();
          if (showCoordinates) {
            setMousePosition(null);
          }
          phantomTextPosRef.current = null;
          scheduleRedraw();
        }}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onDoubleClick={handleDoubleClick}
      />

      {/* Toolbar */}
      {!isUIHidden && (
        <WhiteboardToolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          size={size}
          onSizeChange={setSize}
          undoCount={undoCount}
          redoCount={redoCount}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={clearCanvas}
          onResetView={resetView}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Display Info (Coordinates & Zoom) */}
      {!isUIHidden && (
        <DisplayInfo
          showCoordinates={showCoordinates}
          showZoom={showZoom}
          mousePosition={mousePosition}
          currentZoom={currentZoom}
          displayPosition={displayPosition}
          displaySize={displaySize}
        />
      )}

      {/* Settings Modal */}
      <WhiteboardSettingsModal
        isOpen={!isUIHidden && isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        shortcuts={shortcuts}
        onShortcutChange={setShortcuts}
        isUIHidden={isUIHidden}
        showCoordinates={showCoordinates}
        onShowCoordinatesChange={setShowCoordinates}
        showZoom={showZoom}
        onShowZoomChange={setShowZoom}
        backgroundType={backgroundType}
        onBackgroundTypeChange={setBackgroundType}
        zoomSpeed={zoomSpeed}
        onZoomSpeedChange={setZoomSpeed}
        displayPosition={displayPosition}
        onDisplayPositionChange={setDisplayPosition}
        displaySize={displaySize}
        onDisplaySizeChange={setDisplaySize}
      />

      {/* Text Editable for editing directly on canvas */}
      {editingTextId && editingTextPosition && (() => {
        const textElement = textsRef.current.find(t => t.id === editingTextId);
        if (!textElement) return null;

        return (
          <WhiteboardTextEditor
            textElement={textElement}
            editingTextId={editingTextId}
            editingTextOriginalValue={editingTextOriginalValue}
            setEditingTextId={setEditingTextId}
            setEditingTextValue={setEditingTextValue}
            setEditingTextOriginalValue={setEditingTextOriginalValue}
            setEditingTextPosition={setEditingTextPosition}
            finishEditing={finishEditing}
            scheduleRedraw={scheduleRedraw}
            cursorPositionRef={cursorPositionRef}
            textSelectionStartRef={textSelectionStartRef}
            textSelectionEndRef={textSelectionEndRef}
            isCursorVisibleRef={isCursorVisibleRef}
            textEditableRef={textEditableRef}
            editingTextValue={editingTextValue}
            isCreatingTextRef={isCreatingTextRef}
            onTextChange={() => setSelectionTick(prev => prev + 1)}
          />
        );
      })()}

      {/* Text Toolbar */}
      {(editingTextId || (selectedTextsRef.current.size === 1 && selectedStrokesRef.current.size === 0)) &&
        !isInteractionHidden && (
          (() => {
            const targetId = editingTextId || Array.from(selectedTextsRef.current)[0];
            const targetText = textsRef.current.find(t => t.id === targetId);

            if (targetText) {
              const { scale, offset } = transformRef.current;

              // Calculate center position based on text bounds
              let boundsWidth = 0;
              let boundsHeight = 0;
              let boundsX = targetText.x;
              let boundsY = targetText.y;
              const canvas = canvasRef.current;
              const container = containerRef.current;
              if (canvas && container) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const bounds = calculateTextBounds(ctx, targetText);
                  boundsWidth = bounds.width;
                  boundsHeight = bounds.height;
                  boundsX = bounds.x;
                  boundsY = bounds.y;
                }
              }

              // Get container position on the page
              const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 };

              // Convert bounds to screen coordinates (relative to viewport)
              // The formula (coord * scale + offset) gives canvas device pixels
              // Divide by DPR to get CSS pixels, then add container position
              const dpr = window.devicePixelRatio || 1;
              const screenBoundsX = (boundsX * scale + offset.x) / dpr + containerRect.left;
              const screenBoundsY = (boundsY * scale + offset.y) / dpr + containerRect.top;

              // Calculate screen position of text bottom edge
              const textHeight = boundsHeight * scale / dpr;
              const screenBoundsBottom = screenBoundsY + textHeight;

              // Center X is at the middle of the text bounds
              const centerX = screenBoundsX + (boundsWidth * scale / dpr) / 2;

              // Smart positioning - avoid overlapping with canvas menu and app menu
              const toolbarHeight = 50; // Approximate toolbar height
              const toolbarWidth = 420; // Approximate toolbar width
              const toolbarGap = 8; // Gap between toolbar and text
              const screenPadding = 15; // Minimum padding from screen edges
              const topMenuThreshold = 100; // Canvas toolbar area threshold (increased for safety)
              const bottomMenuThreshold = window.innerHeight - 85; // App navigation bar threshold

              // === Horizontal positioning with boundary checks ===
              let toolbarX = centerX;
              const leftBoundary = toolbarWidth / 2 + screenPadding;
              const rightBoundary = window.innerWidth - toolbarWidth / 2 - screenPadding;

              // Clamp horizontal position to stay within screen bounds
              if (toolbarX < leftBoundary) {
                toolbarX = leftBoundary;
              } else if (toolbarX > rightBoundary) {
                toolbarX = rightBoundary;
              }

              // === Vertical positioning with boundary checks ===
              let toolbarY: number;
              const preferredTopY = screenBoundsY - toolbarHeight - toolbarGap; // Position above text
              const preferredBottomY = screenBoundsBottom + toolbarGap; // Position below text

              // Check if toolbar would overlap with top menu when positioned above
              if (preferredTopY < topMenuThreshold) {
                // Position below text instead
                toolbarY = preferredBottomY;

                // If even below position would go off bottom of screen, keep it at bottom threshold
                if (toolbarY + toolbarHeight > bottomMenuThreshold) {
                  toolbarY = bottomMenuThreshold - toolbarHeight;
                }
              } else {
                // Normal position - above text
                toolbarY = preferredTopY;

                // Extra safety check: ensure toolbar doesn't go below bottom menu
                if (toolbarY + toolbarHeight > bottomMenuThreshold) {
                  toolbarY = bottomMenuThreshold - toolbarHeight;
                }
              }

              // Final safety: ensure toolbar Y is never above the top menu threshold
              if (toolbarY < topMenuThreshold) {
                toolbarY = topMenuThreshold;
              }

              // Wrap update in a function to trigger re-render
              const handleUpdate = (updates: any) => {
                const updatedTexts = textsRef.current.map(t =>
                  t.id === targetId ? { ...t, ...updates } : t
                );
                textsRef.current = updatedTexts;

                // Update QuadTree and Selection Bounds
                const updatedText = updatedTexts.find(t => t.id === targetId);
                if (updatedText) {
                  // Remove old bounds from QuadTree (we need the old object or just search by ID if possible, but QuadTree needs object ref or bounds)
                  // Since we replaced the array, the old object reference in QuadTree is stale but valid for removal if we had it.
                  // However, our QuadTree implementation likely relies on the item reference.
                  // Let's remove the *old* item. We can find it in the *previous* textsRef (which we just replaced, wait).
                  // Actually, `textsRef.current` was just updated.
                  // We need to use `targetText` (which is the old version before map) to remove it.
                  quadTreeRef.current.remove(targetText);

                  // Calculate new bounds
                  const cvs = canvasRef.current;
                  if (cvs) {
                    const ctx = cvs.getContext('2d');
                    if (ctx) {
                      const newBounds = calculateTextBounds(ctx, updatedText);
                      quadTreeRef.current.insert({
                        item: updatedText,
                        bounds: { minX: newBounds.x, minY: newBounds.y, maxX: newBounds.x + newBounds.width, maxY: newBounds.y + newBounds.height }
                      });
                    }
                  }

                  // If this text was selected, update selection bounds
                  if (selectedTextsRef.current.has(targetId)) {
                    // We need to pass the *new* text objects to calculateSelectionBounds
                    // calculateSelectionBounds takes (strokes, selectedStrokeIndices, texts, selectedTextIds, ctx)
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

                // Also update editing state if we are editing
                if (editingTextIdRef.current === targetId) {
                  // Force update local state if needed, but mainly we just need to redraw

                  // Restore focus to text editor (needed if toolbar interaction stole it, e.g. Select)
                  if (textEditableRef.current) {
                    textEditableRef.current.focus();
                  }
                }

                saveToHistory();
                scheduleRedraw();

                // Force re-render of component to update Toolbar props


              };

              // Handle applying style to a selection range or entire text
              const handleStyleApply = (style: 'bold' | 'italic' | 'strikethrough') => {
                const selStart = textSelectionStartRef.current;
                const selEnd = textSelectionEndRef.current;
                const hasSelection = selStart != null && selEnd != null && selStart !== selEnd;

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
                const updatedTexts = textsRef.current.map(t =>
                  t.id === targetId ? {
                    ...t,
                    runs: newRuns,
                    text: getFullText(newRuns)
                  } : t
                );
                textsRef.current = updatedTexts;

                // Update QuadTree
                quadTreeRef.current.remove(targetText);
                const cvs = canvasRef.current;
                if (cvs) {
                  const ctx = cvs.getContext('2d');
                  if (ctx) {
                    const updatedText = updatedTexts.find(t => t.id === targetId);
                    if (updatedText) {
                      const newBounds = calculateTextBounds(ctx, updatedText);
                      quadTreeRef.current.insert({
                        item: updatedText,
                        bounds: { minX: newBounds.x, minY: newBounds.y, maxX: newBounds.x + newBounds.width, maxY: newBounds.y + newBounds.height }
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
              };

              return (
                <TextToolbar
                  text={targetText}
                  onChange={handleUpdate}
                  position={{ x: toolbarX, y: toolbarY }} // Positioned with boundary checks
                  onClose={() => { }}
                  selectionStart={textSelectionStartRef.current}
                  selectionEnd={textSelectionEndRef.current}
                  onStyleApply={handleStyleApply}
                />
              );
            }
            return null;
          })()
        )}
    </div>
  );
};

Whiteboard.displayName = 'Whiteboard';
