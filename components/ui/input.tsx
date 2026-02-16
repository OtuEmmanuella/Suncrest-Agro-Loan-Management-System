// components/ui/input.tsx
import React from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-secondary mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-lg border-2 border-sage bg-cream text-secondary',
            'focus:outline-none focus:border-primary transition-colors',
            'placeholder:text-sage disabled:bg-sage-light disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-secondary opacity-70">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
