// Rich Text utility functions for run-based text formatting

import { TextRun } from '../types';

/**
 * Get full text from runs array
 */
export const getFullText = (runs: TextRun[]): string => {
    return runs.map(run => run.text).join('');
};

/**
 * Convert plain text to single run (for new text or backward compatibility)
 */
export const textToRuns = (text: string): TextRun[] => {
    if (!text) return [{ text: '' }];
    return [{ text }];
};

/**
 * Check if two runs have identical styles
 */
const runsHaveSameStyle = (a: TextRun, b: TextRun): boolean => {
    return (
        !!a.bold === !!b.bold &&
        !!a.italic === !!b.italic &&
        !!a.strikethrough === !!b.strikethrough
    );
};

/**
 * Normalize runs by merging adjacent runs with identical styles
 */
export const normalizeRuns = (runs: TextRun[]): TextRun[] => {
    if (runs.length === 0) return [{ text: '' }];

    const result: TextRun[] = [];
    let current: TextRun = { ...runs[0] };

    for (let i = 1; i < runs.length; i++) {
        const run = runs[i];
        if (runsHaveSameStyle(current, run)) {
            current.text += run.text;
        } else {
            if (current.text.length > 0) {
                result.push(current);
            }
            current = { ...run };
        }
    }

    if (current.text.length > 0 || result.length === 0) {
        result.push(current);
    }

    return result.length > 0 ? result : [{ text: '' }];
};

/**
 * Split runs at given character indices
 */
export const splitRunsAtIndices = (runs: TextRun[], indices: number[]): TextRun[] => {
    if (indices.length === 0) return runs.map(r => ({ ...r }));

    const sortedIndices = [...new Set(indices)].sort((a, b) => a - b);

    const result: TextRun[] = [];
    let charIndex = 0;
    let indexPtr = 0;

    for (const run of runs) {
        const runStart = charIndex;
        const runEnd = charIndex + run.text.length;

        const splitsInRun: number[] = [];
        while (indexPtr < sortedIndices.length && sortedIndices[indexPtr] < runEnd) {
            const idx = sortedIndices[indexPtr];
            if (idx > runStart) {
                splitsInRun.push(idx - runStart);
            }
            indexPtr++;
        }

        if (splitsInRun.length === 0) {
            result.push({ ...run });
        } else {
            let lastSplit = 0;
            for (const splitPos of splitsInRun) {
                if (splitPos > lastSplit) {
                    result.push({
                        text: run.text.slice(lastSplit, splitPos),
                        bold: run.bold,
                        italic: run.italic,
                        strikethrough: run.strikethrough
                    });
                }
                lastSplit = splitPos;
            }
            if (lastSplit < run.text.length) {
                result.push({
                    text: run.text.slice(lastSplit),
                    bold: run.bold,
                    italic: run.italic,
                    strikethrough: run.strikethrough
                });
            }
        }

        charIndex = runEnd;
    }

    return result;
};

/**
 * Apply or toggle a style to a range of text
 */
export const applyStyleToRange = (
    runs: TextRun[],
    start: number,
    end: number,
    style: 'bold' | 'italic' | 'strikethrough'
): TextRun[] => {
    if (start === end || start < 0) return runs;

    const selStart = Math.min(start, end);
    const selEnd = Math.max(start, end);

    const splitRuns = splitRunsAtIndices(runs, [selStart, selEnd]);

    let charIndex = 0;
    let allHaveStyle = true;

    for (const run of splitRuns) {
        const runStart = charIndex;
        const runEnd = charIndex + run.text.length;

        if (runStart >= selStart && runEnd <= selEnd && run.text.length > 0) {
            if (!run[style]) {
                allHaveStyle = false;
                break;
            }
        }
        charIndex = runEnd;
    }

    charIndex = 0;
    const newRuns = splitRuns.map(run => {
        const runStart = charIndex;
        const runEnd = charIndex + run.text.length;
        charIndex = runEnd;

        if (runStart >= selStart && runEnd <= selEnd) {
            return {
                ...run,
                [style]: !allHaveStyle
            };
        }

        return run;
    });

    return normalizeRuns(newRuns);
};

/**
 * Deep copy runs array
 */
export const deepCopyRuns = (runs: TextRun[]): TextRun[] => {
    return runs.map(run => ({ ...run }));
};

/**
 * Get style at a specific character position (returns style of char at pos-1, i.e. before cursor)
 */
const getStyleAtPosition = (runs: TextRun[], pos: number): Partial<TextRun> => {
    if (pos <= 0 && runs.length > 0) {
        // At start, use first run's style
        const first = runs[0];
        return { bold: first.bold, italic: first.italic, strikethrough: first.strikethrough };
    }

    // We want the style of character at position (pos - 1)
    const targetPos = pos - 1;
    let charIndex = 0;

    for (const run of runs) {
        const runEnd = charIndex + run.text.length;
        // If targetPos is within this run
        if (targetPos >= charIndex && targetPos < runEnd) {
            return { bold: run.bold, italic: run.italic, strikethrough: run.strikethrough };
        }
        charIndex = runEnd;
    }

    // Past the end - use last run's style
    if (runs.length > 0) {
        const last = runs[runs.length - 1];
        return { bold: last.bold, italic: last.italic, strikethrough: last.strikethrough };
    }
    return {};
};

/**
 * Update text content in runs based on new text string
 * Preserves styles of unchanged portions and inherits style for new text
 */
export const updateRunsFromText = (runs: TextRun[], newText: string): TextRun[] => {
    const oldText = getFullText(runs);

    if (oldText === newText) return runs;
    if (!newText) return [{ text: '' }];

    // Debug: log input state
    console.log('[updateRunsFromText] runs:', JSON.stringify(runs));
    console.log('[updateRunsFromText] oldText:', oldText, '→ newText:', newText);

    // For single run, just update the text preserving style
    if (runs.length === 1) {
        console.log('[updateRunsFromText] Single run, preserving style:', runs[0].bold, runs[0].italic, runs[0].strikethrough);
        return [{ ...runs[0], text: newText }];
    }

    // Find where the change starts (common prefix)
    let changeStart = 0;
    while (changeStart < oldText.length && changeStart < newText.length &&
        oldText[changeStart] === newText[changeStart]) {
        changeStart++;
    }

    // Find where the change ends (common suffix)
    let oldSuffixStart = oldText.length;
    let newSuffixStart = newText.length;
    while (oldSuffixStart > changeStart && newSuffixStart > changeStart &&
        oldText[oldSuffixStart - 1] === newText[newSuffixStart - 1]) {
        oldSuffixStart--;
        newSuffixStart--;
    }

    // The inserted text
    const insertedText = newText.slice(changeStart, newSuffixStart);

    // Get style for inserted text from char BEFORE change position
    // getStyleAtPosition expects cursor position and internally looks at pos-1
    const insertStyle = getStyleAtPosition(runs, changeStart);

    // Build result by going through runs and extracting appropriate parts
    const result: TextRun[] = [];
    let pos = 0;
    let insertedAlready = false;

    for (const run of runs) {
        const runStart = pos;
        const runEnd = pos + run.text.length;

        // PART 1: Text before the change (prefix)
        if (runStart < changeStart && runEnd > runStart) {
            const prefixEnd = Math.min(runEnd, changeStart);
            const prefixText = run.text.slice(0, prefixEnd - runStart);
            if (prefixText) {
                // Try to merge with previous run if same style
                const lastRun = result[result.length - 1];
                if (lastRun && runsHaveSameStyle(lastRun, run)) {
                    lastRun.text += prefixText;
                } else {
                    result.push({ ...run, text: prefixText });
                }
            }
        }

        // PART 2: Insert new text at changeStart position (only once)
        if (!insertedAlready && runEnd >= changeStart && insertedText) {
            const lastRun = result[result.length - 1];
            if (lastRun && runsHaveSameStyle(lastRun, { text: '', ...insertStyle } as TextRun)) {
                lastRun.text += insertedText;
            } else {
                result.push({ text: insertedText, ...insertStyle });
            }
            insertedAlready = true;
        }

        // PART 3: Text after the change area (suffix) - using OLD text coordinates
        if (runEnd > oldSuffixStart) {
            const suffixStart = Math.max(runStart, oldSuffixStart);
            const suffixText = run.text.slice(suffixStart - runStart);
            if (suffixText) {
                const lastRun = result[result.length - 1];
                if (lastRun && runsHaveSameStyle(lastRun, run)) {
                    lastRun.text += suffixText;
                } else {
                    result.push({ ...run, text: suffixText });
                }
            }
        }

        pos = runEnd;
    }

    // Handle insertion at the very end of text
    if (!insertedAlready && insertedText) {
        const lastRun = result[result.length - 1];
        if (lastRun && runsHaveSameStyle(lastRun, { text: '', ...insertStyle } as TextRun)) {
            lastRun.text += insertedText;
        } else {
            result.push({ text: insertedText, ...insertStyle });
        }
    }

    // Safety fallback
    if (result.length === 0) {
        return [{ text: newText }];
    }

    const resultText = result.map(r => r.text).join('');
    if (resultText !== newText) {
        // Debug: something went wrong, fall back to simple merge
        return [{ text: newText, ...insertStyle }];
    }

    return normalizeRuns(result);
};
