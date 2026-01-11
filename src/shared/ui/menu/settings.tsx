import React from 'react';
import { WrapText, Check } from 'lucide-react';

export interface ViewSettingsMenuProps {
    isTextWrapEnabled: boolean;
    setIsTextWrapEnabled: (v: boolean) => void;
}

/**
 * A settings menu for view-related options like text wrapping.
 */
export const ViewSettingsMenu: React.FC<ViewSettingsMenuProps> = ({
    isTextWrapEnabled,
    setIsTextWrapEnabled
}) => {
    return (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl z-50 p-2 animate-fade-in origin-top-right">
            <div className="px-3 py-2 flex items-center justify-between border-b border-slate-50 mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">View Settings</span>
            </div>
            <div className="space-y-1">
                <button
                    onClick={() => setIsTextWrapEnabled(!isTextWrapEnabled)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-slate-50 text-left group"
                >
                    <div className="flex items-center gap-3">
                        <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                            <WrapText className="w-4 h-4 stroke-[1.5]" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                            Text Wrap
                        </span>
                    </div>
                    {isTextWrapEnabled && <Check className="w-4 h-4 text-blue-500" />}
                </button>
            </div>
        </div>
    );
};

ViewSettingsMenu.displayName = 'ViewSettingsMenu';
