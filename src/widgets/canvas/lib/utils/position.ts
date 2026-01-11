/**
 * Positioning utilities for whiteboard toolbar placement
 */

export interface ToolbarPosition {
    x: number;
    y: number;
}

export interface ToolbarBounds {
    boundsX: number;
    boundsY: number;
    boundsWidth: number;
    boundsHeight: number;
}

export interface TransformData {
    scale: number;
    offset: { x: number; y: number };
}

// Constants for toolbar positioning
export const TOOLBAR_DIMENSIONS = {
    height: 50,
    width: 420,
    gap: 8,
    screenPadding: 15,
    topMenuThreshold: 100,
    bottomMenuOffset: 85,
} as const;

/**
 * Calculate TextToolbar position with boundary checks
 * Ensures toolbar doesn't overlap with top menu, bottom navigation, or screen edges
 */
export const calculateToolbarPosition = (
    bounds: ToolbarBounds,
    transform: TransformData,
    containerRect: DOMRect,
    windowHeight: number,
    windowWidth: number
): ToolbarPosition => {
    const { boundsX, boundsY, boundsWidth, boundsHeight } = bounds;
    const { scale, offset } = transform;
    const {
        height: toolbarHeight,
        width: toolbarWidth,
        gap: toolbarGap,
        screenPadding,
        topMenuThreshold,
        bottomMenuOffset,
    } = TOOLBAR_DIMENSIONS;

    const bottomMenuThreshold = windowHeight - bottomMenuOffset;

    // Convert bounds to screen coordinates (relative to viewport)
    // The formula (coord * scale + offset) gives canvas device pixels
    // Divide by DPR to get CSS pixels, then add container position
    const dpr = window.devicePixelRatio || 1;
    const screenBoundsX = (boundsX * scale + offset.x) / dpr + containerRect.left;
    const screenBoundsY = (boundsY * scale + offset.y) / dpr + containerRect.top;

    // Calculate screen position of text bottom edge
    const textHeight = (boundsHeight * scale) / dpr;
    const screenBoundsBottom = screenBoundsY + textHeight;

    // Center X is at the middle of the text bounds
    const centerX = screenBoundsX + (boundsWidth * scale) / dpr / 2;

    // === Horizontal positioning with boundary checks ===
    let toolbarX = centerX;
    const leftBoundary = toolbarWidth / 2 + screenPadding;
    const rightBoundary = windowWidth - toolbarWidth / 2 - screenPadding;

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

    return { x: toolbarX, y: toolbarY };
};
