import { useEffect } from 'react';
import { Stroke, TextElement, Shortcuts, ShortcutConfig, ToolType } from 'entities/canvas';
import { getEnglishKeyFromCode } from '../../lib/utils/geometry';

interface UseWhiteboardShortcutsProps {
    shortcuts: Shortcuts;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    setIsUIHidden: React.Dispatch<React.SetStateAction<boolean>>;
    handleUndo: () => void;
    handleRedo: () => void;
    clearCanvas: () => void;
    saveToHistory: () => void;
    tool: ToolType;
    setTool: (tool: ToolType) => void;
    editingTextId: string | null;
    strokesRef: React.MutableRefObject<Stroke[]>;
    textsRef: React.MutableRefObject<TextElement[]>;
    selectedStrokesRef: React.MutableRefObject<Set<number>>;
    selectedTextsRef: React.MutableRefObject<Set<string>>;
    selectionBoundsRef: React.MutableRefObject<{ minX: number; minY: number; maxX: number; maxY: number } | null>;
    setSelectionTick: React.Dispatch<React.SetStateAction<number>>;
    scheduleRedraw: () => void;
    // For Enter shortcut
    isSwitchingTextRef: React.MutableRefObject<boolean>;
    isCreatingTextRef: React.MutableRefObject<boolean>;
    setEditingTextId: (id: string | null) => void;
    setEditingTextValue: (val: string) => void;
    setEditingTextOriginalValue: (val: string) => void;
    setEditingTextPosition: (pos: { x: number, y: number } | null) => void;
    transformRef: React.MutableRefObject<{ scale: number; offset: { x: number, y: number } }>;
    cursorPositionRef: React.MutableRefObject<number>;

    // Text selection refs for clipboard operations
    textSelectionStartRef: React.MutableRefObject<number | null>;
    textSelectionEndRef: React.MutableRefObject<number | null>;
    textEditableRef: React.RefObject<HTMLDivElement>;
}

export const useShortcuts = ({
    shortcuts,
    isSettingsOpen,
    setIsSettingsOpen,
    setIsUIHidden,
    handleUndo,
    handleRedo,
    clearCanvas,
    saveToHistory,
    tool,
    setTool,
    editingTextId,
    strokesRef,
    textsRef,
    selectedStrokesRef,
    selectedTextsRef,
    selectionBoundsRef,
    setSelectionTick,
    scheduleRedraw,
    isSwitchingTextRef,
    isCreatingTextRef,
    setEditingTextId,
    setEditingTextValue,
    setEditingTextOriginalValue,
    setEditingTextPosition,
    transformRef,
    cursorPositionRef,
    textSelectionStartRef,
    textSelectionEndRef,
    textEditableRef
}: UseWhiteboardShortcutsProps) => {

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();

            // Helper to check if shortcut matches
            const matchesShortcut = (config: ShortcutConfig): boolean => {
                if (config.ctrl && !(e.ctrlKey || e.metaKey)) return false;
                if (config.shift && !e.shiftKey) return false;
                if (config.alt && !e.altKey) return false;
                if (!config.ctrl && (e.ctrlKey || e.metaKey)) return false;
                if (!config.shift && e.shiftKey) return false;
                if (!config.alt && e.altKey) return false;

                // Use e.code to get English letter regardless of keyboard layout
                const englishKey = getEnglishKeyFromCode(e.code);
                const configKey = config.key.toLowerCase();
                return englishKey === configKey;
            };

            // Hide/Show UI shortcut should always work, even when UI is hidden or settings are open
            if (matchesShortcut(shortcuts.hideUI)) {
                e.preventDefault();
                e.stopPropagation();
                setIsUIHidden(prev => {
                    const newState = !prev;
                    // Close settings when hiding UI
                    if (newState && isSettingsOpen) {
                        setIsSettingsOpen(false);
                    }
                    return newState;
                });
                return;
            }

            // Other shortcuts should not work when settings modal is open or capturing
            if (isSettingsOpen) return;

            // Check each shortcut
            if (matchesShortcut(shortcuts.undo)) {
                e.preventDefault();
                e.stopPropagation();
                handleUndo();
            } else if (matchesShortcut(shortcuts.redo)) {
                e.preventDefault();
                e.stopPropagation();
                handleRedo();
            } else if (matchesShortcut(shortcuts.clear)) {
                e.preventDefault();
                e.stopPropagation();
                clearCanvas();
            } else if (!editingTextId) {
                // Tool shortcuts only work when NOT editing text
                if (matchesShortcut(shortcuts.pen)) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTool('pen');
                } else if (matchesShortcut(shortcuts.eraser)) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTool('eraser');
                } else if (matchesShortcut(shortcuts.cursor)) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTool('cursor');
                } else if (matchesShortcut(shortcuts.text)) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTool('text');
                }
            }

            // Delete/Backspace to remove selected strokes OR text (but not when editing text)
            if (!editingTextId && (key === 'delete' || key === 'backspace') && (selectedStrokesRef.current.size > 0 || selectedTextsRef.current.size > 0)) {
                e.preventDefault();
                e.stopPropagation();

                // Save current state to history before deleting
                saveToHistory();

                // Remove selected strokes (in reverse order to maintain indices)
                const indicesToRemove = Array.from(selectedStrokesRef.current).sort((a, b) => b - a);
                indicesToRemove.forEach((index) => {
                    strokesRef.current.splice(index, 1);
                });

                // Remove selected texts
                if (selectedTextsRef.current.size > 0) {
                    textsRef.current = textsRef.current.filter(t => !selectedTextsRef.current.has(t.id));
                }

                // Clear selection
                selectedStrokesRef.current.clear();
                selectedTextsRef.current.clear();
                selectionBoundsRef.current = null;

                setSelectionTick(t => t + 1);
                scheduleRedraw();
            } else if (!editingTextId && key === 'enter' && selectedTextsRef.current.size === 1) {
                // Enter to edit selected text
                e.preventDefault();
                e.stopPropagation();
                const textId = Array.from(selectedTextsRef.current)[0];
                const textElement = textsRef.current.find(t => t.id === textId);
                if (textElement) {
                    // Clear existing selection to remove the "old" boundary
                    selectedTextsRef.current.clear();
                    selectedStrokesRef.current.clear();
                    selectionBoundsRef.current = null;

                    isSwitchingTextRef.current = true;
                    isCreatingTextRef.current = false;
                    setEditingTextId(textElement.id);
                    setEditingTextValue(textElement.text);
                    setEditingTextOriginalValue(textElement.text);
                    const { scale, offset } = transformRef.current;
                    setEditingTextPosition({
                        x: textElement.x * scale + offset.x,
                        y: textElement.y * scale + offset.y
                    });
                    cursorPositionRef.current = textElement.text.length;
                    scheduleRedraw();
                }
            }

            // Clipboard operations when editing text (Ctrl+C, Ctrl+V, Ctrl+X)
            if (editingTextId && (e.ctrlKey || e.metaKey)) {
                const textElement = textsRef.current.find(t => t.id === editingTextId);
                if (!textElement) return;

                const selStart = textSelectionStartRef.current;
                const selEnd = textSelectionEndRef.current;
                const hasSelection = selStart !== null && selEnd !== null && selStart !== selEnd;

                // Ctrl+C - Copy
                if (key === 'c' && hasSelection) {
                    e.preventDefault();
                    e.stopPropagation();
                    const start = Math.min(selStart!, selEnd!);
                    const end = Math.max(selStart!, selEnd!);
                    const selectedText = textElement.text.substring(start, end);
                    navigator.clipboard.writeText(selectedText).catch(console.error);
                    return;
                }

                // Ctrl+X - Cut
                if (key === 'x' && hasSelection) {
                    e.preventDefault();
                    e.stopPropagation();
                    const start = Math.min(selStart!, selEnd!);
                    const end = Math.max(selStart!, selEnd!);
                    const selectedText = textElement.text.substring(start, end);
                    navigator.clipboard.writeText(selectedText).catch(console.error);

                    // Delete selected text
                    saveToHistory();
                    const newText = textElement.text.substring(0, start) + textElement.text.substring(end);
                    textElement.text = newText;

                    // Update cursor and selection
                    cursorPositionRef.current = start;
                    textSelectionStartRef.current = null;
                    textSelectionEndRef.current = null;

                    // Sync with contentEditable
                    if (textEditableRef.current) {
                        textEditableRef.current.textContent = newText;
                    }

                    scheduleRedraw();
                    return;
                }

                // Ctrl+V - Paste
                if (key === 'v') {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.readText().then(clipboardText => {
                        if (!clipboardText) return;

                        saveToHistory();

                        let newText: string;
                        let newCursorPos: number;

                        if (hasSelection) {
                            // Replace selection with pasted text
                            const start = Math.min(selStart!, selEnd!);
                            const end = Math.max(selStart!, selEnd!);
                            newText = textElement.text.substring(0, start) + clipboardText + textElement.text.substring(end);
                            newCursorPos = start + clipboardText.length;
                        } else {
                            // Insert at cursor position
                            const cursorPos = cursorPositionRef.current;
                            newText = textElement.text.substring(0, cursorPos) + clipboardText + textElement.text.substring(cursorPos);
                            newCursorPos = cursorPos + clipboardText.length;
                        }

                        textElement.text = newText;
                        cursorPositionRef.current = newCursorPos;
                        textSelectionStartRef.current = null;
                        textSelectionEndRef.current = null;

                        // Sync with contentEditable
                        if (textEditableRef.current) {
                            textEditableRef.current.textContent = newText;
                        }

                        scheduleRedraw();
                    }).catch(console.error);
                    return;
                }

                // Ctrl+A - Select all
                if (key === 'a') {
                    e.preventDefault();
                    e.stopPropagation();
                    textSelectionStartRef.current = 0;
                    textSelectionEndRef.current = textElement.text.length;
                    cursorPositionRef.current = textElement.text.length;

                    // Sync with contentEditable
                    if (textEditableRef.current) {
                        const selection = window.getSelection();
                        if (selection) {
                            const range = document.createRange();
                            range.selectNodeContents(textEditableRef.current);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                    }

                    scheduleRedraw();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [handleUndo, handleRedo, shortcuts, isSettingsOpen, editingTextId, clearCanvas, saveToHistory, scheduleRedraw, textsRef, strokesRef, selectedStrokesRef, selectedTextsRef, tool, setTool, setIsUIHidden]);
};
