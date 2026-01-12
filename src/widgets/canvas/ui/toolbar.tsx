// Whiteboard Toolbar Component

import React from 'react';
import { PenTool, Eraser, MousePointer, Undo, Redo, Palette, Minus, Settings, Type } from 'lucide-react';
import { DebouncedColorInput } from '../../../shared/ui';
import { ToolType } from 'entities/canvas';
import { TOOLBAR_COLORS } from 'entities/canvas';

interface WhiteboardToolbarProps {
    tool: ToolType;
    onToolChange: (tool: ToolType) => void;
    color: string;
    onColorChange: (color: string) => void;
    size: number;
    onSizeChange: (size: number) => void;
    undoCount: number;
    redoCount: number;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onResetView: () => void;
    onOpenSettings: () => void;
}

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
    tool,
    onToolChange,
    color,
    onColorChange,
    size,
    onSizeChange,
    undoCount,
    redoCount,
    onUndo,
    onRedo,
    onClear,
    onResetView,
    onOpenSettings,
}) => {
    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg p-3 flex items-center gap-2">
            {/* Cursor Tool */}
            <button
                onClick={() => onToolChange('cursor')}
                className={`p-2 rounded-lg transition-all ${tool === 'cursor' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title="Cursor (Select)"
            >
                <MousePointer className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-300"></div>

            {/* Pen Tool */}
            <button
                onClick={() => onToolChange('pen')}
                className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title="Pen"
            >
                <PenTool className="w-4 h-4" />
            </button>

            {/* Eraser Tool */}
            <button
                onClick={() => onToolChange('eraser')}
                className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title="Eraser"
            >
                <Eraser className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-300"></div>

            {/* Text Tool */}
            <button
                onClick={() => onToolChange('text')}
                className={`p-2 rounded-lg transition-all ${tool === 'text' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title="Text Tool"
            >
                <Type className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-300"></div>

            {/* Color Picker */}
            <div className="flex items-center gap-2">
                {TOOLBAR_COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => {
                            onColorChange(c);
                            if (tool === 'cursor') onToolChange('pen');
                        }}
                        className={`w-6 h-6 rounded-md border-2 ${color === c ? 'border-slate-900 scale-110' : 'border-slate-300 hover:border-slate-500'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-md border-2 transition-all ${TOOLBAR_COLORS.includes(color) ? 'border-slate-300 hover:border-slate-500 hover:bg-slate-50' : 'border-slate-900 bg-slate-100'}`}>
                    <Palette className="w-4 h-4 text-slate-600 pointer-events-none absolute" />
                    <div className="opacity-0 w-full h-full overflow-hidden cursor-pointer">
                        <DebouncedColorInput
                            initialColor={color}
                            onActive={() => { }}
                            onColorChange={(c) => {
                                onColorChange(c);
                                if (tool === 'cursor') onToolChange('pen');
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="w-px h-6 bg-slate-300"></div>

            {/* Size Slider */}
            <div className="flex items-center gap-2 px-2">
                <span className="text-xs text-slate-600 font-medium min-w-[40px]">{size}px</span>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={size}
                    onChange={(e) => onSizeChange(Number(e.target.value))}
                    className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                />
            </div>

            <div className="w-px h-6 bg-slate-300"></div>

            {/* Reset View */}
            <button
                onClick={onResetView}
                className="px-2 py-1 text-xs font-bold bg-slate-100 rounded hover:bg-slate-200 text-slate-600"
            >
                100%
            </button>

            {/* Undo */}
            <button
                onClick={onUndo}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Undo"
                disabled={undoCount === 0}
            >
                <Undo className={`w-4 h-4 ${undoCount === 0 ? 'opacity-30' : ''}`} />
            </button>

            {/* Redo */}
            <button
                onClick={onRedo}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Redo"
                disabled={redoCount === 0}
            >
                <Redo className={`w-4 h-4 ${redoCount === 0 ? 'opacity-30' : ''}`} />
            </button>

            {/* Clear */}
            <button
                onClick={onClear}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600"
                title="Clear"
            >
                <Minus className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-300"></div>

            {/* Settings */}
            <button
                onClick={onOpenSettings}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                title="Settings"
            >
                <Settings className="w-4 h-4" />
            </button>
        </div>
    );
};

WhiteboardToolbar.displayName = 'WhiteboardToolbar';
