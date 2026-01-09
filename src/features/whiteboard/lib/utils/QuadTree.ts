
import { Stroke, Point, TextElement } from '../types';

export interface Box {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export type QuadTreeItem = Stroke | TextElement;

export interface QuadTreeNode {
    item: QuadTreeItem;
    bounds: Box;
}

export class QuadTree {
    private bounds: Box;
    private capacity: number;
    private items: QuadTreeNode[] = [];
    private divided: boolean = false;
    private northeast: QuadTree | null = null;
    private northwest: QuadTree | null = null;
    private southeast: QuadTree | null = null;
    private southwest: QuadTree | null = null;

    constructor(bounds: Box, capacity: number = 10) {
        this.bounds = bounds;
        this.capacity = capacity;
    }

    insert(node: QuadTreeNode): boolean {
        if (!this.contains(this.bounds, node.bounds)) {
            // If the node is strictly clearly outside, we reject it.
            // Check intersection logic if needed, but standard QuadTree inserts points/items
            // that are within the bounds.
            // For strokes spanning multiple quads, we can insert into all matching quads
            // OR insert into the smallest quad that fully contains it.
            // Simplified approach: Insert into this node if it intersects, or push down.

            // If it doesn't intersect at all, return false
            if (!this.intersects(this.bounds, node.bounds)) {
                return false;
            }
        }

        if (this.items.length < this.capacity && !this.divided) {
            this.items.push(node);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        const addedToNorthwest = this.contains(this.northwest!.bounds, node.bounds) && this.northwest!.insert(node);
        if (addedToNorthwest) return true;

        const addedToNortheast = this.contains(this.northeast!.bounds, node.bounds) && this.northeast!.insert(node);
        if (addedToNortheast) return true;

        const addedToSouthwest = this.contains(this.southwest!.bounds, node.bounds) && this.southwest!.insert(node);
        if (addedToSouthwest) return true;

        const addedToSoutheast = this.contains(this.southeast!.bounds, node.bounds) && this.southeast!.insert(node);
        if (addedToSoutheast) return true;

        // If it doesn't fully fit in any child, store it here
        this.items.push(node);
        return true;
    }

    // Explicitly using "fully contains" logic for pushing down
    private contains(container: Box, item: Box): boolean {
        return (
            item.minX >= container.minX &&
            item.maxX <= container.maxX &&
            item.minY >= container.minY &&
            item.maxY <= container.maxY
        );
    }

    private intersects(a: Box, b: Box): boolean {
        return !(
            b.minX > a.maxX ||
            b.maxX < a.minX ||
            b.minY > a.maxY ||
            b.maxY < a.minY
        );
    }

    private subdivide() {
        const { minX, minY, maxX, maxY } = this.bounds;
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        this.northwest = new QuadTree({ minX: minX, minY: minY, maxX: midX, maxY: midY }, this.capacity);
        this.northeast = new QuadTree({ minX: midX, minY: minY, maxX: maxX, maxY: midY }, this.capacity);
        this.southwest = new QuadTree({ minX: minX, minY: midY, maxX: midX, maxY: maxY }, this.capacity);
        this.southeast = new QuadTree({ minX: midX, minY: midY, maxX: maxX, maxY: maxY }, this.capacity);

        this.divided = true;

        // Redistribute existing items?
        // If we use the "keep in parent" strategy, we should try to push existing items down now that we have children.
        const oldItems = this.items;
        this.items = [];

        for (const node of oldItems) {
            // Reuse insert logic
            this.insert(node);
        }
    }

    retrieve(range: Box): QuadTreeItem[] {
        const found: QuadTreeItem[] = [];

        if (!this.intersects(this.bounds, range)) {
            return found; // Empty
        }

        // Check objects at this level
        for (const node of this.items) {
            if (this.intersects(range, node.bounds)) {
                found.push(node.item);
            }
        }

        // Check children
        if (this.divided) {
            found.push(...this.northwest!.retrieve(range));
            found.push(...this.northeast!.retrieve(range));
            found.push(...this.southwest!.retrieve(range));
            found.push(...this.southeast!.retrieve(range));
        }

        return found;
    }

    clear() {
        this.items = [];
        this.divided = false;
        this.northwest = null;
        this.northeast = null;
        this.southwest = null;
        this.southeast = null;
    }

    // Helper to remove a specific item (reference equality)
    // Returns true if removed
    remove(item: QuadTreeItem, itemBounds?: Box): boolean {
        const searchInBounds = itemBounds || (this.getBounds ? this.getBounds(item) : null);
        // Note: getBounds is tricky if generic item. Caller should provide bounds for efficiency.

        if (searchInBounds && !this.intersects(this.bounds, searchInBounds)) {
            return false;
        }

        const idx = this.items.findIndex(n => n.item === item);
        if (idx !== -1) {
            this.items.splice(idx, 1);
            return true;
        }

        if (this.divided) {
            if (this.northwest!.remove(item, searchInBounds)) return true;
            if (this.northeast!.remove(item, searchInBounds)) return true;
            if (this.southwest!.remove(item, searchInBounds)) return true;
            if (this.southeast!.remove(item, searchInBounds)) return true;
        }

        return false;
    }

    // Optional helper to inject bounds calculator
    getBounds?: (item: QuadTreeItem) => Box;
}

export const getStrokeBounds = (stroke: Stroke): Box => {
    if (stroke.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const halfSize = stroke.size / 2;

    for (const p of stroke.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    return {
        minX: minX - halfSize,
        minY: minY - halfSize,
        maxX: maxX + halfSize,
        maxY: maxY + halfSize
    };
};
