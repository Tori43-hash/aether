// Canvas Journal List Component

import React from 'react';
import type { CanvasListItem } from 'shared/api';
import { CanvasCard } from './card';

interface CanvasJournalListProps {
    canvasList: CanvasListItem[];
    activeCanvasId: string | null;
    onCreateCanvas: () => void;
    onSelectCanvas: (id: string) => void;
    onDeleteCanvas: (id: string) => void;
    onRenameCanvas: (id: string, name: string) => void;
}

export const CanvasJournalList: React.FC<CanvasJournalListProps> = ({
    canvasList,
    activeCanvasId,
    onCreateCanvas,
    onSelectCanvas,
    onDeleteCanvas,
    onRenameCanvas,
}) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50 p-6">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Журнал холстов</h1>
                        <p className="text-slate-500 mt-1">Управляйте своими рабочими пространствами</p>
                    </div>

                    <button
                        onClick={onCreateCanvas}
                        className="
              flex items-center gap-2 px-5 py-2.5
              bg-gradient-to-r from-violet-500 to-indigo-500
              text-white font-medium rounded-xl
              shadow-lg shadow-violet-500/25
              hover:shadow-xl hover:shadow-violet-500/30
              hover:scale-105
              transition-all duration-200
            "
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Создать холст
                    </button>
                </div>

                {/* Canvas Grid */}
                {canvasList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {canvasList.map((canvas) => (
                            <CanvasCard
                                key={canvas.id}
                                canvas={canvas}
                                isActive={canvas.id === activeCanvasId}
                                onSelect={() => onSelectCanvas(canvas.id)}
                                onDelete={() => onDeleteCanvas(canvas.id)}
                                onRename={(name) => onRenameCanvas(canvas.id, name)}
                            />
                        ))}
                    </div>
                ) : (
                    // Empty state
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 rounded-full bg-violet-100 flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-700 mb-2">Нет холстов</h2>
                        <p className="text-slate-500 mb-6 text-center max-w-md">
                            Создайте свой первый холст для рисования и заметок
                        </p>
                        <button
                            onClick={onCreateCanvas}
                            className="
                flex items-center gap-2 px-6 py-3
                bg-gradient-to-r from-violet-500 to-indigo-500
                text-white font-medium rounded-xl
                shadow-lg shadow-violet-500/25
                hover:shadow-xl hover:shadow-violet-500/30
                hover:scale-105
                transition-all duration-200
              "
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Создать первый холст
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

CanvasJournalList.displayName = 'CanvasJournalList';
