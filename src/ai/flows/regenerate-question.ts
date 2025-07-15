'use server';

/**
 * @fileOverview A flow to regenerate a single question using the Gemini API.
 *
 * - regenerateQuestion - A function that handles the question regeneration process.
 * - RegenerateQuestionInput - The input type for the regenerateQuestion function.
 * - RegenerateQuestionOutput - The return type for the regenerateQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the schema for the input of the question regeneration flow.
 */
const RegenerateQuestionInputSchema = z.object({
  questionType: z.enum(['Fill-in-the-Blank', 'MCQ', 'True/False']),
  originalQuestion: z.string().describe('The original question to be regenerated.'),
  context: z.string().describe('The context from the PDF document used to generate the question.'),
});
export type RegenerateQuestionInput = z.infer<typeof RegenerateQuestionInputSchema>;

/**
 * Defines the schema for the output of the question regeneration flow.
 */
const RegenerateQuestionOutputSchema = z.object({
  regeneratedQuestion: z.string().describe('The regenerated question, which MUST include the answer prefixed with "Answer:".'),
});
export type RegenerateQuestionOutput = z.infer<typeof RegenerateQuestionOutputSchema>;

/**
 * A wrapper function that calls the Genkit flow to regenerate a question.
 * @param input The input data for question regeneration.
 * @returns A promise that resolves to the regenerated question.
 */
export async function regenerateQuestion(input: RegenerateQuestionInput): Promise<RegenerateQuestionOutput> {
  return regenerateQuestionFlow(input);
}

/**
 * The Genkit prompt that instructs the AI model on how to regenerate a question.
 */
const regenerateQuestionPrompt = ai.definePrompt({
  name: 'regenerateQuestionPrompt',
  input: {schema: RegenerateQuestionInputSchema},
  output: {schema: RegenerateQuestionOutputSchema},
  prompt: `You are an expert in generating exam questions for undergraduate students.

You are given an original question, its type, and the context it was based on. Your task is to generate a new, different question of the same type based on the same context.

The new question MUST be relevant and helpful. Crucially, your response must include the answer prefixed with "Answer:".

Question Type: {{{questionType}}}
Original Question: {{{originalQuestion}}}
Context: {{{context}}}
`,
});

/**
 * The Genkit flow that orchestrates the question regeneration process.
 */
const regenerateQuestionFlow = ai.defineFlow(
  {
    name: 'regenerateQuestionFlow',
    inputSchema: RegenerateQuestionInputSchema,
    outputSchema: RegenerateQuestionOutputSchema,
  },
  async input => {
    const {output} = await regenerateQuestionPrompt(input);
    return {regeneratedQuestion: output!.regeneratedQuestion};
  }
);
