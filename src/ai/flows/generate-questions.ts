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

const QuestionSchema = z.string().describe(`A question string that MUST include the answer prefixed with "Answer:". For example: "The capital of France is ____. Answer: Paris" or "Is the sky blue? Answer: True"`);

const GenerateQuestionsOutputSchema = z.object({
  fillInTheBlank: z.array(QuestionSchema).describe('An array of fill-in-the-blank questions.'),
  multipleChoice: z.array(QuestionSchema).describe('An array of multiple-choice questions. For each question, provide four options (A, B, C, D).'),
  trueFalse: z.array(QuestionSchema).describe('An array of true/false questions.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  // If no questions are requested, return an empty response.
  if (input.numFillInTheBlank === 0 && input.numMultipleChoice === 0 && input.numTrueFalse === 0) {
    return {
      fillInTheBlank: [],
      multipleChoice: [],
      trueFalse: [],
    };
  }
  return generateQuestionsFlow(input);
}

const generateQuestionsPrompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {schema: GenerateQuestionsInputSchema},
  output: {schema: GenerateQuestionsOutputSchema},
  prompt: `You are an expert educator creating a quiz for undergraduate students based on the provided text.

Generate the specified number of questions for each type. For each question, you MUST provide the answer immediately after the question, prefixed with "Answer:".

Text: {{{text}}}

Number of fill-in-the-blank questions: {{{numFillInTheBlank}}}
Number of multiple-choice questions: {{{numMultipleChoice}}}
Number of true/false questions: {{{numTrueFalse}}}

Example for a fill-in-the-blank question:
"The powerhouse of the cell is the ____. Answer: mitochondria"

Example for a multiple-choice question:
"What is the capital of Japan?
A. Beijing
B. Seoul
C. Tokyo
D. Bangkok
Answer: C. Tokyo"

Example for a true/false question:
"The Earth is flat. Answer: False"
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
