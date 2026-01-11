// Canvas drawing utility functions

import { Point, Stroke, TextElement, TransformState, BackgroundType } from 'entities/whiteboard';
import { calculateTextBounds } from './geometry';

/**
 * Draw a single stroke on canvas
 */
export const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    isSelected: boolean = false
): void => {
    // Handle undefined or empty points (can happen with data from DB)
    if (!stroke.points || stroke.points.length === 0) return;

    if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
    }

    // If only one point, draw a circle (dot)
    if (stroke.points.length === 1) {
        const point = stroke.points[0];
        const radius = stroke.size / 2;

        // Draw selection highlight if selected
        if (isSelected) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.arc(point.x, point.y, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.fillStyle = stroke.tool === 'pen' ? stroke.color : '#FFFFFF';
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Draw selection highlight if selected
        if (isSelected) {
            ctx.beginPath();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = stroke.size + 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.3;

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            ctx.beginPath();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        }

        // Draw line for multiple points
        ctx.beginPath();
        ctx.strokeStyle = stroke.tool === 'pen' ? stroke.color : '#FFFFFF';
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
};

/**
 * Draw background grid or dots
 */
export const drawBackground = (
    ctx: CanvasRenderingContext2D,
    backgroundType: BackgroundType,
    transform: TransformState,
    canvasWidth: number,
    canvasHeight: number
): void => {
    if (backgroundType === 'solid') return;

    const { scale, offset } = transform;
    const gridSize = 20; // Grid size in world coordinates

    // Calculate visible world bounds
    const worldLeft = (-offset.x) / scale;
    const worldTop = (-offset.y) / scale;
    const worldRight = (canvasWidth - offset.x) / scale;
    const worldBottom = (canvasHeight - offset.y) / scale;

    // Add margin to ensure background covers entire visible area
    const margin = gridSize * 2;
    const gridLeft = Math.floor((worldLeft - margin) / gridSize) * gridSize;
    const gridTop = Math.floor((worldTop - margin) / gridSize) * gridSize;
    const gridRight = Math.ceil((worldRight + margin) / gridSize) * gridSize;
    const gridBottom = Math.ceil((worldBottom + margin) / gridSize) * gridSize;

    if (backgroundType === 'grid') {
        // Draw grid lines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = Math.max(0.5, 1 / scale);

        // Draw vertical lines
        for (let x = gridLeft; x <= gridRight; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, gridTop);
            ctx.lineTo(x, gridBottom);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = gridTop; y <= gridBottom; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gridLeft, y);
            ctx.lineTo(gridRight, y);
            ctx.stroke();
        }
    } else if (backgroundType === 'dots') {
        // Draw dot grid - optimized with fillRect (faster than arc)
        ctx.fillStyle = '#cbd5e1';

        // Calculate how many dots would be drawn with base grid size
        const baseDotsX = Math.ceil((gridRight - gridLeft) / gridSize);
        const baseDotsY = Math.ceil((gridBottom - gridTop) / gridSize);
        const totalBaseDots = baseDotsX * baseDotsY;

        // Limit max dots to ~10000 to prevent browser freeze on zoom out
        const maxDots = 10000;
        let effectiveGridSize = gridSize;

        if (totalBaseDots > maxDots) {
            // Increase grid step to reduce dot count
            const scaleFactor = Math.ceil(Math.sqrt(totalBaseDots / maxDots));
            effectiveGridSize = gridSize * scaleFactor;
        }

        // Dot size scales with zoom, minimum 1px for visibility
        const dotSize = Math.max(1, 2 / scale);
        const halfDot = dotSize / 2;

        // Recalculate grid bounds with effective grid size
        const effectiveGridLeft = Math.floor((worldLeft - margin) / effectiveGridSize) * effectiveGridSize;
        const effectiveGridTop = Math.floor((worldTop - margin) / effectiveGridSize) * effectiveGridSize;
        const effectiveGridRight = Math.ceil((worldRight + margin) / effectiveGridSize) * effectiveGridSize;
        const effectiveGridBottom = Math.ceil((worldBottom + margin) / effectiveGridSize) * effectiveGridSize;

        // Draw dots at grid intersections using fillRect (much faster than arc)
        for (let x = effectiveGridLeft; x <= effectiveGridRight; x += effectiveGridSize) {
            for (let y = effectiveGridTop; y <= effectiveGridBottom; y += effectiveGridSize) {
                ctx.fillRect(x - halfDot, y - halfDot, dotSize, dotSize);
            }
        }
    }
};

/**
 * Measure text width up to a given character position, considering runs styles
 */
const measureTextWithRuns = (
    ctx: CanvasRenderingContext2D,
    textElement: TextElement,
    startPos: number,
    endPos: number
): number => {
    const runs = textElement.runs || [{ text: textElement.text }];
    let width = 0;
    let charIndex = 0;

    // Find which line the endPos is on and get position within that line
    const fullText = textElement.text;
    const lines = fullText.split('\n');
    let targetLine = 0;
    let posInLine = endPos;
    let lineStartChar = 0;

    for (let i = 0; i < lines.length; i++) {
        if (lineStartChar + lines[i].length >= endPos) {
            targetLine = i;
            posInLine = endPos - lineStartChar;
            break;
        }
        lineStartChar += lines[i].length + 1;
        targetLine = i + 1;
    }

    // Now measure only characters on the target line up to posInLine
    const lineStart = lineStartChar;
    const lineEnd = lineStartChar + (lines[targetLine]?.length || 0);
    const measureEnd = Math.min(endPos, lineEnd);

    for (const run of runs) {
        const runStart = charIndex;
        const runEnd = charIndex + run.text.length;

        // Check if this run overlaps with what we need to measure on this line
        if (runEnd > lineStart && runStart < measureEnd) {
            const fontStyle = run.italic ? 'italic' : (textElement.fontStyle || 'normal');
            const fontWeight = run.bold ? 'bold' : (textElement.fontWeight || 'normal');
            ctx.font = `${fontStyle} ${fontWeight} ${textElement.fontSize}px ${textElement.fontFamily || 'sans-serif'}`;

            // Calculate which portion of this run to measure
            const measureStart = Math.max(runStart, lineStart);
            const measureEndInRun = Math.min(runEnd, measureEnd);

            if (measureEndInRun > measureStart) {
                const textToMeasure = run.text.slice(
                    measureStart - runStart,
                    measureEndInRun - runStart
                ).replace(/\n/g, ''); // Remove newlines for measurement

                width += ctx.measureText(textToMeasure).width;
            }
        }

        charIndex = runEnd;
    }

    return width;
};

/**
 * Draw text element on canvas with run-based rich text support
 */
export const drawTextElement = (
    ctx: CanvasRenderingContext2D,
    textElement: TextElement,
    isEditing: boolean,
    cursorPosition: number,
    isCursorVisible: boolean,
    scale: number,
    selectionStart: number | null = null,
    selectionEnd: number | null = null
): void => {
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const runs = textElement.runs || [{ text: textElement.text }];
    const currentText = textElement.text;
    const lines = currentText.split('\n');
    const lineHeight = textElement.fontSize * 1.2;

    // Draw selection highlight if editing this text
    if (isEditing) {
        const bounds = calculateTextBounds(ctx, textElement);

        // Draw text selection highlight (blue background)
        if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd) {
            const selStart = Math.min(selectionStart, selectionEnd);
            const selEnd = Math.max(selectionStart, selectionEnd);

            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Light blue selection

            let charIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineStart = charIndex;
                const lineEnd = charIndex + line.length;

                // Check if this line has any selection
                if (selEnd > lineStart && selStart < lineEnd) {
                    // Calculate selection bounds within this line
                    const lineSelStart = Math.max(0, selStart - lineStart);
                    const lineSelEnd = Math.min(line.length, selEnd - lineStart);

                    // Get x positions for selection start and end
                    const startX = textElement.x + measureTextWithRuns(ctx, textElement, 0, lineStart + lineSelStart);
                    const endX = textElement.x + measureTextWithRuns(ctx, textElement, 0, lineStart + lineSelEnd);
                    const selWidth = endX - startX;
                    const selY = textElement.y + i * lineHeight;

                    ctx.fillRect(startX, selY, selWidth, textElement.fontSize);
                }

                charIndex = lineEnd + 1; // +1 for \n
            }
        }

        // Draw bounding box rectangle (only borders, no fill)
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([]);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // Draw handles (markers) on corners
        const handleSize = 8 / scale;
        const halfHandle = handleSize / 2;

        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            { x: bounds.x, y: bounds.y + bounds.height }
        ];

        corners.forEach((point) => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(point.x - halfHandle, point.y - halfHandle, handleSize, handleSize);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1.5 / scale;
            ctx.strokeRect(point.x - halfHandle, point.y - halfHandle, handleSize, handleSize);
        });
    }

    // Draw text with runs
    const isPlaceholder = textElement.text === 'Add Text';
    let globalCharIndex = 0;
    let currentLine = 0;
    let xPos = textElement.x;

    // Handle bullet point
    if (textElement.listType === 'bullet') {
        ctx.font = `${textElement.fontSize}px ${textElement.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = isPlaceholder ? 'rgba(148, 163, 184, 0.5)' : textElement.color;
        ctx.fillText('•', textElement.x - textElement.fontSize, textElement.y);
    }

    for (const run of runs) {
        // Build font string for this run
        const fontStyle = run.italic ? 'italic' : (textElement.fontStyle || 'normal');
        const fontWeight = run.bold ? 'bold' : (textElement.fontWeight || 'normal');
        ctx.font = `${fontStyle} ${fontWeight} ${textElement.fontSize}px ${textElement.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = isPlaceholder ? 'rgba(148, 163, 184, 0.5)' : textElement.color;

        // Process run text character by character to handle line breaks
        let runText = run.text;

        while (runText.length > 0) {
            const newlineIdx = runText.indexOf('\n');

            if (newlineIdx === -1) {
                // No newline in remaining text, draw it all
                ctx.fillText(runText, xPos, textElement.y + currentLine * lineHeight);

                // Draw strikethrough if needed
                if (run.strikethrough) {
                    const textWidth = ctx.measureText(runText).width;
                    const strikeY = textElement.y + currentLine * lineHeight + (textElement.fontSize / 2);
                    ctx.beginPath();
                    ctx.strokeStyle = textElement.color;
                    ctx.lineWidth = Math.max(1, textElement.fontSize / 10);
                    ctx.moveTo(xPos, strikeY);
                    ctx.lineTo(xPos + textWidth, strikeY);
                    ctx.stroke();
                }

                xPos += ctx.measureText(runText).width;
                globalCharIndex += runText.length;
                break;
            } else {
                // Draw text before newline
                const beforeNewline = runText.slice(0, newlineIdx);
                if (beforeNewline.length > 0) {
                    ctx.fillText(beforeNewline, xPos, textElement.y + currentLine * lineHeight);

                    // Draw strikethrough if needed
                    if (run.strikethrough) {
                        const textWidth = ctx.measureText(beforeNewline).width;
                        const strikeY = textElement.y + currentLine * lineHeight + (textElement.fontSize / 2);
                        ctx.beginPath();
                        ctx.strokeStyle = textElement.color;
                        ctx.lineWidth = Math.max(1, textElement.fontSize / 10);
                        ctx.moveTo(xPos, strikeY);
                        ctx.lineTo(xPos + textWidth, strikeY);
                        ctx.stroke();
                    }
                }

                // Move to next line
                globalCharIndex += beforeNewline.length + 1; // +1 for \n
                currentLine++;
                xPos = textElement.x;
                runText = runText.slice(newlineIdx + 1);
            }
        }
    }

    // Draw underline for links (applies to entire text)
    if (textElement.link) {
        ctx.font = `${textElement.fontStyle || 'normal'} ${textElement.fontWeight || 'normal'} ${textElement.fontSize}px ${textElement.fontFamily || 'sans-serif'}`;
        lines.forEach((line, index) => {
            const metrics = ctx.measureText(line);
            const lineY = textElement.y + index * lineHeight + textElement.fontSize;
            ctx.beginPath();
            ctx.strokeStyle = textElement.color;
            ctx.lineWidth = 1;
            ctx.moveTo(textElement.x, lineY + 2);
            ctx.lineTo(textElement.x + metrics.width, lineY + 2);
            ctx.stroke();
        });
    }

    // Draw cursor if editing (but NOT if there is a text selection)
    const hasSelection = selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd;
    if (isEditing && isCursorVisible && !hasSelection) {
        // Measure text up to cursor position considering runs
        const cursorX = textElement.x + measureTextWithRuns(ctx, textElement, 0, cursorPosition);

        // Find which line the cursor is on
        let charCount = 0;
        let cursorLine = 0;
        for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= cursorPosition) {
                cursorLine = i;
                break;
            }
            charCount += lines[i].length + 1; // +1 for \n
            cursorLine = i + 1;
        }

        // Clamp cursor line
        const effectiveLineCount = lines.length > 0 && lines[lines.length - 1] === ''
            ? Math.max(1, lines.length - 1)
            : lines.length;
        cursorLine = Math.min(cursorLine, effectiveLineCount - 1);

        const cursorY = textElement.y + cursorLine * lineHeight;

        ctx.beginPath();
        ctx.moveTo(cursorX, cursorY);
        ctx.lineTo(cursorX, cursorY + textElement.fontSize);
        ctx.strokeStyle = textElement.color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
};

/**
 * Draw phantom text preview
 */
export const drawPhantomText = (
    ctx: CanvasRenderingContext2D,
    pos: Point,
    fontSize: number,
    color: string,
    scale: number
): void => {
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;

    const offsetDistance = 12 / scale;
    ctx.fillText('Add Text', pos.x + offsetDistance, pos.y + offsetDistance);
    ctx.globalAlpha = 1.0;
};

/**
 * Draw selection rectangle during box selection
 */
export const drawSelectionRect = (
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    transform: TransformState
): void => {
    const { scale, offset } = transform;

    const startCanvasX = start.x * scale + offset.x;
    const startCanvasY = start.y * scale + offset.y;
    const endCanvasX = end.x * scale + offset.x;
    const endCanvasY = end.y * scale + offset.y;

    const rectX = Math.min(startCanvasX, endCanvasX);
    const rectY = Math.min(startCanvasY, endCanvasY);
    const rectWidth = Math.abs(endCanvasX - startCanvasX);
    const rectHeight = Math.abs(endCanvasY - startCanvasY);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

    ctx.setLineDash([]);
};

/**
 * Draw bounding box around selected elements
 */
export const drawSelectionBounds = (
    ctx: CanvasRenderingContext2D,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    transform: TransformState
): void => {
    const { scale, offset } = transform;

    const boundsMinX = bounds.minX * scale + offset.x;
    const boundsMinY = bounds.minY * scale + offset.y;
    const boundsMaxX = bounds.maxX * scale + offset.x;
    const boundsMaxY = bounds.maxY * scale + offset.y;

    const rectX = boundsMinX;
    const rectY = boundsMinY;
    const rectWidth = boundsMaxX - boundsMinX;
    const rectHeight = boundsMaxY - boundsMinY;

    // Draw bounding box rectangle
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);

    // Draw corner handles
    const handleSize = 8;
    const halfHandle = handleSize / 2;

    const corners = [
        { x: rectX, y: rectY },
        { x: rectX + rectWidth, y: rectY },
        { x: rectX + rectWidth, y: rectY + rectHeight },
        { x: rectX, y: rectY + rectHeight }
    ];

    corners.forEach((point) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(point.x - halfHandle, point.y - halfHandle, handleSize, handleSize);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(point.x - halfHandle, point.y - halfHandle, handleSize, handleSize);
    });
};
