import React, { useMemo, useCallback } from 'react';

import { useLayoutConfig } from '../../../shared';

interface MainLayoutProps {
    children: React.ReactNode;
    currentTab: string;
    navPosition: 'bottom' | 'top' | 'left' | 'right';
    containerRef?: React.RefObject<HTMLDivElement>;
}

export const MainLayout: React.FC<MainLayoutProps & { sidebar: React.ReactNode }> = ({
    children,
    currentTab,
    navPosition,
    containerRef,
    sidebar
}) => {
    const layoutConfig = useLayoutConfig();

    const getLayoutPadding = useCallback(() => {
        const basePaddingX = `clamp(16px, 8vw, ${layoutConfig.layoutConfig.paddingX}px)`;
        const basePaddingY = `clamp(24px, 5vh, ${layoutConfig.layoutConfig.paddingY}px)`;

        switch (navPosition) {
            case 'bottom': return { paddingLeft: basePaddingX, paddingRight: basePaddingX, paddingTop: basePaddingY, paddingBottom: '120px' };
            case 'top': return { paddingLeft: basePaddingX, paddingRight: basePaddingX, paddingTop: '120px', paddingBottom: basePaddingY };
            case 'left': return { paddingLeft: '120px', paddingRight: basePaddingX, paddingTop: basePaddingY, paddingBottom: basePaddingY };
            case 'right': return { paddingLeft: basePaddingX, paddingRight: '120px', paddingTop: basePaddingY, paddingBottom: basePaddingY };
            default: return { paddingLeft: basePaddingX, paddingRight: basePaddingX, paddingTop: basePaddingY, paddingBottom: basePaddingY };
        }
    }, [navPosition, layoutConfig.layoutConfig.paddingX, layoutConfig.layoutConfig.paddingY]);

    const containerStyles = useMemo(() => {
        const needsWideLayout = currentTab === 'journal' || currentTab === 'dashboard' || currentTab === 'stats' || currentTab === 'traders';
        if (needsWideLayout) {
            const journalPadding = getLayoutPadding();
            return {
                maxWidth: '1800px',
                paddingLeft: 'clamp(16px, 8vw, 80px)',
                paddingRight: 'clamp(16px, 8vw, 80px)',
                paddingTop: journalPadding.paddingTop,
                paddingBottom: journalPadding.paddingBottom,
            };
        } else {
            const normalPadding = getLayoutPadding();
            return {
                maxWidth: `${layoutConfig.layoutConfig.maxWidth}px`,
                ...normalPadding,
            };
        }
    }, [currentTab, getLayoutPadding, layoutConfig.layoutConfig.maxWidth]);

    return (
        <div
            className="min-h-screen bg-white overflow-x-hidden"
            style={{
                '--chart-height': `clamp(250px, 40vh, ${layoutConfig.layoutConfig.chartHeight}px)`,
                '--scale-heading': layoutConfig.textConfig.headingScale,
                '--scale-body': layoutConfig.textConfig.bodyScale,
                '--scale-small': layoutConfig.textConfig.smallScale,
            } as React.CSSProperties}
        >
            {sidebar}

            <main className="w-full relative">
                <div
                    ref={containerRef}
                    className="mx-auto box-border"
                    style={containerStyles}
                >
                    {children}
                </div>
            </main>
        </div>
    );
};
