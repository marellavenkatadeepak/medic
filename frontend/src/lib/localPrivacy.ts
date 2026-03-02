import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import Tesseract from 'tesseract.js';

// Set up the worker using the CDN (v3 uses .js, not .mjs — no dynamic import issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text from a File object (PDF or Image)
 */
export async function extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
        return await extractPdfText(file);
    } else if (fileType.startsWith('image/')) {
        return await extractImageText(file);
    } else if (fileType === 'text/plain') {
        return await file.text();
    } else {
        throw new Error(`Unsupported file type for local processing: ${fileType}`);
    }
}

/**
 * Helper to extract text from PDF using pdfjs-dist
 */
async function extractPdfText(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }

        return fullText.trim();
    } catch (error: any) {
        console.error('Error extracting PDF text:', error);
        throw new Error(`Failed to extract text from PDF locally. Details: ${error?.message || error}`);
    }
}

/**
 * Helper to extract text from images using Tesseract.js
 */
async function extractImageText(file: File): Promise<string> {
    try {
        const result = await Tesseract.recognize(
            file,
            'eng',
            { logger: (m) => console.log(m) } // Optional: track progress
        );
        return result.data.text.trim();
    } catch (error) {
        console.error('Error in OCR:', error);
        throw new Error('Failed to perform OCR on image locally.');
    }
}
