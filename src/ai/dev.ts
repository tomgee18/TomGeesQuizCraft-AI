import { config } from 'dotenv';
config();

import '@/ai/flows/generate-questions.ts';
import '@/ai/flows/regenerate-question.ts';
import '@/ai/flows/secure-api-key-input.ts';
import '@/ai/flows/intelligently-chunk-document.ts';