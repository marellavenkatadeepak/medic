'use client';

import { useState, useEffect } from 'react';

interface TypewriterProps {
    text: string | string[];
    speed?: number;
    delay?: number;
    className?: string;
    loop?: boolean;
}

export default function Typewriter({
    text,
    speed = 50,
    delay = 2000,
    className = '',
    loop = true
}: TypewriterProps) {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [textIndex, setTextIndex] = useState(0);

    const texts = Array.isArray(text) ? text : [text];
    const currentText = texts[textIndex];

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const handleType = () => {
            if (isDeleting) {
                setDisplayText(currentText.substring(0, currentIndex - 1));
                setCurrentIndex(prev => prev - 1);
            } else {
                setDisplayText(currentText.substring(0, currentIndex + 1));
                setCurrentIndex(prev => prev + 1);
            }
        };

        if (!isDeleting && currentIndex === currentText.length) {
            if (!loop && textIndex === texts.length - 1) return;
            timer = setTimeout(() => setIsDeleting(true), delay);
        } else if (isDeleting && currentIndex === 0) {
            setIsDeleting(false);
            setTextIndex(prev => (prev + 1) % texts.length);
        } else {
            const typingSpeed = isDeleting ? speed / 2 : speed;
            timer = setTimeout(handleType, typingSpeed);
        }

        return () => clearTimeout(timer);
    }, [currentIndex, isDeleting, currentText, delay, speed, loop, textIndex, texts.length]);

    return (
        <span className={className}>
            {displayText}
            <span className="animate-pulse">|</span>
        </span>
    );
}
