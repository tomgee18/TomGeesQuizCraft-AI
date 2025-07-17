# QuizCraft AI

QuizCraft AI is a web application that leverages Google's Gemini AI to automatically generate mock exam questions from academic documents. The application allows users to upload study materials (PDF, TXT, MD, DOCX) and generates fill-in-the-blank, multiple-choice, and true/false questions to help with exam preparation.

## Core Features

- **Document Upload & Parsing**: Supports PDF, TXT, MD, and DOCX files up to 10MB
- **AI-Powered Question Generation**: Uses Google Gemini to create relevant questions from document content
- **Multiple Question Types**: Generates fill-in-the-blank, multiple-choice, and true/false questions
- **Quiz Taking & Grading**: Users can take the generated quiz and receive immediate feedback
- **Content Export**: Export questions in various formats (TXT, PDF, DOCX, JSON, MD)
- **Question Regeneration**: Ability to regenerate individual questions if needed
- **Enhanced Security**: Comprehensive security features including XSS protection, CSRF prevention, and secure file handling

## User Experience

- Clean, modern interface with both light and dark mode support
- Responsive design that works on desktop and mobile devices
- Intuitive workflow: upload document → parse → configure question types → generate → take quiz → grade
- Secure handling of API keys (stored in sessionStorage with basic encryption)