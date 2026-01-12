import React from 'react';
import './grid.css';

// --- PageGrid ---
export interface PageGridProps {
    children: React.ReactNode;
    className?: string;
}

export const PageGrid: React.FC<PageGridProps> = ({
    children,
    className = ''
}) => {
    return (
        <div className={`page-grid ${className}`.trim()}>
            {children}
        </div>
    );
};

PageGrid.displayName = 'PageGrid';

// --- PageSection ---
export type SectionColumns = 1 | 2 | 3 | 4 | '1-2' | '2-1' | '1-3' | '3-1';
export type SectionGap = 'sm' | 'md' | 'lg';

export interface PageSectionProps {
    children: React.ReactNode;
    columns?: SectionColumns;
    gap?: SectionGap;
    className?: string;
}

export const PageSection: React.FC<PageSectionProps> = ({
    children,
    columns = 1,
    gap = 'md',
    className = ''
}) => {
    const colsClass = `page-section--cols-${columns}`;
    const gapClass = `page-section--gap-${gap}`;

    return (
        <div className={`page-section ${colsClass} ${gapClass} ${className}`.trim()}>
            {children}
        </div>
    );
};

PageSection.displayName = 'PageSection';

// --- PageHeader ---
export interface PageHeaderProps {
    title: React.ReactNode;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    actions,
    className = ''
}) => {
    return (
        <header className={`page-header ${className}`.trim()}>
            <div className="page-header__content">
                <h2 className="page-header__title">{title}</h2>
                {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
            </div>
            {actions && (
                <div className="page-header__actions">
                    {actions}
                </div>
            )}
        </header>
    );
};

PageHeader.displayName = 'PageHeader';

// --- PageSectionFull ---
export interface PageSectionFullProps {
    children: React.ReactNode;
    className?: string;
}

export const PageSectionFull: React.FC<PageSectionFullProps> = ({
    children,
    className = ''
}) => {
    return (
        <div className={`page-section__full ${className}`.trim()}>
            {children}
        </div>
    );
};

PageSectionFull.displayName = 'PageSectionFull';
