import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WhiteboardTextToolbarContainer } from './WhiteboardTextToolbarContainer';

// Types from entities
import {
  Point,
  Stroke,
  TextElement,
  ToolType,
  TransformState,
} from 'entities/whiteboard';

// Utils
import { calculateTextBounds } from '../lib/utils/geometry';

// Hooks
import { useWhiteboardSettings } from '../model/hooks/useWhiteboardSettings';
import { useWhiteboardHistory } from '../model/hooks/useWhiteboardHistory';
import { useWhiteboardTransform } from '../model/hooks/useWhiteboardTransform';
import { useWhiteboardSelection } from '../model/hooks/useWhiteboardSelection';
import { useWhiteboardEvents } from '../model/hooks/useWhiteboardEvents';
import { useWhiteboardShortcuts } from '../model/hooks/useWhiteboardShortcuts';
import { useWhiteboardCanvas } from '../model/hooks/useWhiteboardCanvas';

// Sub-components
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { WhiteboardSettingsModal } from 'widgets/whiteboard-settings';
import { DisplayInfo } from './DisplayInfo';
import { WhiteboardTextEditor } from './WhiteboardTextEditor';

// Utils for QuadTree
import { QuadTree, getStrokeBounds } from '../lib/utils/QuadTree';


interface WhiteboardCanvasProps {
  className?: string;
  initialData?: {
    strokes: Stroke[];
    texts: TextElement[];
    transform?: TransformState;
  };
  onStateChange?: (data: {
    strokes: Stroke[];
    texts: TextElement[];
    transform: TransformState;
  }) => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  className = "",
  initialData,
  onStateChange,
}) => {
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

  // Use canvas rendering hook
  const { scheduleRedraw, isScheduledRef, requestRef } = useWhiteboardCanvas({
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
  });

  // Sync scheduleRedraw to ref for use in hooks that need to be defined before scheduleRedraw
  useEffect(() => {
    scheduleRedrawRef.current = scheduleRedraw;
  }, [scheduleRedraw]);

  // Load initial data on mount
  useEffect(() => {
    if (initialData) {
      strokesRef.current = [...initialData.strokes];
      textsRef.current = [...initialData.texts];
      if (initialData.transform) {
        transformRef.current = { ...initialData.transform };
      }

      // Rebuild QuadTree with initial data
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

      scheduleRedraw();
    }
  }, []); // Only run on mount

  // Report state changes to parent
  useEffect(() => {
    if (onStateChange) {
      // Debounce state changes using interval
      const interval = setInterval(() => {
        onStateChange({
          strokes: strokesRef.current,
          texts: textsRef.current,
          transform: transformRef.current,
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [onStateChange]);


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
      <WhiteboardTextToolbarContainer
        editingTextId={editingTextId}
        textsRef={textsRef}
        selectedTextsRef={selectedTextsRef}
        selectedStrokesRef={selectedStrokesRef}
        strokesRef={strokesRef}
        quadTreeRef={quadTreeRef}
        canvasRef={canvasRef}
        containerRef={containerRef}
        transformRef={transformRef}
        textSelectionStartRef={textSelectionStartRef}
        textSelectionEndRef={textSelectionEndRef}
        textEditableRef={textEditableRef}
        editingTextIdRef={editingTextIdRef}
        selectionBoundsRef={selectionBoundsRef}
        isInteractionHidden={isInteractionHidden}
        saveToHistory={saveToHistory}
        scheduleRedraw={scheduleRedraw}
      />
    </div>
  );
};

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
