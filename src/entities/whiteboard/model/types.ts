// Whiteboard Domain Types

export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    points: Point[];
    color: string;
    size: number;
    tool: 'pen' | 'eraser';
}

export interface TextRun {
    text: string;
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
}

export interface TextElement {
    id: string;
    x: number;
    y: number;
    text: string; // computed from runs, kept for backward compatibility
    runs: TextRun[]; // rich text segments
    color: string;
    fontSize: number;
    fontFamily?: string;
    fontWeight?: string; // 'normal' | 'bold' - default for new text
    fontStyle?: string; // 'normal' | 'italic' - default for new text
    textDecoration?: string; // 'none' | 'line-through' | 'underline' - default
    link?: string;
    listType?: 'none' | 'bullet' | 'number';
}

// Partial update for TextElement (used in handleUpdate)
export interface TextElementUpdate {
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    link?: string;
    listType?: 'none' | 'bullet' | 'number';
}

export interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
}

export interface Shortcuts {
    undo: ShortcutConfig;
    redo: ShortcutConfig;
    pen: ShortcutConfig;
    eraser: ShortcutConfig;
    cursor: ShortcutConfig;
    text: ShortcutConfig;
    clear: ShortcutConfig;
    hideUI: ShortcutConfig;
}

export interface SelectionBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface TransformState {
    scale: number;
    offset: Point;
}

export interface TextBounds {
    x: number;
    y: number;
    width: number;
    height: number;
    contentWidth: number;
    contentHeight: number;
    padding: number;
}

export interface HistoryState {
    strokes: Stroke[];
    texts: TextElement[];
}

export type ToolType = 'pen' | 'eraser' | 'cursor' | 'text';
export type BackgroundType = 'solid' | 'grid' | 'dots';
export type DisplayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type DisplaySize = 'small' | 'medium' | 'large';
