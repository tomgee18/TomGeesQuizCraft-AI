'use server';
/**
 * @fileOverview Manages the secure input of a Gemini API key.
 *
 * This file defines a Genkit flow that takes a Gemini API key as input.
 * The key is intended to be used temporarily within the user's session and
 * is not stored on any backend. This flow is more of a placeholder to demonstrate
 * the concept and doesn't perform any real validation.
 *
 * - secureApiKeyInput - A function that takes the API key as input and returns a confirmation message.
 * - SecureApiKeyInputType - The input type for the secureApiKeyInput function.
 * - SecureApiKeyOutputType - The return type for the secureApiKeyInput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the schema for the API key input.
 */
const SecureApiKeyInputSchema = z.object({
  apiKey: z
    .string()
    .describe('The Gemini API key provided by the user.'),
});
export type SecureApiKeyInputType = z.infer<typeof SecureApiKeyInputSchema>;

/**
 * Defines the schema for the API key confirmation output.
 */
const SecureApiKeyOutputSchema = z.object({
  message: z
    .string()
    .describe('A confirmation message indicating the API key has been received.'),
});
export type SecureApiKeyOutputType = z.infer<typeof SecureApiKeyOutputSchema>;

/**
 * A wrapper function that calls the Genkit flow to handle the API key input.
 * @param input The API key provided by the user.
 * @returns A promise that resolves to a confirmation message.
 */
export async function secureApiKeyInput(input: SecureApiKeyInputType): Promise<SecureApiKeyOutputType> {
  return secureApiKeyInputFlow(input);
}

/**
 * The Genkit prompt to confirm receipt of the API key.
 */
const prompt = ai.definePrompt({
  name: 'secureApiKeyInputPrompt',
  input: {schema: SecureApiKeyInputSchema},
  output: {schema: SecureApiKeyOutputSchema},
  prompt: `You have received a Gemini API key from the user.

  API Key: {{{apiKey}}}

  Confirm that you have received the API key and that it will only be used temporarily and not stored on any backend.
  Return a simple confirmation message to the user.
  `,
});

/**
 * The Genkit flow that processes the API key input.
 */
const secureApiKeyInputFlow = ai.defineFlow(
  {
    name: 'secureApiKeyInputFlow',
    inputSchema: SecureApiKeyInputSchema,
    outputSchema: SecureApiKeyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
