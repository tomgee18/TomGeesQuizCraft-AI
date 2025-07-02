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

const IntelligentlyChunkDocumentInputSchema = z.object({
  documentContent: z.string().describe('The content of the document to chunk.'),
});
export type IntelligentlyChunkDocumentInput = z.infer<
  typeof IntelligentlyChunkDocumentInputSchema
>;

const IntelligentlyChunkDocumentOutputSchema = z.array(z.string());
export type IntelligentlyChunkDocumentOutput = z.infer<
  typeof IntelligentlyChunkDocumentOutputSchema
>;

export async function intelligentlyChunkDocument(
  input: IntelligentlyChunkDocumentInput
): Promise<IntelligentlyChunkDocumentOutput> {
  return intelligentlyChunkDocumentFlow(input);
}

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
    const sentences = documentContent.split(/[.\n]/);

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= chunkSize) {
        currentChunk += sentence + '. ';
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence + '. ';
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
);
