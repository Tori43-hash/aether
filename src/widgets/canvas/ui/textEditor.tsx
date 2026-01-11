import React, { useEffect, useRef } from 'react';
import { TextElement } from 'entities/canvas';
import { updateRunsFromText, getFullText } from '../lib/utils/richText';

interface WhiteboardTextEditorProps {
    textElement: TextElement;
    editingTextId: string;
    editingTextOriginalValue: string;
    setEditingTextId: (id: string | null) => void;
    setEditingTextValue: (val: string) => void;
    setEditingTextOriginalValue: (val: string) => void;
    setEditingTextPosition: (pos: { x: number, y: number } | null) => void;
    finishEditing: () => void;
    scheduleRedraw: () => void;
    cursorPositionRef: React.MutableRefObject<number>;
    textSelectionStartRef: React.MutableRefObject<number | null>;
    textSelectionEndRef: React.MutableRefObject<number | null>;
    isCursorVisibleRef: React.MutableRefObject<boolean>;
    textEditableRef: React.RefObject<HTMLDivElement>;
    editingTextValue: string;
    isCreatingTextRef: React.MutableRefObject<boolean>;
    onTextChange?: () => void;
}

export const WhiteboardTextEditor: React.FC<WhiteboardTextEditorProps> = ({
    textElement,
    editingTextId,
    editingTextOriginalValue,
    setEditingTextId,
    setEditingTextValue,
    setEditingTextOriginalValue,
    setEditingTextPosition,
    finishEditing,
    scheduleRedraw,
    cursorPositionRef,
    textSelectionStartRef,
    textSelectionEndRef,
    isCursorVisibleRef,
    textEditableRef,
    editingTextValue,
    isCreatingTextRef,
    onTextChange
}) => {

    // Helper to get character offset from range endpoint
    const getCharacterOffset = (container: Node, offset: number): number => {
        if (!textEditableRef.current) return 0;

        const range = document.createRange();
        range.selectNodeContents(textEditableRef.current);
        range.setEnd(container, offset);

        const clonedContent = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(clonedContent);

        const htmlContent = tempDiv.innerHTML;
        const textWithBrAsNewline = htmlContent.replace(/<br\s*\/?>/gi, '\n');
        const tempDiv2 = document.createElement('div');
        tempDiv2.innerHTML = textWithBrAsNewline;
        return tempDiv2.textContent?.length || 0;
    };

    // Helper to calculate cursor position and selection range
    // Only called for keyboard/DOM-based interactions, NOT for canvas mouse drag
    const updateCursorAndSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && textEditableRef.current) {
            const range = selection.getRangeAt(0);

            // Get cursor position (end of selection)
            const cursorPos = getCharacterOffset(range.endContainer, range.endOffset);
            cursorPositionRef.current = textElement ? Math.min(cursorPos, textElement.text.length) : cursorPos;

            // Get selection range - only update our refs if DOM has an actual selection
            // This prevents canvas mouse drag selection from being cleared by DOM events
            // Also skip if we're creating new text - we want DOM selection for replacement
            // but not visual canvas selection
            if (!selection.isCollapsed && !isCreatingTextRef.current) {
                // Has selection from DOM - update our refs
                const startPos = getCharacterOffset(range.startContainer, range.startOffset);
                const endPos = cursorPos;
                textSelectionStartRef.current = Math.min(startPos, textElement?.text.length || startPos);
                textSelectionEndRef.current = Math.min(endPos, textElement?.text.length || endPos);
            }
            // Note: Don't clear selection refs when DOM selection is collapsed
            // Canvas mouse drag sets selection refs directly and shouldn't be overwritten

            isCursorVisibleRef.current = true;
            scheduleRedraw();
        }
    };

    return (
        <div
            ref={textEditableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => {
                if (!textEditableRef.current) return;

                // Convert <br> to \n for storage
                const clone = textEditableRef.current.cloneNode(true) as HTMLElement;
                const brElements = clone.querySelectorAll('br');
                brElements.forEach(br => {
                    const textNode = document.createTextNode('\n');
                    br.parentNode?.replaceChild(textNode, br);
                });
                let textWithNewlines = (clone.textContent || '').replace(/\u00A0/g, ' ');

                if (textElement) {
                    // Update runs to preserve styles while changing text
                    if (textElement.runs) {
                        textElement.runs = updateRunsFromText(textElement.runs, textWithNewlines);
                        textElement.text = getFullText(textElement.runs);
                    } else {
                        textElement.text = textWithNewlines;
                        textElement.runs = [{ text: textWithNewlines }];
                    }
                }

                // Clear selection after any input - selected text was replaced/deleted
                textSelectionStartRef.current = null;
                textSelectionEndRef.current = null;

                updateCursorAndSelection();

                // Notify parent of text change to trigger re-render / layout updates
                if (onTextChange) {
                    onTextChange();
                }
            }}
            onBlur={(e) => {
                // Check if the new focus target is inside the toolbar
                const relatedTarget = e.relatedTarget as HTMLElement;
                const isToolbarInteraction = relatedTarget?.closest('[data-text-toolbar="true"]');

                if (isToolbarInteraction) {
                    return;
                }

                // Clear selection on blur
                textSelectionStartRef.current = null;
                textSelectionEndRef.current = null;
                // Don't finish editing if we just created text (tool is switching)
                if (!isCreatingTextRef.current) {
                    finishEditing();
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    // Enter: Finish editing
                    e.preventDefault();
                    finishEditing();
                } else if (e.key === 'Enter' && e.shiftKey) {
                    // Shift + Enter: Allow default behavior (insert newline)
                    e.stopPropagation();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (textElement) {
                        textElement.text = editingTextOriginalValue; // Restore original
                        if (textEditableRef.current) {
                            textEditableRef.current.textContent = editingTextOriginalValue;
                        }
                    }
                    setEditingTextId(null);
                    setEditingTextValue('');
                    setEditingTextOriginalValue('');
                    setEditingTextPosition(null);
                    textSelectionStartRef.current = null;
                    textSelectionEndRef.current = null;
                    scheduleRedraw();
                } else {
                    // For arrow keys and other navigation, update selection after a microtask
                    setTimeout(updateCursorAndSelection, 0);
                }
            }}
            style={{
                position: 'fixed',
                left: '-9999px',
                top: '-9999px',
                fontSize: `${textElement.fontSize}px`,
                color: textElement.color,
                background: 'transparent',
                outline: 'none',
                border: 'none',
                padding: '2px',
                margin: '0',
                zIndex: 1000,
                minWidth: '20px',
                fontFamily: 'sans-serif',
                pointerEvents: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                caretColor: textElement.color,
                lineHeight: `${textElement.fontSize * 1.2}px`,
                borderRadius: '2px',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyUp={updateCursorAndSelection}
            onMouseUp={updateCursorAndSelection}
            onSelect={updateCursorAndSelection}
        />
    );
};
