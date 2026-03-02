import { pipeline, env } from '@xenova/transformers';

// Configuration configures where models are loaded from
// By default, it uses the huggingface hub.
// For production, you could host these files on your own domain to avoid relying on a third party.
// Disable local models since we are loading remotely from HuggingFace
env.allowLocalModels = false;
env.useBrowserCache = true; // Use the browser cache!

class PipelineSingleton {
    static task = 'token-classification';
    // Using a fast, small, uncased BERT model fine-tuned for NER (Named Entity Recognition)
    static model = 'Xenova/bert-base-NER';
    static instance: any = null;

    static async getInstance(progress_callback?: Function) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task as any, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Map of sensitive entity types we want to redact.
const SENSITIVE_ENTITIES = new Set([
    'PER', // Person name
    'ORG', // Organization
    'LOC', // Location
]);

self.addEventListener('message', async (event) => {
    const { action, text } = event.data;

    if (action === 'REDACT') {
        try {
            // Inform main thread that model is loading
            self.postMessage({ status: 'loading' });

            const classifier = await PipelineSingleton.getInstance((x: any) => {
                // Return progress callbacks so we can show loading bar if we want
                self.postMessage({ status: 'progress', progress: x });
            });

            // Run the NER pipeline on the extracted text
            self.postMessage({ status: 'analyzing' });

            // Note: Transformers.js has a max token limit (usually 512). 
            // For long medical reports, we should split into chunks, but for MVP we will process in one go
            // or a simple chunking approach.

            // Simple chunking by sentences or paragraphs to avoid token limits
            const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
            let redactedText = '';

            for (const chunk of chunks) {
                if (chunk.trim().length === 0) continue;

                const results = await classifier(chunk, { ignore_labels: ['O'] });

                let chunkRedacted = chunk;
                // Process results in reverse so offsets don't change
                const sortedResults = [...results].sort((a, b) => b.start - a.start);

                for (const entity of sortedResults) {
                    // The model output format for Xenova/bert-base-NER might return B-PER, I-PER, etc.
                    const entityLabel = entity.entity_group || entity.entity; // Fallback for varying model outputs
                    const isSensitive = [...SENSITIVE_ENTITIES].some(t => entityLabel.includes(t));

                    if (isSensitive) {
                        const start = entity.start;
                        const end = entity.end;
                        // Redact the entity!
                        chunkRedacted = chunkRedacted.substring(0, start) + `[REDACTED]` + chunkRedacted.substring(end);
                    }
                }

                redactedText += chunkRedacted + ' ';
            }

            // Return the redacted text!
            self.postMessage({
                status: 'complete',
                redactedText: redactedText.trim()
            });

        } catch (error: any) {
            console.error("Worker error during redaction:", error);
            self.postMessage({ status: 'error', error: error.message });
        }
    }
});
