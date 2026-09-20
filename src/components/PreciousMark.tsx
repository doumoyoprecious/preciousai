import React from 'react';

interface PreciousMarkProps {
  className?: string;
  size?: number;
}

/**
 * Minimalist, natural, geometric mark representing Precious AI.
 * Elegant 4-pointed curvature (hypocycloid astroid / gem facet).
 * Works crisply at any size from 14px to 64px.
 */
export const PreciousMark: React.FC<PreciousMarkProps> = ({
  className = 'h-4 w-4',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <path d="M12 2C12 7.5228 7.5228 12 2 12C7.5228 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.5228 12 2Z" />
    </svg>
  );
};
