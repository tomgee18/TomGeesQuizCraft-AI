# Development Guidelines for QuizCraft AI

This document outlines the development standards and best practices for the QuizCraft AI application.

## Tech Stack

- **Framework**: Next.js (with App Router)
- **AI Integration**: Google Genkit
- **Language**: TypeScript
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Parsing**: pdf.js
- **DOCX Parsing**: mammoth

## Code Style & Standards

### TypeScript
- Use strict type checking
- Avoid `any` types whenever possible
- Use interfaces for object shapes and types for unions/primitives
- Leverage TypeScript's utility types (Pick, Omit, Partial, etc.)

### React & Next.js
- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks, call hooks at top level)
- Use Next.js App Router patterns for routing and layouts
- Implement proper error boundaries and loading states
- Use server components where appropriate for improved performance

### Component Structure
- Follow atomic design principles (atoms, molecules, organisms)
- Keep components focused on a single responsibility
- Extract reusable logic into custom hooks
- Use composition over inheritance

### State Management
- Use React's built-in state management (useState, useReducer, useContext) for most cases
- Prefer local component state when possible
- Use context for global state that needs to be accessed by many components

## Performance Considerations

- Implement proper code splitting and lazy loading
- Optimize images using Next.js Image component
- Minimize bundle size by avoiding unnecessary dependencies
- Use memoization (useMemo, useCallback) for expensive computations
- Implement virtualization for long lists

## Accessibility Standards

- All components must be keyboard navigable
- Use semantic HTML elements
- Include proper ARIA attributes where needed
- Maintain sufficient color contrast (WCAG AA compliance)
- Support screen readers with appropriate alt text and labels
- Implement focus management for modals and dialogs

## Testing Requirements

- Write unit tests for utility functions and hooks
- Create component tests for UI components
- Implement integration tests for key user flows
- Test for accessibility compliance
- Include error handling tests

## Documentation

- Document all components with JSDoc comments
- Include usage examples for complex components
- Document API integrations and data flows
- Keep README and other documentation up to date

## AI Integration Guidelines

- Handle API errors gracefully with user-friendly messages
- Implement proper rate limiting for API calls
- Provide clear feedback during AI processing
- Include fallback options when AI responses don't match expected formats
- Chunk large documents appropriately before sending to AI