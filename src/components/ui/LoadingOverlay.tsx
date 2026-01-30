
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    message?: string;
    className?: string; // Allow custom styling/positioning overrides
}

export function LoadingOverlay({ message = "Loading...", className }: LoadingOverlayProps) {
    return (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in duration-300 ${className}`}>
            <div className="relative flex items-center justify-center">
                {/* "Purple Haze" Glow Effect behind the spinner */}
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full scale-150 animate-pulse" />

                {/* Primary Purple Spinner */}
                <Loader2 className="relative h-10 w-10 animate-spin text-primary drop-shadow-[0_0_8px_rgba(85,36,131,0.5)]" />
            </div>
            {message && (
                <p className="mt-4 text-sm font-medium text-primary/80 animate-pulse tracking-wide">
                    {message}
                </p>
            )}
        </div>
    );
}
