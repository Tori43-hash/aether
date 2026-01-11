// Geometry utility functions for Whiteboard

import { Point, Stroke, TextElement, TransformState, TextBounds, SelectionBounds } from 'entities/whiteboard';

/**
 * Convert screen coordinates to world coordinates
 */
export const toWorldPos = (pos: Point, transform: TransformState): Point => {
    const { scale, offset } = transform;
    return {
        x: (pos.x - offset.x) / scale,
        y: (pos.y - offset.y) / scale
    };
};

/**
 * Convert world coordinates to screen coordinates
 */
export const toScreenPos = (pos: Point, transform: TransformState): Point => {
    const { scale, offset } = transform;
    return {
        x: pos.x * scale + offset.x,
        y: pos.y * scale + offset.y
    };
};

/**
 * Calculate text bounds consistently
 */
export const calculateTextBounds = (ctx: CanvasRenderingContext2D, text: TextElement): TextBounds => {
    ctx.font = `${text.fontStyle || 'normal'} ${text.fontWeight || 'normal'} ${text.fontSize}px ${text.fontFamily || 'sans-serif'}`;
    const lines = text.text.split('\n');
    const lineHeight = text.fontSize * 1.2;

    // Count lines for height calculation
    // If the last line is empty (trailing newline), don't count it as a full line
    const effectiveLineCount = lines.length > 0 && lines[lines.length - 1] === ''
        ? lines.length - 1
        : lines.length;

    // Height: from top of first line to bottom of last line
    // Use at least 1 line for empty text
    const height = (Math.max(1, effectiveLineCount) - 1) * lineHeight + text.fontSize;

    let width = 0;
    lines.forEach(line => {
        width = Math.max(width, ctx.measureText(line).width);
    });

    // Proportional padding (30% of font size, min 4px)
    const padding = Math.max(4, text.fontSize * 0.3);

    return {
        x: text.x - padding,
        y: text.y - padding,
        width: width + padding * 2,
        height: height + padding * 2,
        contentWidth: width,
        contentHeight: height,
        padding
    };
};

/**
 * Check if a point (with radius) intersects with a stroke
 */
export const isPointIntersectingStroke = (point: Point, radius: number, stroke: Stroke): boolean => {
    if (stroke.points.length === 0) return false;

    const eraserRadius = radius / 2;
    const strokeRadius = stroke.size / 2;
    const totalRadius = eraserRadius + strokeRadius;

    // For single point stroke, check distance
    if (stroke.points.length === 1) {
        const strokePoint = stroke.points[0];
        const dx = point.x - strokePoint.x;
        const dy = point.y - strokePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= totalRadius;
    }

    // For multi-point stroke, check distance to each segment
    for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];

        // Vector from p1 to p2
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const segmentLength = Math.sqrt(dx * dx + dy * dy);

        if (segmentLength === 0) {
            // Points are the same, check distance
            const distX = point.x - p1.x;
            const distY = point.y - p1.y;
            const distance = Math.sqrt(distX * distX + distY * distY);
            if (distance <= totalRadius) return true;
            continue;
        }

        // Vector from p1 to point
        const toPointX = point.x - p1.x;
        const toPointY = point.y - p1.y;

        // Project point onto segment
        const t = Math.max(0, Math.min(1, (toPointX * dx + toPointY * dy) / (segmentLength * segmentLength)));

        // Closest point on segment
        const closestX = p1.x + t * dx;
        const closestY = p1.y + t * dy;

        // Distance from point to closest point on segment
        const distX = point.x - closestX;
        const distY = point.y - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance <= totalRadius) return true;
    }

    return false;
};

/**
 * Check if stroke intersects with selection rectangle
 */
export const isStrokeInSelection = (stroke: Stroke, selectionStart: Point, selectionEnd: Point): boolean => {
    if (stroke.points.length === 0) return false;

    // Calculate bounding box of selection
    const selMinX = Math.min(selectionStart.x, selectionEnd.x);
    const selMaxX = Math.max(selectionStart.x, selectionEnd.x);
    const selMinY = Math.min(selectionStart.y, selectionEnd.y);
    const selMaxY = Math.max(selectionStart.y, selectionEnd.y);

    // Calculate bounding box of stroke
    let strokeMinX = Infinity;
    let strokeMaxX = -Infinity;
    let strokeMinY = Infinity;
    let strokeMaxY = -Infinity;

    for (const point of stroke.points) {
        strokeMinX = Math.min(strokeMinX, point.x);
        strokeMaxX = Math.max(strokeMaxX, point.x);
        strokeMinY = Math.min(strokeMinY, point.y);
        strokeMaxY = Math.max(strokeMaxY, point.y);
    }

    // Add stroke size to bounding box
    const halfSize = stroke.size / 2;
    strokeMinX -= halfSize;
    strokeMaxX += halfSize;
    strokeMinY -= halfSize;
    strokeMaxY += halfSize;

    // Check if bounding boxes intersect
    return !(strokeMaxX < selMinX || strokeMinX > selMaxX || strokeMaxY < selMinY || strokeMinY > selMaxY);
};

/**
 * Check if click is on a resize handle
 * Returns handle index (0-3) or null
 */
export const getHandleAtPoint = (
    worldPos: Point,
    bounds: SelectionBounds,
    scale: number
): number | null => {
    const { minX, minY, maxX, maxY } = bounds;
    const handleSize = 8;
    const handleRadius = handleSize / scale; // Convert to world coordinates

    const corners = [
        { x: minX, y: minY }, // 0: top-left
        { x: maxX, y: minY }, // 1: top-right
        { x: maxX, y: maxY }, // 2: bottom-right
        { x: minX, y: maxY } // 3: bottom-left
    ];

    for (let i = 0; i < corners.length; i++) {
        const corner = corners[i];
        const dx = worldPos.x - corner.x;
        const dy = worldPos.y - corner.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= handleRadius) {
            return i;
        }
    }

    return null;
};

/**
 * Calculate selection bounds from selected strokes and texts
 */
export const calculateSelectionBounds = (
    strokes: Stroke[],
    selectedStrokeIndices: Set<number>,
    texts: TextElement[],
    selectedTextIds: Set<string>,
    ctx: CanvasRenderingContext2D | null
): SelectionBounds | null => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasSelection = false;

    selectedStrokeIndices.forEach(index => {
        const stroke = strokes[index];
        if (!stroke || stroke.points.length === 0) return;
        hasSelection = true;
        const halfSize = stroke.size / 2;

        stroke.points.forEach(point => {
            minX = Math.min(minX, point.x - halfSize);
            minY = Math.min(minY, point.y - halfSize);
            maxX = Math.max(maxX, point.x + halfSize);
            maxY = Math.max(maxY, point.y + halfSize);
        });
    });

    selectedTextIds.forEach(id => {
        const text = texts.find(t => t.id === id);
        if (!text) return;
        hasSelection = true;

        if (ctx) {
            const bounds = calculateTextBounds(ctx, text);
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }
    });

    if (hasSelection && minX !== Infinity) {
        return { minX, minY, maxX, maxY };
    }
    return null;
};

/**
 * Get English key from keyboard code (works regardless of keyboard layout)
 */
export const getEnglishKeyFromCode = (code: string): string => {
    // Handle letter keys (KeyA, KeyB, etc.)
    if (code.startsWith('Key')) {
        return code.substring(3).toLowerCase();
    }
    // Handle digit keys (Digit1, Digit2, etc.)
    if (code.startsWith('Digit')) {
        return code.substring(5);
    }
    // Handle special keys - convert to lowercase and use common names
    const specialKeys: Record<string, string> = {
        'Space': 'space',
        'Enter': 'enter',
        'Escape': 'escape',
        'Tab': 'tab',
        'Backspace': 'backspace',
        'Delete': 'delete',
        'ArrowUp': 'arrowup',
        'ArrowDown': 'arrowdown',
        'ArrowLeft': 'arrowleft',
        'ArrowRight': 'arrowright',
        'Home': 'home',
        'End': 'end',
        'PageUp': 'pageup',
        'PageDown': 'pagedown',
        'Insert': 'insert',
        'F1': 'f1', 'F2': 'f2', 'F3': 'f3', 'F4': 'f4',
        'F5': 'f5', 'F6': 'f6', 'F7': 'f7', 'F8': 'f8',
        'F9': 'f9', 'F10': 'f10', 'F11': 'f11', 'F12': 'f12',
    };
    return specialKeys[code] || code.toLowerCase();
};
