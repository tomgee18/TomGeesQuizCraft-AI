# **App Name**: QuizCraft AI

## Core Features:

- Document Upload: Enable users to upload PDF, TXT, MD, and DOCX documents (textbooks, notes, study guides). Support files up to 10MB. Client-side extraction will be done with pdf.js for PDFs and mammoth for DOCX files.
- API Key Input: Accept a user-provided Gemini Pro API key via a masked input field, storing it temporarily and securely in localStorage, and include instructional text reassuring the user that their key is never stored.
- Intelligent Chunking: Intelligently chunk uploaded documents into 1000-1500 word segments before sending prompts to Gemini.
- LLM Question Generation: Generate Fill-in-the-Blank, Multiple Choice, and True/False questions from the document chunks, calling the Gemini Pro API tool. The user can choose how many questions to generate for each type. Includes robust error handling for parsing multiple-choice questions with fallback options if the AI response format is unexpected.
- Question Display: Display the questions, grouped by question type. The correct answer remains hidden until a toggle is activated by the user.
- Quiz Taking & Grading: Allow users to take the generated quiz by answering questions, then submit for immediate grading with visual feedback on correct/incorrect answers and a total score summary.
- Content Export: Provide options to download the generated questions in .pdf, .txt, .docx, .json, and .md formats.
- Question Regeneration: Enable users to regenerate single questions using AI if the user is not satisfied with the original result.

## Style Guidelines:

- Primary color: A vivid blue (#29ABE2), reminiscent of educational software but more vibrant.
- Background color: Light grey (#f0f0f0) provides a neutral backdrop.
- Accent color: A contrasting orange (#FF8C00) to highlight key actions and interactive elements.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text to maintain a modern and readable interface.
- Use clean and simple icons from a set like Remix Icon, representing actions like upload, download, and settings.
- Use a clean, organized layout with clear sections for PDF upload, API key input, question display, and export options.
- Subtle animations for loading states and interactive elements, such as a progress bar during PDF processing.