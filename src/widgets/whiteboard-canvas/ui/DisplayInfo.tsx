// Display Info Component (Coordinates & Zoom)

import React from 'react';
import { DisplayPosition, DisplaySize } from 'entities/whiteboard';

interface DisplayInfoProps {
    showCoordinates: boolean;
    showZoom: boolean;
    mousePosition: { x: number; y: number } | null;
    currentZoom: number;
    displayPosition: DisplayPosition;
    displaySize: DisplaySize;
}

export const DisplayInfo: React.FC<DisplayInfoProps> = ({
    showCoordinates,
    showZoom,
    mousePosition,
    currentZoom,
    displayPosition,
    displaySize,
}) => {
    if (!showCoordinates && !showZoom) return null;

    const positionClasses = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4'
    };

    const sizeClasses = {
        'small': 'text-xs p-2',
        'medium': 'text-sm p-3',
        'large': 'text-base p-4'
    };

    const textSizeClasses = {
        'small': 'text-xs',
        'medium': 'text-sm',
        'large': 'text-base'
    };

    return (
        <div className={`absolute ${positionClasses[displayPosition]} z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg ${sizeClasses[displaySize]} space-y-1`}>
            {showCoordinates && mousePosition && (
                <div className={`text-slate-600 font-mono ${textSizeClasses[displaySize]}`}>
                    {mousePosition.x.toFixed(0)}, {mousePosition.y.toFixed(0)}
                </div>
            )}
            {showZoom && (
                <div className={`text-slate-600 font-mono ${textSizeClasses[displaySize]}`}>
                    {(currentZoom * 100).toFixed(0)}%
                </div>
            )}
        </div>
    );
};

DisplayInfo.displayName = 'DisplayInfo';
