import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Strikethrough, Link, List, Type, Palette, ChevronDown, AlignLeft, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TextToolbarProps {
    text: {
        id: string;
        fontSize: number;
        color: string;
        fontFamily?: string;
        fontWeight?: string;
        fontStyle?: string;
        textDecoration?: string;
        link?: string;
        listType?: 'none' | 'bullet' | 'number';
        runs?: { text: string; bold?: boolean; italic?: boolean; strikethrough?: boolean }[];
    };
    onChange: (updates: any) => void;
    position: { x: number; y: number };
    onClose?: () => void;
    selectionStart?: number | null;
    selectionEnd?: number | null;
    onStyleApply?: (style: 'bold' | 'italic' | 'strikethrough') => void;
}

const FONT_SIZES = [
    { label: 'Small', value: 16 },
    { label: 'Normal', value: 24 },
    { label: 'Large', value: 32 },
    { label: 'Pro', value: 48 },
];

// Font styles matching the reference design
const FONT_STYLES = [
    { label: 'Simple', value: 'Inter, sans-serif', preview: 'Inter' },
    { label: 'Bookish', value: 'Georgia, serif', preview: 'Georgia' },
    { label: 'Technical', value: '"JetBrains Mono", monospace', preview: 'JetBrains Mono' },
    { label: 'Scribbled', value: '"Caveat", cursive', preview: 'Caveat', handwritten: true },
];

// Presets based on the image (approximate)
const COLORS_VIBRANT = [
    '#000000', // Black
    '#6b7280', // Gray
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
];

const COLORS_PASTEL = [
    '#9ca3af', // Light Gray
    '#d1d5db', // Lighter Gray
    '#fca5a5', // Light Red
    '#fdba74', // Light Orange
    '#fde047', // Light Yellow
    '#86efac', // Light Green
    '#99f6e4', // Light Teal
    '#93c5fd', // Light Blue
    '#d8b4fe', // Light Purple
    '#f9a8d4', // Light Pink
];

export const TextToolbar: React.FC<TextToolbarProps> = ({
    text,
    onChange,
    position,
    onClose,
    selectionStart,
    selectionEnd,
    onStyleApply
}) => {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showFontMenu, setShowFontMenu] = useState(false);
    const linkInputRef = useRef<HTMLInputElement>(null);

    // Focus link input when opened
    useEffect(() => {
        if (showLinkInput && linkInputRef.current) {
            linkInputRef.current.focus();
        }
    }, [showLinkInput]);

    // Style toggle functions - always use onStyleApply if available
    // The parent component handles the selection logic with fresh ref values
    const toggleBold = () => {
        if (onStyleApply) {
            onStyleApply('bold');
        } else {
            onChange({ fontWeight: text.fontWeight === 'bold' ? 'normal' : 'bold' });
        }
    };

    const toggleItalic = () => {
        if (onStyleApply) {
            onStyleApply('italic');
        } else {
            onChange({ fontStyle: text.fontStyle === 'italic' ? 'normal' : 'italic' });
        }
    };

    const toggleStrike = () => {
        if (onStyleApply) {
            onStyleApply('strikethrough');
        } else {
            onChange({ textDecoration: text.textDecoration === 'line-through' ? 'none' : 'line-through' });
        }
    };

    const toggleList = () => {
        onChange({ listType: text.listType === 'bullet' ? 'none' : 'bullet' });
    };

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowLinkInput(false);
    };

    return (
        <div
            data-text-toolbar="true"
            className="fixed z-50 flex items-center gap-2 px-2 py-1.5 bg-white rounded-lg shadow-xl border border-gray-200 text-gray-800 animate-in fade-in zoom-in-95 duration-200"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translateX(-50%)'
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                const target = e.target as HTMLElement;
                // Allow interactions with inputs and selects
                if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                    return;
                }
                // Prevent focus loss for other elements (buttons, div background)
                e.preventDefault();
            }}
        >
            {/* Color Picker Trigger */}
            <div className="relative group">
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                >
                    <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: text.color }} />
                    <ChevronDown size={10} className="ml-0.5 text-gray-500" />
                </button>

                {/* Color Popover */}
                {showColorPicker && (
                    <div className="absolute top-full mt-2 left-0 bg-[#1e1e1e] p-3 rounded-xl shadow-2xl border border-gray-700 min-w-[280px] z-50 animate-in fade-in zoom-in-95"
                    >
                        <div className="grid grid-cols-10 gap-2 mb-2">
                            {COLORS_VIBRANT.map(color => (
                                <button
                                    key={color}
                                    onClick={() => { onChange({ color }); setShowColorPicker(false); }}
                                    className={`w-6 h-6 rounded-full border border-transparent hover:scale-110 transition-transform ${text.color === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1e1e1e]' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            {/* White button */}
                            <button
                                onClick={() => { onChange({ color: '#ffffff' }); setShowColorPicker(false); }}
                                className={`w-6 h-6 rounded-full border border-gray-500 hover:scale-110 transition-transform bg-white ${text.color === '#ffffff' ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1e1e1e]' : ''}`}
                            />
                        </div>
                        <div className="grid grid-cols-10 gap-2">
                            {COLORS_PASTEL.map(color => (
                                <button
                                    key={color}
                                    onClick={() => { onChange({ color }); setShowColorPicker(false); }}
                                    className={`w-6 h-6 rounded-full border border-transparent hover:scale-110 transition-transform ${text.color === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1e1e1e]' : ''}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            {/* Gradient/Custom placeholder - using native picker for now */}
                            <div className="relative w-6 h-6 rounded-full overflow-hidden hover:scale-110 transition-transform bg-gradient-to-br from-blue-400 to-pink-500">
                                <input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    value={text.color}
                                    onChange={(e) => onChange({ color: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Font Family - Aa Button with Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowFontMenu(!showFontMenu)}
                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-gray-700"
                >
                    <span className="text-sm font-medium" style={{ fontFamily: text.fontFamily || 'Inter, sans-serif' }}>Aa</span>
                    <ChevronDown size={12} className="text-gray-400" />
                </button>

                {/* Font Style Dropdown */}
                {showFontMenu && (
                    <div className="absolute top-full mt-2 left-0 bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-700 min-w-[160px] z-50 overflow-hidden animate-in fade-in zoom-in-95">
                        {FONT_STYLES.map((font) => (
                            <button
                                key={font.value}
                                onClick={() => { onChange({ fontFamily: font.value }); setShowFontMenu(false); }}
                                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors ${text.fontFamily === font.value ? 'bg-[#2a2a2a]' : ''
                                    }`}
                            >
                                {text.fontFamily === font.value ? (
                                    <span className="text-purple-500 text-sm">✓</span>
                                ) : (
                                    <span className="w-4" />
                                )}
                                <span
                                    className="text-gray-200 text-sm"
                                    style={{ fontFamily: font.value }}
                                >
                                    {font.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Font Size */}
            <div className="relative group mx-1">
                <select
                    value={text.fontSize}
                    onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                    className="bg-transparent text-sm font-medium border-none outline-none cursor-pointer hover:text-gray-600 appearance-none pr-4 w-16"
                >
                    {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Style Toggles */}
            <div className="flex items-center gap-0.5">
                <button
                    onClick={toggleBold}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${text.fontWeight === 'bold' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                    title="Bold"
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={toggleItalic}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${text.fontStyle === 'italic' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                    title="Italic"
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={toggleStrike}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${text.textDecoration === 'line-through' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} />
                </button>
            </div>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Link & List */}
            <div className="flex items-center gap-0.5">
                <div className="relative">
                    <button
                        onClick={() => setShowLinkInput(!showLinkInput)}
                        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${text.link ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                        title="Link"
                    >
                        <Link size={16} />
                    </button>

                    {showLinkInput && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white p-2 rounded-lg border border-gray-200 shadow-xl flex items-center gap-2 w-64 z-50">
                            <input
                                ref={linkInputRef}
                                type="text"
                                placeholder="https://example.com"
                                value={text.link || ''}
                                onChange={(e) => onChange({ link: e.target.value })}
                                className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            {text.link && (
                                <a href={text.link} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-500 hover:text-blue-600">
                                    <Link size={14} />
                                </a>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleList}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${text.listType === 'bullet' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                    title="List"
                >
                    <List size={16} />
                </button>
            </div>
        </div>
    );
};
