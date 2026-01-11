// Whiteboard Settings Modal Component

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PenTool, Eraser, MousePointer, Undo, Redo, Minus, X, ChevronDown, ChevronUp, Eye, EyeOff, Type } from 'lucide-react';
import { Shortcuts, ShortcutConfig, BackgroundType, DisplayPosition, DisplaySize, DEFAULT_SHORTCUTS } from 'entities/whiteboard';
import { getEnglishKeyFromCode } from 'widgets/whiteboard-canvas/lib/utils/geometry';

interface WhiteboardSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts: Shortcuts;
    onShortcutChange: (shortcuts: Shortcuts) => void;
    isUIHidden: boolean;
    // Advanced settings
    showCoordinates: boolean;
    onShowCoordinatesChange: (value: boolean) => void;
    showZoom: boolean;
    onShowZoomChange: (value: boolean) => void;
    backgroundType: BackgroundType;
    onBackgroundTypeChange: (value: BackgroundType) => void;
    zoomSpeed: number;
    onZoomSpeedChange: (value: number) => void;
    displayPosition: DisplayPosition;
    onDisplayPositionChange: (value: DisplayPosition) => void;
    displaySize: DisplaySize;
    onDisplaySizeChange: (value: DisplaySize) => void;
}

export const WhiteboardSettingsModal: React.FC<WhiteboardSettingsModalProps> = ({
    isOpen,
    onClose,
    shortcuts,
    onShortcutChange,
    isUIHidden,
    showCoordinates,
    onShowCoordinatesChange,
    showZoom,
    onShowZoomChange,
    backgroundType,
    onBackgroundTypeChange,
    zoomSpeed,
    onZoomSpeedChange,
    displayPosition,
    onDisplayPositionChange,
    displaySize,
    onDisplaySizeChange,
}) => {
    const [capturingShortcut, setCapturingShortcut] = useState<keyof Shortcuts | null>(null);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const captureInputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (capturingShortcut && captureInputRef.current) {
            captureInputRef.current.focus();
        }
    }, [capturingShortcut]);

    // Global keyboard handler for capturing shortcuts
    useEffect(() => {
        if (!capturingShortcut) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore modifier keys alone
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const englishKey = getEnglishKeyFromCode(e.code);

            const newConfig: ShortcutConfig = {
                key: englishKey,
                ctrl: e.ctrlKey || e.metaKey,
                shift: e.shiftKey,
                alt: e.altKey
            };

            onShortcutChange({
                ...shortcuts,
                [capturingShortcut]: newConfig
            });

            setCapturingShortcut(null);
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [capturingShortcut, shortcuts, onShortcutChange]);

    const handleShortcutKeyDown = (e: React.KeyboardEvent, shortcutKey: keyof Shortcuts) => {
        // Ignore modifier keys alone
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const englishKey = getEnglishKeyFromCode(e.code);

        const newConfig: ShortcutConfig = {
            key: englishKey,
            ctrl: e.ctrlKey || e.metaKey,
            shift: e.shiftKey,
            alt: e.altKey
        };

        onShortcutChange({
            ...shortcuts,
            [shortcutKey]: newConfig
        });

        setCapturingShortcut(null);
    };

    const resetShortcut = (shortcutKey: keyof Shortcuts) => {
        onShortcutChange({
            ...shortcuts,
            [shortcutKey]: DEFAULT_SHORTCUTS[shortcutKey]
        });
    };

    // Format shortcut for display
    const formatShortcut = (config: ShortcutConfig | undefined): string => {
        if (!config) return 'Not set';
        const parts: string[] = [];
        if (config.ctrl) parts.push('Ctrl');
        if (config.shift) parts.push('Shift');
        if (config.alt) parts.push('Alt');
        parts.push(config.key?.toUpperCase() || '?');
        return parts.join(' + ');
    };

    if (!isOpen) return null;

    const shortcutItems = [
        { key: 'undo' as const, label: 'Undo', icon: <Undo className="w-4 h-4" /> },
        { key: 'redo' as const, label: 'Redo', icon: <Redo className="w-4 h-4" /> },
        { key: 'pen' as const, label: 'Pen Tool', icon: <PenTool className="w-4 h-4" /> },
        { key: 'eraser' as const, label: 'Eraser Tool', icon: <Eraser className="w-4 h-4" /> },
        { key: 'cursor' as const, label: 'Cursor Tool', icon: <MousePointer className="w-4 h-4" /> },
        { key: 'text' as const, label: 'Text Tool', icon: <Type className="w-4 h-4" /> },
        { key: 'clear' as const, label: 'Clear Canvas', icon: <Minus className="w-4 h-4" /> },
        { key: 'hideUI' as const, label: 'Hide/Show UI', icon: isUIHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" /> },
    ];

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div
                className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl ring-1 ring-black/5"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800">Keyboard Shortcuts</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="space-y-2">
                    {shortcutItems.map(({ key, label, icon }) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="text-slate-400">
                                    {icon}
                                </div>
                                <div>
                                    <div className="text-sm text-slate-700">{label}</div>
                                    {capturingShortcut === key ? (
                                        <div className="text-xs text-slate-500 mt-0.5">Press any key combination...</div>
                                    ) : (
                                        <div className="text-xs text-slate-400 mt-0.5">{formatShortcut(shortcuts[key] || DEFAULT_SHORTCUTS[key])}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {capturingShortcut === key ? (
                                    <button
                                        onClick={() => setCapturingShortcut(null)}
                                        className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 transition"
                                    >
                                        Cancel
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setCapturingShortcut(key)}
                                            className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 transition"
                                        >
                                            Change
                                        </button>
                                        <button
                                            onClick={() => resetShortcut(key)}
                                            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 transition"
                                            title="Reset to default"
                                        >
                                            Reset
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {capturingShortcut && (
                    <div
                        ref={captureInputRef}
                        className="mt-4 py-2 outline-none"
                        onKeyDown={(e) => handleShortcutKeyDown(e, capturingShortcut)}
                        tabIndex={0}
                    >
                        <div className="text-xs text-slate-600">Press your desired key combination</div>
                    </div>
                )}

                {/* Advanced Settings */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="space-y-2">
                        <div
                            className="flex items-center justify-between py-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        >
                            <div className="text-sm text-slate-700">Advanced Settings</div>
                            <div className="flex items-center gap-1">
                                {showAdvancedSettings ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                            </div>
                        </div>

                        {showAdvancedSettings && (
                            <>
                                {/* Show Coordinates */}
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <div>
                                        <div className="text-sm text-slate-700">Show Coordinates</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={showCoordinates}
                                            onChange={(e) => onShowCoordinatesChange(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                    </label>
                                </div>

                                {/* Show Zoom */}
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <div>
                                        <div className="text-sm text-slate-700">Show Zoom</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={showZoom}
                                            onChange={(e) => onShowZoomChange(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                                    </label>
                                </div>

                                {/* Background Type */}
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <div>
                                        <div className="text-sm text-slate-700">Background</div>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {backgroundType === 'solid' && 'Solid'}
                                            {backgroundType === 'grid' && 'Grid Lines'}
                                            {backgroundType === 'dots' && 'Dot Grid'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {(['solid', 'grid', 'dots'] as const).map((type) => (
                                            <button
                                                key={type}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onBackgroundTypeChange(type);
                                                }}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${backgroundType === type
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {type === 'solid' && 'Solid'}
                                                {type === 'grid' && 'Grid'}
                                                {type === 'dots' && 'Dots'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Zoom Speed */}
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <div className="flex-1">
                                        <div className="text-sm text-slate-700 mb-2">Zoom Speed</div>
                                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="range"
                                                min="0.0001"
                                                max="0.01"
                                                step="0.0001"
                                                value={zoomSpeed}
                                                onChange={(e) => onZoomSpeedChange(parseFloat(e.target.value))}
                                                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                                            />
                                            <span className="text-xs text-slate-500 font-mono min-w-[60px] text-right">
                                                {zoomSpeed.toFixed(4)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Display Position & Size (only if coordinates or zoom shown) */}
                                {(showCoordinates || showZoom) && (
                                    <>
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                            <div>
                                                <div className="text-sm text-slate-700">Position</div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {displayPosition === 'top-left' && 'Top Left'}
                                                    {displayPosition === 'top-right' && 'Top Right'}
                                                    {displayPosition === 'bottom-left' && 'Bottom Left'}
                                                    {displayPosition === 'bottom-right' && 'Bottom Right'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                                                    <button
                                                        key={pos}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDisplayPositionChange(pos);
                                                        }}
                                                        className={`px-2 py-1 text-xs text-slate-600 hover:text-slate-800 transition ${displayPosition === pos ? 'text-slate-800' : ''}`}
                                                    >
                                                        {pos.split('-').map(w => w[0].toUpperCase()).join('')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                            <div>
                                                <div className="text-sm text-slate-700">Size</div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {displaySize === 'small' && 'Small'}
                                                    {displaySize === 'medium' && 'Medium'}
                                                    {displaySize === 'large' && 'Large'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(['small', 'medium', 'large'] as const).map((size) => (
                                                    <button
                                                        key={size}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDisplaySizeChange(size);
                                                        }}
                                                        className={`px-2 py-1 text-xs text-slate-600 hover:text-slate-800 transition ${displaySize === size ? 'text-slate-800' : ''}`}
                                                    >
                                                        {size.charAt(0).toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Done Button */}
                <button
                    onClick={onClose}
                    className="w-full py-2 mt-4 text-sm text-slate-700 hover:text-slate-900 transition"
                >
                    Done
                </button>
            </div>
        </div>,
        document.body
    );
};

WhiteboardSettingsModal.displayName = 'WhiteboardSettingsModal';
