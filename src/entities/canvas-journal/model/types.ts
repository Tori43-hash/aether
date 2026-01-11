// Canvas Journal Domain Types

import type { Stroke, TextElement, TransformState } from 'entities/whiteboard';

/**
 * Full canvas data including all drawing content
 */
export interface CanvasData {
  id: string;
  name: string;
  strokes: Stroke[];
  texts: TextElement[];
  transform: TransformState;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // base64 preview image
}

/**
 * Lightweight canvas item for list display
 */
export interface CanvasListItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

/**
 * Initial data for loading a canvas
 */
export interface CanvasInitialData {
  strokes: Stroke[];
  texts: TextElement[];
  transform?: TransformState;
}
