'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: string | ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    variant?: 'no-data' | 'no-results' | 'error';
}

export function EmptyState({
    icon = '📦',
    title,
    description,
    action,
    variant = 'no-data',
}: EmptyStateProps) {
    const getIconColor = () => {
        switch (variant) {
            case 'error':
                return 'text-red-500';
            case 'no-results':
                return 'text-yellow-500';
            default:
                return 'text-slate-500';
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className={`text-6xl mb-4 ${typeof icon === 'string' ? '' : getIconColor()}`}>
                {icon}
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
                {title}
            </h3>

            {description && (
                <p className="text-slate-400 max-w-md mb-6">
                    {description}
                </p>
            )}

            {action && (
                action.href ? (
                    <Link href={action.href}>
                        <Button>{action.label}</Button>
                    </Link>
                ) : (
                    <Button onClick={action.onClick}>{action.label}</Button>
                )
            )}
        </div>
    );
}

// Specialized variants for common use cases

interface NoDataProps {
    resource: string;
    createHref?: string;
    onCreateClick?: () => void;
}

export function NoData({ resource, createHref, onCreateClick }: NoDataProps) {
    return (
        <EmptyState
            icon="📦"
            title={`No ${resource} yet`}
            description={`Get started by creating your first ${resource.toLowerCase()}`}
            action={
                createHref || onCreateClick
                    ? {
                        label: `Create ${resource}`,
                        href: createHref,
                        onClick: onCreateClick,
                    }
                    : undefined
            }
            variant="no-data"
        />
    );
}

interface NoResultsProps {
    searchTerm?: string;
    onClearFilters?: () => void;
}

export function NoResults({ searchTerm, onClearFilters }: NoResultsProps) {
    return (
        <EmptyState
            icon="🔍"
            title="No results found"
            description={
                searchTerm
                    ? `No results for "${searchTerm}". Try adjusting your search or filters.`
                    : 'No results match your current filters. Try adjusting them.'
            }
            action={
                onClearFilters
                    ? {
                        label: 'Clear Filters',
                        onClick: onClearFilters,
                    }
                    : undefined
            }
            variant="no-results"
        />
    );
}

interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
}

export function ErrorState({
    title = 'Something went wrong',
    description = 'An error occurred while loading this content. Please try again.',
    onRetry,
}: ErrorStateProps) {
    return (
        <EmptyState
            icon="⚠️"
            title={title}
            description={description}
            action={
                onRetry
                    ? {
                        label: 'Try Again',
                        onClick: onRetry,
                    }
                    : undefined
            }
            variant="error"
        />
    );
}
