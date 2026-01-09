// Shared UI - Debounced Color Input
// FSD: shared/ui/inputs

import React, { useRef, useEffect } from 'react';

interface DebouncedColorInputProps {
    initialColor: string;
    onColorChange: (color: string) => void;
    onActive: () => void;
}

/**
 * High-performance color picker
 * Uses refs to avoid React re-renders during dragging
 */
export const DebouncedColorInput: React.FC<DebouncedColorInputProps> = ({
    initialColor,
    onColorChange,
    onActive
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (inputRef.current && inputRef.current.value !== initialColor) {
            inputRef.current.value = initialColor;
        }
    }, [initialColor]);

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
        onActive();
        const val = e.currentTarget.value;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onColorChange(val);
        }, 200);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return (
        <input
            ref={inputRef}
            type="color"
            defaultValue={initialColor}
            onInput={handleInput}
            onClick={(e) => e.stopPropagation()}
        />
    );
};

DebouncedColorInput.displayName = 'DebouncedColorInput';
