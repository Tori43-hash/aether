// Canvas Card Component

import React, { useState } from 'react';
import type { CanvasListItem } from 'entities/canvas-journal';

interface CanvasCardProps {
    canvas: CanvasListItem;
    isActive?: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (newName: string) => void;
}

export const CanvasCard: React.FC<CanvasCardProps> = ({
    canvas,
    isActive = false,
    onSelect,
    onDelete,
    onRename,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(canvas.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleNameSubmit = () => {
        if (editName.trim() && editName !== canvas.name) {
            onRename(editName.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setEditName(canvas.name);
            setIsEditing(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div
            className={`
        relative group rounded-xl overflow-hidden
        bg-white border-2 
        transition-all duration-200 ease-out
        hover:shadow-lg hover:scale-[1.02]
        ${isActive
                    ? 'border-violet-500 shadow-lg shadow-violet-500/20'
                    : 'border-slate-200 hover:border-violet-300'
                }
      `}
        >
            {/* Thumbnail */}
            <div
                className="aspect-[4/3] bg-slate-100 cursor-pointer relative overflow-hidden"
                onClick={onSelect}
            >
                {canvas.thumbnail ? (
                    <img
                        src={canvas.thumbnail}
                        alt={canvas.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* Active indicator */}
                {isActive && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-violet-500 text-white text-xs font-medium rounded-full">
                        Активен
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                {/* Name */}
                {isEditing ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleNameSubmit}
                        onKeyDown={handleKeyDown}
                        className="w-full px-2 py-1 text-sm font-medium border border-violet-300 rounded focus:outline-none focus:ring-2 focus:ring-violet-500"
                        autoFocus
                    />
                ) : (
                    <h3
                        className="font-medium text-slate-800 text-sm truncate cursor-pointer hover:text-violet-600 transition-colors"
                        onClick={() => setIsEditing(true)}
                        title="Нажмите для редактирования"
                    >
                        {canvas.name}
                    </h3>
                )}

                {/* Date */}
                <p className="text-xs text-slate-400 mt-1">
                    {formatDate(canvas.updatedAt)}
                </p>
            </div>

            {/* Delete button */}
            <button
                className="absolute top-2 left-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                }}
                title="Удалить холст"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-xl backdrop-blur-sm">
                    <div className="bg-white p-4 rounded-lg shadow-xl max-w-[90%]">
                        <p className="text-sm text-slate-700 mb-3">Удалить этот холст?</p>
                        <div className="flex gap-2 justify-end">
                            <button
                                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                onClick={() => {
                                    onDelete();
                                    setShowDeleteConfirm(false);
                                }}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

CanvasCard.displayName = 'CanvasCard';
