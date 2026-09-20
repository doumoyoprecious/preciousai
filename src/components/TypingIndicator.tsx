import React from 'react';
import { PreciousMark } from './PreciousMark.js';

interface TypingIndicatorProps {
  className?: string;
}

/**
 * Modern, minimalist typing indicator for Precious AI.
 * Displays: Precious AI icon + subtle "Precious AI" label + three gently pulsing dots.
 * Compact, lightweight, responsive on mobile and desktop without causing layout shift.
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className = '' }) => {
  return (
    <div
      id="ai-typing-indicator"
      className={`flex items-center gap-2.5 py-2 px-1 select-none ${className}`}
      aria-live="polite"
      aria-label="Precious AI is generating a response"
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs">
        <PreciousMark className="h-3 w-3" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium tracking-tight text-zinc-600 dark:text-zinc-300">
          Precious AI
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
            style={{ animationDelay: '180ms', animationDuration: '1s' }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
            style={{ animationDelay: '360ms', animationDuration: '1s' }}
          />
        </span>
      </div>
    </div>
  );
};
