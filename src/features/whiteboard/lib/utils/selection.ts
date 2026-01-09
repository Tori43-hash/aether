// Selection utility functions

import { Point, Stroke, TextElement, SelectionBounds } from '../types';
import { calculateTextBounds } from './geometry';

/**
 * Scale selected strokes from center
 */
export const scaleStrokes = (
    strokes: Stroke[],
    selectedIndices: Set<number>,
    originalStrokes: Map<number, Stroke>,
    scaleX: number,
    scaleY: number,
    centerX: number,
    centerY: number
): void => {
    selectedIndices.forEach((index) => {
        const stroke = strokes[index];
        const originalStroke = originalStrokes.get(index);
        if (!stroke || !originalStroke) return;

        stroke.points = originalStroke.points.map((point) => {
            const dx = point.x - centerX;
            const dy = point.y - centerY;
            return {
                x: centerX + dx * scaleX,
                y: centerY + dy * scaleY
            };
        });

        // Scale stroke size
        const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        stroke.size = Math.max(0.5, originalStroke.size * avgScale);
    });
};

/**
 * Scale selected texts from center
 */
export const scaleTexts = (
    texts: TextElement[],
    selectedIds: Set<string>,
    originalTexts: Map<string, TextElement>,
    scaleX: number,
    scaleY: number,
    centerX: number,
    centerY: number
): void => {
    selectedIds.forEach(id => {
        const text = texts.find(t => t.id === id);
        const originalText = originalTexts.get(id);
        if (!text || !originalText) return;

        const dx = originalText.x - centerX;
        const dy = originalText.y - centerY;
        text.x = centerX + dx * scaleX;
        text.y = centerY + dy * scaleY;

        // Scale font size by average scale to maintain visibility
        const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        text.fontSize = Math.max(1, originalText.fontSize * avgScale);
    });
};

/**
 * Move selected strokes by delta
 */
export const moveStrokes = (
    strokes: Stroke[],
    selectedIndices: Set<number>,
    dx: number,
    dy: number
): void => {
    selectedIndices.forEach(index => {
        const stroke = strokes[index];
        if (stroke) {
            stroke.points.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
        }
    });
};

/**
 * Move selected texts by delta
 */
export const moveTexts = (
    texts: TextElement[],
    selectedIds: Set<string>,
    dx: number,
    dy: number
): void => {
    selectedIds.forEach(id => {
        const text = texts.find(t => t.id === id);
        if (text) {
            text.x += dx;
            text.y += dy;
        }
    });
};

/**
 * Recalculate bounds after scaling
 */
export const recalculateBoundsAfterScale = (
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

    selectedStrokeIndices.forEach((index) => {
        const stroke = strokes[index];
        if (!stroke || stroke.points.length === 0) return;

        const halfSize = stroke.size / 2;

        stroke.points.forEach((point) => {
            minX = Math.min(minX, point.x - halfSize);
            minY = Math.min(minY, point.y - halfSize);
            maxX = Math.max(maxX, point.x + halfSize);
            maxY = Math.max(maxY, point.y + halfSize);
        });
    });

    selectedTextIds.forEach(id => {
        const t = texts.find(tx => tx.id === id);
        if (!t || !ctx) return;

        const bounds = calculateTextBounds(ctx, t);
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    if (minX !== Infinity) {
        return { minX, minY, maxX, maxY };
    }
    return null;
};

/**
 * Update stroke indices after some strokes are deleted
 */
export const updateStrokeIndicesAfterDeletion = (
    selectedStrokes: Set<number>,
    deletedIndices: number[]
): Set<number> => {
    const newSelectedStrokes = new Set<number>();

    selectedStrokes.forEach((oldIndex) => {
        let newIndex = oldIndex;
        deletedIndices.forEach((removedIndex) => {
            if (oldIndex > removedIndex) {
                newIndex--;
            }
        });
        if (newIndex >= 0) {
            newSelectedStrokes.add(newIndex);
        }
    });

    return newSelectedStrokes;
};

/**
 * Deep copy strokes for history
 */
export const deepCopyStrokes = (strokes: Stroke[]): Stroke[] => {
    return strokes.map(stroke => ({
        ...stroke,
        points: stroke.points.map(p => ({ ...p }))
    }));
};

/**
 * Deep copy texts for history
 */
export const deepCopyTexts = (texts: TextElement[]): TextElement[] => {
    return texts.map(text => ({
        ...text,
        runs: text.runs ? text.runs.map(run => ({ ...run })) : [{ text: text.text }]
    }));
};
