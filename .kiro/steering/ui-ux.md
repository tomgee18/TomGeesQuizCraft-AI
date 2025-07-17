# UI/UX Guidelines for QuizCraft AI

This document outlines the user interface and user experience standards for the QuizCraft AI application.

## Design System

### Colors
- **Primary**: #29ABE2 (vivid blue)
- **Background**: #f0f0f0 (light grey)
- **Accent**: #FF8C00 (orange)
- **Text**: #333333 (dark grey)
- **Success**: #10B981 (green)
- **Error**: #EF4444 (red)
- **Warning**: #F59E0B (amber)
- **Info**: #3B82F6 (blue)

### Typography
- **Headings**: 'Space Grotesk', sans-serif
- **Body**: 'Inter', sans-serif
- **Base size**: 16px
- **Scale**: 1.25 (major third)

### Spacing
- Base unit: 4px
- Use multiples of the base unit for consistent spacing (4px, 8px, 16px, 24px, 32px, etc.)

### Shadows
- Light: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)
- Medium: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)
- Heavy: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)

### Border Radius
- Small: 4px
- Medium: 8px
- Large: 12px
- Pill: 9999px

## Component Guidelines

### Buttons
- Primary buttons use the primary color
- Secondary buttons use a ghost/outline style
- Destructive actions use the error color
- Include hover, focus, and active states
- Maintain minimum touch target size of 44x44px for mobile

### Forms
- Group related fields
- Provide clear labels for all inputs
- Show validation errors inline
- Use appropriate input types (text, email, number, etc.)
- Include helper text for complex inputs

### Cards
- Use consistent padding (16px or 24px)
- Include a clear heading
- Maintain consistent spacing between elements
- Use shadows to create hierarchy

### Feedback & Notifications
- Use toast notifications for non-critical feedback
- Use modal dialogs for important confirmations
- Provide loading indicators for asynchronous operations
- Include success/error states for all actions

## Interaction Patterns

### Loading States
- Show skeleton loaders for content that's loading
- Use progress indicators for operations with known duration
- Provide feedback for long-running operations

### Error Handling
- Display user-friendly error messages
- Offer recovery options when possible
- Maintain context when errors occur
- Log detailed errors for debugging

### Transitions & Animations
- Keep animations subtle and purposeful
- Use transitions for state changes (hover, focus, etc.)
- Animate between major UI states
- Respect user preferences for reduced motion

## Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Layout Principles
- Design mobile-first
- Use fluid typography and spacing
- Adjust component layouts at breakpoints
- Ensure touch targets are appropriately sized on mobile
- Test on various device sizes and orientations

## Accessibility

- Maintain WCAG AA compliance at minimum
- Ensure sufficient color contrast (4.5:1 for normal text)
- Support keyboard navigation
- Implement proper focus management
- Include appropriate ARIA attributes
- Test with screen readers

## Dark Mode

- Maintain appropriate contrast in both light and dark modes
- Adjust colors for dark mode to reduce eye strain
- Respect user system preferences
- Allow manual toggle between modes