'use server';

/**
 * @fileOverview Generates fill-in-the-blank, multiple choice, and true/false questions from a given text.
 *
 * - generateQuestions - A function that handles the question generation process.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionsInputSchema = z.object({
  text: z.string().describe('The text from which to generate questions.'),
  numFillInTheBlank: z.number().int().min(0).describe('The number of fill-in-the-blank questions to generate.'),
  numMultipleChoice: z.number().int().min(0).describe('The number of multiple-choice questions to generate.'),
  numTrueFalse: z.number().int().min(0).describe('The number of true/false questions to generate.'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const GenerateQuestionsOutputSchema = z.object({
  fillInTheBlank: z.array(z.string()).describe('An array of fill-in-the-blank questions.'),
  multipleChoice: z.array(z.string()).describe('An array of multiple-choice questions.'),
  trueFalse: z.array(z.string()).describe('An array of true/false questions.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const generateQuestionsPrompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {schema: GenerateQuestionsInputSchema},
  output: {schema: GenerateQuestionsOutputSchema},
  prompt: `You are an expert educator. Generate fill-in-the-blank, multiple choice, and true/false questions from the following text.

Text: {{{text}}}

Number of fill-in-the-blank questions to generate: {{{numFillInTheBlank}}}
Number of multiple-choice questions to generate: {{{numMultipleChoice}}}
Number of true/false questions to generate: {{{numTrueFalse}}}

Format the questions as follows:

Fill-in-the-blank:
1. [question 1]
2. [question 2]

Multiple choice:
1. [question 1]
2. [question 2]

True/False:
1. [question 1]
2. [question 2]

Ensure the questions are relevant to the text and are of appropriate difficulty for undergraduate students.
`,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateQuestionsPrompt(input);
    return output!;
  }
);
