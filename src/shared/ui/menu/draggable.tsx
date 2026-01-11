import React, { useState, useRef } from 'react';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

export interface DraggableMenuProps {
    /** Title displayed at the top of the menu */
    title: string;
    /** Current order of item IDs */
    initialOrder: string[];
    /** IDs of items that are currently hidden */
    hiddenIds: string[];
    /** Called when the order changes after drag-and-drop */
    onCommitOrder: (order: string[]) => void;
    /** Called when visibility of an item is toggled */
    onToggleVisibility: (id: string) => void;
    /** Map of item ID to display label */
    labels: Record<string, string>;
}

/**
 * A reusable menu component with drag-and-drop reordering and visibility toggles.
 * Used for configuring metrics, table columns, and similar lists.
 */
export const DraggableMenu: React.FC<DraggableMenuProps> = ({
    title,
    initialOrder,
    hiddenIds,
    onCommitOrder,
    onToggleVisibility,
    labels
}) => {
    // Local state for instant drag reordering
    const [order, setOrder] = useState(initialOrder);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const lastUpdate = useRef(0);
    const dragEnabled = useRef(false);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        if (!dragEnabled.current) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setTimeout(() => {
            setDraggingId(id);
        }, 0);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        if (!draggingId || draggingId === targetId) return;

        const now = Date.now();
        if (now - lastUpdate.current < 30) return;

        const fromIdx = order.indexOf(draggingId);
        const toIdx = order.indexOf(targetId);

        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
            const newOrder = [...order];
            newOrder.splice(fromIdx, 1);
            newOrder.splice(toIdx, 0, draggingId);
            setOrder(newOrder);
            lastUpdate.current = now;
        }
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        onCommitOrder(order);
        dragEnabled.current = false;
    };

    const onHandleMouseDown = () => { dragEnabled.current = true; };
    const onHandleMouseUp = () => { dragEnabled.current = false; };

    return (
        <div
            className={`absolute top-full right-0 mt-2 w-64 bg-white border border-slate-100 rounded-xl shadow-xl z-50 p-2 animate-fade-in origin-top-right ${draggingId ? 'cursor-grabbing' : ''}`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <div className="px-3 py-2 flex items-center justify-between border-b border-slate-50 mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
            </div>
            <div className="space-y-1">
                {order.map(id => (
                    <div
                        key={id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, id)}
                        onDragOver={(e) => handleDragOver(e, id)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${draggingId === id ? 'opacity-50' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`p-1 -ml-1 text-slate-300 hover:text-slate-500 transition-colors ${draggingId ? 'cursor-grabbing' : 'cursor-pointer active:cursor-grabbing'}`}
                                onMouseDown={onHandleMouseDown}
                                onMouseUp={onHandleMouseUp}
                                onMouseLeave={onHandleMouseUp}
                            >
                                <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-sm font-medium ${hiddenIds.includes(id) ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                {labels[id]}
                            </span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleVisibility(id); }}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition"
                        >
                            {hiddenIds.includes(id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

DraggableMenu.displayName = 'DraggableMenu';
