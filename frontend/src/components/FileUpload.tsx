'use client';

import { useCallback, useState, useRef } from 'react';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    isUploading: boolean;
    accept?: string;
}

export default function FileUpload({ onFileSelect, isUploading, accept = '.pdf,.jpg,.jpeg,.png,.webp' }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(e.type === 'dragenter' || e.type === 'dragover');
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setFileName(file.name);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            onFileSelect(file);
        }
    }, [onFileSelect]);

    return (
        <div
            onClick={() => !isUploading && inputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${isDragging
                ? 'border-indigo-400 bg-[rgba(99,102,241,0.1)]'
                : 'border-gray-700 hover:border-indigo-500/50 hover:bg-[rgba(99,102,241,0.05)]'
                } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        >
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />

            {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-10 w-10 text-indigo-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <p className="text-indigo-300 font-medium">Processing report...</p>
                    <p className="text-gray-500 text-sm">AI is analyzing your medical document</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    {fileName ? (
                        <p className="text-indigo-300 font-medium">{fileName}</p>
                    ) : (
                        <>
                            <p className="text-gray-300 font-medium">Drop your medical report here</p>
                            <p className="text-gray-500 text-sm">PDF, JPG, PNG — up to 10MB</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
