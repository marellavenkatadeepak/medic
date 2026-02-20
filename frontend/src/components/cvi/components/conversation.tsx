'use client';

import React from 'react';

interface ConversationProps {
    conversationUrl: string;
    onLeave?: () => void;
}

export function Conversation({ conversationUrl, onLeave }: ConversationProps) {
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
            <iframe
                src={conversationUrl}
                allow="camera; microphone; fullscreen; display-capture"
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '400px',
                    border: 'none',
                    borderRadius: '16px',
                    backgroundColor: '#000',
                }}
            />
            {onLeave && (
                <button
                    onClick={onLeave}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.8)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        zIndex: 10,
                    }}
                >
                    End Call
                </button>
            )}
        </div>
    );
}
