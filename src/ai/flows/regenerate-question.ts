// src/ai/flows/regenerate-question.ts
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

const RegenerateQuestionInputSchema = z.object({
  questionType: z.enum(['Fill-in-the-Blank', 'MCQ', 'True/False']),
  originalQuestion: z.string().describe('The original question to be regenerated.'),
  context: z.string().describe('The context from the PDF document used to generate the question.'),
});
export type RegenerateQuestionInput = z.infer<typeof RegenerateQuestionInputSchema>;

const RegenerateQuestionOutputSchema = z.object({
  regeneratedQuestion: z.string().describe('The regenerated question.'),
});
export type RegenerateQuestionOutput = z.infer<typeof RegenerateQuestionOutputSchema>;

export async function regenerateQuestion(input: RegenerateQuestionInput): Promise<RegenerateQuestionOutput> {
  return regenerateQuestionFlow(input);
}

const regenerateQuestionPrompt = ai.definePrompt({
  name: 'regenerateQuestionPrompt',
  input: {schema: RegenerateQuestionInputSchema},
  output: {schema: RegenerateQuestionOutputSchema},
  prompt: `You are an expert in generating exam questions for undergraduate students.

  You are given the original question, its type, and the context from the PDF document it was based on.
  Your task is to regenerate the question so that it is more relevant and helpful, while maintaining the same question type.

  Question Type: {{{questionType}}}
  Original Question: {{{originalQuestion}}}
  Context: {{{context}}}

  Regenerated Question:`,
});

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
