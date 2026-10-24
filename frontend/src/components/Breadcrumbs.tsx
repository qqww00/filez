import React, { useEffect, useRef } from 'react';
import type { Breadcrumb } from '../types/files';

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
  disabled?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  breadcrumbs,
  onNavigate,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLElement>(null);

  // Automatically scroll to active child crumb on deep navigation
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [breadcrumbs]);

  return (
    <nav
      ref={containerRef}
      className="breadcrumbs-container"
      aria-label="Directory Breadcrumbs"
    >
      <ol className="breadcrumbs-list">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;

          return (
            <li key={crumb.path || 'root'} className="breadcrumb-item">
              {idx > 0 && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {crumb.name}
                </span>
              ) : (
                <button
                  type="button"
                  className="breadcrumb-link"
                  onClick={() => onNavigate(crumb.path)}
                  disabled={disabled}
                  title={`Navigate to ${crumb.name}`}
                >
                  {crumb.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
