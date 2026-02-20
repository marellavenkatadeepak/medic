'use client';

import React from 'react';
import { DailyProvider } from '@daily-co/daily-react';

interface CVIProviderProps {
    children: React.ReactNode;
}

export function CVIProvider({ children }: CVIProviderProps) {
    return (
        <DailyProvider>
            {children}
        </DailyProvider>
    );
}
