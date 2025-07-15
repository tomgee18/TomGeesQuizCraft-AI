'use server';
/**
 * @fileOverview Handles the intelligent chunking of uploaded documents into segments
 * suitable for the Gemini Pro API.
 *
 * - intelligentlyChunkDocument - A function that chunks the document content.
 * - IntelligentlyChunkDocumentInput - The input type for the intelligentlyChunkDocument function.
 * - IntelligentlyChunkDocumentOutput - The return type for the intelligentlyChunkDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the schema for the input of the document chunking flow.
 */
const IntelligentlyChunkDocumentInputSchema = z.object({
  documentContent: z.string().describe('The content of the document to chunk.'),
});
export type IntelligentlyChunkDocumentInput = z.infer<
  typeof IntelligentlyChunkDocumentInputSchema
>;

/**
 * Defines the schema for the output of the document chunking flow.
 */
const IntelligentlyChunkDocumentOutputSchema = z.array(z.string());
export type IntelligentlyChunkDocumentOutput = z.infer<
  typeof IntelligentlyChunkDocumentOutputSchema
>;

/**
 * A wrapper function that calls the Genkit flow to chunk the document.
 * @param input The document content to be chunked.
 * @returns A promise that resolves to an array of text chunks.
 */
export async function intelligentlyChunkDocument(
  input: IntelligentlyChunkDocumentInput
): Promise<IntelligentlyChunkDocumentOutput> {
  return intelligentlyChunkDocumentFlow(input);
}

/**
 * The Genkit flow that performs the document chunking.
 * This flow splits a large text into smaller, manageable chunks based on sentence boundaries
 * and a target chunk size. This is a simple heuristic and does not use an AI model.
 */
const intelligentlyChunkDocumentFlow = ai.defineFlow(
  {
    name: 'intelligentlyChunkDocumentFlow',
    inputSchema: IntelligentlyChunkDocumentInputSchema,
    outputSchema: IntelligentlyChunkDocumentOutputSchema,
  },
  async input => {
    const {documentContent} = input;
    const chunkSize = 1300; // Aim for 1000-1500 words per chunk
    const chunks: string[] = [];
    let currentChunk = '';
    // Split text by periods or newlines to approximate sentences.
    const sentences = documentContent.split(/[.\n]/);

    for (const sentence of sentences) {
      // If adding the next sentence doesn't exceed the chunk size, add it.
      if (currentChunk.length + sentence.length + 1 <= chunkSize) {
        currentChunk += sentence + '. ';
      } else {
        // Otherwise, push the current chunk and start a new one.
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence + '. ';
      }
    }

    // Add the last remaining chunk.
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
);
