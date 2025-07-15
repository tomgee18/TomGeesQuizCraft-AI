
"use client";

import * as React from "react";
import * as pdfjs from "pdfjs-dist";
import * as mammoth from "mammoth";
import {
  generateQuestions,
  GenerateQuestionsOutput,
} from "@/ai/flows/generate-questions";
import { regenerateQuestion } from "@/ai/flows/regenerate-question";
import { intelligentlyChunkDocument } from "@/ai/flows/intelligently-chunk-document";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot,
  CheckCircle,
  Clipboard,
  Download,
  File,
  FileCode2,
  FileJson2,
  FileText,
  GraduationCap,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { jsPDF } from "jspdf";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { ThemeToggle } from "./theme-toggle";

// Set the worker source for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Interface representing a single generated question.
 */
interface Question {
  id: string; // Unique identifier for the question
  type: "fib" | "mcq" | "tf"; // Type of question: Fill-in-the-Blank, Multiple Choice, True/False
  question: string; // The question text itself
  options?: string[]; // Optional array of choices for MCQ
  answer: string; // The correct answer
  context: string; // The text chunk from which the question was generated
}

/**
 * Type defining the number of questions to generate for each type.
 */
type QuestionCounts = {
  fib: number; // Fill-in-the-Blank count
  mcq: number; // Multiple Choice count
  tf: number; // True/False count
};

/**
 * Type defining the state shape for storing generated questions, categorized by type.
 */
type QuestionState = {
  fillInTheBlank: Question[];
  multipleChoice: Question[];
  trueFalse: Question[];
};

/**
 * Initial state for the questions, starting with empty arrays.
 */
const initialQuestions: QuestionState = {
  fillInTheBlank: [],
  multipleChoice: [],
  trueFalse: [],
};

/**
 * Defines the accepted file types for upload.
 */
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};
const ALL_ACCEPTED_TYPES = Object.values(ACCEPTED_FILE_TYPES).flat().join(',');

// Counter to ensure unique IDs for questions
let questionIdCounter = 0;
const getUniqueQuestionId = (type: string) => `${type}-${Date.now()}-${questionIdCounter++}`;


/**
 * The main component for the Quiz Creator application.
 * It manages state for API key, file uploads, question generation, and UI interaction.
 */
export function QuizCreator() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = React.useState<string>("");
  const [hasMounted, setHasMounted] = React.useState(false); // Prevents SSR hydration errors
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<string>("idle"); // Tracks the app's current state (e.g., 'parsing', 'generating')
  const [progress, setProgress] = React.useState<number>(0);
  const [documentChunks, setDocumentChunks] = React.useState<string[]>([]);
  const [questions, setQuestions] = React.useState<QuestionState>(initialQuestions);
  const [questionCounts, setQuestionCounts] = React.useState<QuestionCounts>({ fib: 3, mcq: 3, tf: 3 });
  const [regeneratingId, setRegeneratingId] = React.useState<string | null>(null); // Tracks which question is being regenerated
  const [userAnswers, setUserAnswers] = React.useState<Record<string, string>>({}); // Stores the user's answers
  const [score, setScore] = React.useState<{ correct: number, total: number } | null>(null); // Stores the quiz score after grading

  // Effect to run on component mount to avoid hydration errors with localStorage.
  React.useEffect(() => {
    setHasMounted(true);
    const storedApiKey = localStorage.getItem("gemini-api-key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  /**
   * Handles changes to the API key input and saves the key to localStorage.
   */
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem("gemini-api-key", key);
  };

  /**
   * Resets the quiz state to its initial values.
   */
  const resetQuiz = () => {
    setQuestions(initialQuestions);
    setDocumentChunks([]);
    setUserAnswers({});
    setScore(null);
    setStatus("idle");
  };

  /**
   * Handles file selection from the file input.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFile(e.target.files[0]);
    }
  };

  /**
   * Validates and sets the selected file.
   * @param selectedFile The file selected by the user.
   */
  const handleFile = (selectedFile: File) => {
    const isAccepted = Object.keys(ACCEPTED_FILE_TYPES).includes(selectedFile.type);
    if (!isAccepted || selectedFile.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a supported file type (PDF, TXT, MD, DOCX) smaller than 10MB.",
      });
      return;
    }
    setFile(selectedFile);
    resetQuiz(); // Reset quiz state when a new file is uploaded
  };

  /**
   * Handles the drag enter event for the file drop zone.
   */
  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Handles the drag leave event for the file drop zone.
   */
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * Handles the drop event for the file drop zone.
   */
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  /**
   * Parses the uploaded document, extracts text, and chunks it for the AI model.
   */
  const parseDocument = async () => {
    if (!file) return;

    setStatus("parsing");
    setProgress(0);
    resetQuiz();

    try {
      let fullText = "";
      const reader = new FileReader();

      // Handle PDF files
      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
        await new Promise<void>((resolve) => (reader.onload = () => resolve()));
        const pdf = await pdfjs.getDocument(reader.result as ArrayBuffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item) => ('str' in item ? item.str : '')).join(" ");
          setProgress((i / pdf.numPages) * 100);
        }
      // Handle DOCX files
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        reader.readAsArrayBuffer(file);
        await new Promise<void>((resolve) => (reader.onload = () => resolve()));
        const result = await mammoth.extractRawText({ arrayBuffer: reader.result as ArrayBuffer });
        fullText = result.value;
        setProgress(100);
      // Handle TXT and MD files
      } else { 
        reader.readAsText(file);
        await new Promise<void>((resolve) => (reader.onload = () => resolve()));
        fullText = reader.result as string;
        setProgress(100);
      }
      
      // Chunk the extracted text
      const chunks = await intelligentlyChunkDocument({ documentContent: fullText });
      setDocumentChunks(chunks);
      setStatus("parsed");
    } catch (error) {
      console.error("Error parsing document:", error);
      toast({ variant: "destructive", title: "Document Parsing Error", description: "Could not extract text from the document." });
      setStatus("idle");
    }
  };


  /**
   * Handles the question generation process by calling the AI flow for each document chunk.
   */
  const handleGenerateQuestions = async () => {
    if (!documentChunks.length) {
      toast({ variant: "destructive", title: "No document", description: "Please upload and parse a document first." });
      return;
    }
    if (!apiKey) {
      toast({ variant: "destructive", title: "API Key Missing", description: "Please enter your Gemini API key." });
      return;
    }
    
    setStatus("generating");
    setProgress(0);
    setQuestions(initialQuestions);
    setUserAnswers({});
    setScore(null);

    try {
      let allGeneratedQuestions: QuestionState = { fillInTheBlank: [], multipleChoice: [], trueFalse: [] };
      
      const totalChunks = documentChunks.length;
      // Distribute question generation across chunks to meet the desired total counts.
      const baseFib = Math.floor(questionCounts.fib / totalChunks);
      const remFib = questionCounts.fib % totalChunks;
      const baseMcq = Math.floor(questionCounts.mcq / totalChunks);
      const remMcq = questionCounts.mcq % totalChunks;
      const baseTf = Math.floor(questionCounts.tf / totalChunks);
      const remTf = questionCounts.tf % totalChunks;
      
      let generatedCounts = { fib: 0, mcq: 0, tf: 0 };

      // Process each chunk to generate questions.
      for (let i = 0; i < totalChunks; i++) {
        const chunk = documentChunks[i];
        
        // Determine how many questions of each type to generate from this chunk.
        let numFib = baseFib + (i < remFib ? 1 : 0);
        let numMcq = baseMcq + (i < remMcq ? 1 : 0);
        let numTf = baseTf + (i < remTf ? 1 : 0);

        // Ensure we don't generate more questions than requested.
        numFib = Math.min(numFib, questionCounts.fib - generatedCounts.fib);
        numMcq = Math.min(numMcq, questionCounts.mcq - generatedCounts.mcq);
        numTf = Math.min(numTf, questionCounts.tf - generatedCounts.tf);
        
        if (numFib > 0 || numMcq > 0 || numTf > 0) {
            const res = await generateQuestions({
              text: chunk,
              numFillInTheBlank: numFib,
              numMultipleChoice: numMcq,
              numTrueFalse: numTf,
            });
    
            const parsed = parseAIResponse(res, chunk);
            allGeneratedQuestions.fillInTheBlank.push(...parsed.fillInTheBlank);
            allGeneratedQuestions.multipleChoice.push(...parsed.multipleChoice);
            allGeneratedQuestions.trueFalse.push(...parsed.trueFalse);
            
            // Update counts of generated questions.
            generatedCounts.fib += parsed.fillInTheBlank.length;
            generatedCounts.mcq += parsed.multipleChoice.length;
            generatedCounts.tf += parsed.trueFalse.length;
        }

        setProgress(((i + 1) / totalChunks) * 100);
      }
      
      setQuestions(allGeneratedQuestions);
      setStatus("complete");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast({ variant: "destructive", title: "Generation Error", description: "Failed to generate questions. Check your API key and try again." });
      setStatus("parsed");
    }
  };
  
  /**
   * Parses the raw response from the AI model into a structured QuestionState object.
   * @param response The raw output from the generateQuestions flow.
   * @param context The text chunk used for generation.
   * @returns A structured QuestionState object.
   */
  const parseAIResponse = (response: GenerateQuestionsOutput, context: string): QuestionState => {
    const parse = (raw: string[], type: Question['type']): Question[] => 
      raw.map((q) => {
        const [questionText, ...answerParts] = q.split('Answer:');
        const answer = answerParts.join('Answer:').trim();
        let options;
        let finalQuestion = questionText.trim();

        // Special parsing for multiple-choice questions to extract options.
        if (type === 'mcq') {
            const mcqParts = questionText.trim().match(/(.*?)(A\..*?B\..*?C\..*?D\..*)/s);
            if(mcqParts) {
                const [, question, opts] = mcqParts;
                finalQuestion = question.trim();
                options = opts.split(/(?=[A-D]\.)/).map(opt => opt.trim()).filter(Boolean);
            }
        }
        return { id: getUniqueQuestionId(type), type, question: finalQuestion, answer, options, context };
      }).filter(q => q.question && q.answer); // Filter out any malformed questions

    return {
      fillInTheBlank: parse(response.fillInTheBlank, 'fib'),
      multipleChoice: parse(response.multipleChoice, 'mcq'),
      trueFalse: parse(response.trueFalse, 'tf'),
    };
  };

  /**
   * Handles the regeneration of a single question.
   * @param question The question object to regenerate.
   */
  const handleRegenerate = async (question: Question) => {
    setRegeneratingId(question.id);
    try {
      const questionTypeMap = { fib: 'Fill-in-the-Blank', mcq: 'MCQ', tf: 'True/False' };
      const response = await regenerateQuestion({
        originalQuestion: question.question,
        questionType: questionTypeMap[question.type],
        context: question.context,
      });

      // Parse the regenerated question and answer.
      const [newQuestionText, ...answerParts] = response.regeneratedQuestion.split('Answer:');
      const newAnswer = answerParts.join('Answer:').trim();

      let newOptions;
      let finalNewQuestion = newQuestionText.trim();
      
      // If it's an MCQ, re-parse the options.
      if (question.type === 'mcq' && newQuestionText) {
          const mcqParts = newQuestionText.trim().match(/(.*?)(A\..*?B\..*?C\..*?D\..*)/s);
          if (mcqParts) {
              const [, qText, opts] = mcqParts;
              finalNewQuestion = qText.trim();
              newOptions = opts.split(/(?=[A-D]\.)/).map(opt => opt.trim()).filter(Boolean);
          }
      }

      const updatedQuestion = { 
        ...question, 
        question: finalNewQuestion, 
        answer: newAnswer, 
        ...(newOptions && { options: newOptions })
      };


      // Update the state with the new question.
      setQuestions(prev => {
        const newQuestions = { ...prev };
        const keyMap = { fib: 'fillInTheBlank', mcq: 'multipleChoice', tf: 'trueFalse' };
        // @ts-ignore
        newQuestions[keyMap[question.type]] = newQuestions[keyMap[question.type]].map(q => q.id === question.id ? updatedQuestion : q);
        return newQuestions;
      });

    } catch (error) {
      console.error("Regeneration failed:", error);
      toast({ variant: "destructive", title: "Regeneration Failed", description: "Could not regenerate the question." });
    } finally {
      setRegeneratingId(null);
    }
  };

  /**
   * Handles changes to a user's answer for a given question.
   */
  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  /**
   * Grades the quiz, calculates the score, and updates the status.
   */
  const gradeQuiz = () => {
    let correctCount = 0;
    const allQuestions = [...questions.fillInTheBlank, ...questions.multipleChoice, ...questions.trueFalse];
    
    allQuestions.forEach(q => {
      const userAnswer = userAnswers[q.id];
      if (userAnswer) {
        // For MCQ, compare the option letter (e.g., "C.") with the answer
        if (q.type === 'mcq') {
          if (userAnswer.trim().toLowerCase().startsWith(q.answer.trim().toLowerCase())) {
            correctCount++;
          }
        // For other types, do a case-insensitive comparison
        } else if (userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
          correctCount++;
        }
      }
    });

    setScore({ correct: correctCount, total: allQuestions.length });
    setStatus("submitted");
  };

  const totalQuestions = questions.fillInTheBlank.length + questions.multipleChoice.length + questions.trueFalse.length;

  /**
   * Exports the generated questions to a specified file format.
   * @param format The desired file format ('txt', 'pdf', 'docx', 'json', 'md').
   */
  const exportToFile = (format: 'txt' | 'pdf' | 'docx' | 'json' | 'md') => {
    // Helper to format a single question with its options if it's an MCQ.
    const questionText = (q: Question) => {
        if(q.type === 'mcq' && q.options) {
            return `${q.question}\n${q.options.join('\n')}`;
        }
        return q.question.replace('____', '________________');
    }
    // Helper to generate the full text content of the quiz.
    const fullText = (showAnswers: boolean) => 
        ['Fill-in-the-Blank', 'Multiple Choice', 'True/False'].map(type => {
            const qList = type === 'Fill-in-the-Blank' ? questions.fillInTheBlank : type === 'Multiple Choice' ? questions.multipleChoice : questions.trueFalse;
            if (qList.length === 0) return '';
            return `${type.toUpperCase()}\n\n` + qList.map((q, i) => 
                `${i + 1}. ${questionText(q)}${showAnswers ? `\nAnswer: ${q.answer}` : ''}`
            ).join('\n\n') + '\n\n';
        }).join('');
    
    // Handle different export formats.
    if (format === 'txt') {
        const blob = new Blob([fullText(true)], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'quizcraft-questions.txt');
    } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.setFont('Helvetica');
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(fullText(true), 180);
        doc.text(lines, 15, 20);
        doc.save('quizcraft-questions.pdf');
    } else if (format === 'docx') {
        const paragraphs: Paragraph[] = [];
        ['Fill-in-the-Blank', 'Multiple Choice', 'True/False'].forEach(type => {
            const qList = type === 'Fill-in-the-Blank' ? questions.fillInTheBlank : type === 'Multiple Choice' ? questions.multipleChoice : questions.trueFalse;
            if (qList.length > 0) {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({ text: type.toUpperCase(), bold: true })],
                    spacing: { after: 200 }
                }));
                qList.forEach((q, i) => {
                    paragraphs.push(new Paragraph({
                        children: [new TextRun(`${i + 1}. ${questionText(q)}`)],
                        spacing: { after: 100 }
                    }));
                    paragraphs.push(new Paragraph({
                        children: [new TextRun({ text: `Answer: ${q.answer}`, italics: true })],
                        spacing: { after: 200 }
                    }));
                });
            }
        });

        const doc = new DocxDocument({ sections: [{ children: paragraphs }] });
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, 'quizcraft-questions.docx');
        });
    } else if (format === 'json') {
        const allQuestions = {
            fillInTheBlank: questions.fillInTheBlank.map(({id, context, ...q}) => q),
            multipleChoice: questions.multipleChoice.map(({id, context, ...q}) => q),
            trueFalse: questions.trueFalse.map(({id, context, ...q}) => q),
        };
        const blob = new Blob([JSON.stringify(allQuestions, null, 2)], { type: 'application/json;charset=utf-8' });
        saveAs(blob, 'quizcraft-questions.json');
    } else if (format === 'md') {
        const markdownContent = ['Fill-in-the-Blank', 'Multiple Choice', 'True/False'].map(type => {
            const qList = type === 'Fill-in-the-Blank' ? questions.fillInTheBlank : type === 'Multiple Choice' ? questions.multipleChoice : questions.trueFalse;
            if (qList.length === 0) return '';
            
            let content = `## ${type}\n\n`;
            qList.forEach((q, i) => {
                content += `${i + 1}. ${questionText(q)}\n`;
                content += `    *Answer: ${q.answer}*\n\n`;
            });
            return content;
        }).join('');

        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, 'quizcraft-questions.md');
    }
  };

  /**
   * Renders the interactive part of a question (input, radio group).
   */
  const renderAnswerField = (q: Question) => {
    const isGraded = status === 'submitted';
    const userAnswer = userAnswers[q.id];
    let isCorrect;
    if(isGraded && userAnswer) {
      isCorrect = q.type === 'mcq'
        ? userAnswer.trim().toLowerCase().startsWith(q.answer.trim().toLowerCase())
        : userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
    }

    if (q.type === 'fib') {
      return (
        <div className="space-y-2">
          <Label htmlFor={q.id}>{q.question.replace("____", "...")}</Label>
          <Input
            id={q.id}
            type="text"
            value={userAnswers[q.id] || ""}
            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            disabled={isGraded}
            className={cn("w-full md:w-1/2", isGraded && (isCorrect ? 'border-green-500' : 'border-red-500'))}
            placeholder="Your answer"
          />
        </div>
      );
    }
    if (q.type === 'mcq' && q.options) {
      return (
        <div>
          <p className="font-medium mb-2">{q.question}</p>
          <RadioGroup value={userAnswers[q.id]} onValueChange={(val) => handleAnswerChange(q.id, val)} disabled={isGraded}>
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                <Label htmlFor={`${q.id}-${i}`} className={cn(isGraded && q.answer.startsWith(opt[0]) && 'text-green-500 font-bold')}>{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    }
    if (q.type === 'tf') {
      return (
        <div>
          <p className="font-medium mb-2">{q.question}</p>
          <RadioGroup value={userAnswers[q.id]} onValueChange={(val) => handleAnswerChange(q.id, val)} disabled={isGraded}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="True" id={`${q.id}-true`} />
              <Label htmlFor={`${q.id}-true`} className={cn(isGraded && q.answer === 'True' && 'text-green-500 font-bold')}>True</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="False" id={`${q.id}-false`} />
              <Label htmlFor={`${q.id}-false`} className={cn(isGraded && q.answer === 'False' && 'text-green-500 font-bold')}>False</Label>
            </div>
          </RadioGroup>
        </div>
      );
    }
    return <p className="font-medium mb-2">{q.question}</p>;
  };

  /**
   * A sub-component to render a list of questions for a specific category.
   */
  const QuestionList = ({ title, data }: { title: string; data: Question[] }) => (
    <AccordionItem value={title.toLowerCase().replace(" ", "-")} disabled={!data.length}>
      <AccordionTrigger className="text-lg font-medium hover:no-underline">
        <div className="flex items-center gap-2">
            {title} <span className="text-muted-foreground text-sm font-normal">({data.length} questions)</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          {data.map((q) => {
            const isGraded = status === 'submitted';
            const userAnswer = userAnswers[q.id];
            let isCorrect;
            if(isGraded && userAnswer) {
              isCorrect = q.type === 'mcq'
                ? userAnswer.trim().toLowerCase().startsWith(q.answer.trim().toLowerCase())
                : userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
            }

            return (
              <Card key={q.id} className={cn("overflow-hidden", isGraded && (isCorrect ? 'border-green-500' : 'border-red-500'))}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">{renderAnswerField(q)}</div>
                    <div className="flex flex-col items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleRegenerate(q)} disabled={regeneratingId === q.id || isGraded}>
                              {regeneratingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Regenerate Question</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {isGraded && (isCorrect ? <CheckCircle className="h-5 w-5 text-green-500"/> : <XCircle className="h-5 w-5 text-red-500"/>)}
                    </div>
                  </div>
                </CardContent>
                {isGraded && (
                  <CardFooter className="bg-muted/50 px-4 py-2">
                    <div className="text-sm">
                      <span className="font-semibold">Correct Answer:</span> {q.answer}
                    </div>
                  </CardFooter>
                )}
              </Card>
            )
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  // Return null on initial server render to prevent hydration mismatch.
  if (!hasMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-8 pb-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Bot className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline">QuizCraft AI</h1>
                    <p className="text-muted-foreground">Generate exam questions from your study materials.</p>
                </div>
            </div>
            <ThemeToggle />
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 items-start">
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6 sticky top-8">
          {/* API Key Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="text-primary"/> Gemini API Key</CardTitle>
              <CardDescription>Your key is stored locally and never sent to our servers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input type="password" placeholder="Enter your Gemini API Key" value={apiKey} onChange={handleApiKeyChange}/>
            </CardContent>
          </Card>
          
          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UploadCloud className="text-primary"/> Upload Document</CardTitle>
              <CardDescription>Drag & drop or select a file (max 10MB).</CardDescription>
            </CardHeader>
            <CardContent>
              <label 
                onDragEnter={handleDragEnter} onDragOver={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={cn("flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDragging && "border-primary bg-primary/10")}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD (MAX. 10MB)</p>
                </div>
                <input type="file" className="hidden" accept={ALL_ACCEPTED_TYPES} onChange={handleFileChange} />
              </label>
              {file && (
                <div className="mt-4 flex items-center justify-between bg-muted/50 p-2 rounded-md">
                    <div className="flex items-center gap-2 truncate">
                        <FileText className="h-5 w-5 shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="h-4 w-4"/></Button>
                </div>
              )}
            </CardContent>
            {file && (
              <CardFooter>
                <Button onClick={parseDocument} disabled={status === "parsing" || status === "generating"} className="w-full">
                  {status === 'parsing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {status === 'parsing' ? 'Parsing Document...' : documentChunks.length > 0 ? 'Reparse Document' : 'Parse Document'}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Generation Settings */}
          {(status === "parsed" || status === "complete" || status === "submitted") && documentChunks.length > 0 && (
            <Card className="animate-in fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> Generation Settings</CardTitle>
                <CardDescription>Set how many questions of each type to generate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Fill-in-the-Blank: {questionCounts.fib}</Label>
                  <Slider value={[questionCounts.fib]} onValueChange={([val]) => setQuestionCounts(c => ({ ...c, fib: val }))} min={0} max={25} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>Multiple Choice: {questionCounts.mcq}</Label>
                  <Slider value={[questionCounts.mcq]} onValueChange={([val]) => setQuestionCounts(c => ({ ...c, mcq: val }))} min={0} max={25} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>True/False: {questionCounts.tf}</Label>
                  <Slider value={[questionCounts.tf]} onValueChange={([val]) => setQuestionCounts(c => ({ ...c, tf: val }))} min={0} max={25} step={1} />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleGenerateQuestions} disabled={status === "generating"} className="w-full bg-accent hover:bg-accent/90">
                  {status === 'generating' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Questions
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Right Column: Output */}
        <div className="md:col-span-1 lg:col-span-2">
          {/* Parsing State */}
          {status === 'parsing' && (
            <Card>
              <CardHeader><CardTitle>Parsing Your Document...</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-muted-foreground">Extracting text... this may take a moment for large files.</p>
                  <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          )}

          {/* Generating State */}
          {status === 'generating' && (
            <Card>
              <CardHeader><CardTitle>Generating Your Quiz...</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                  <Progress value={progress} className="w-full" />
                  <p className="text-center text-muted-foreground">AI is thinking... this may take a moment.</p>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          )}

          {/* Complete/Submitted State */}
          {totalQuestions > 0 && (status === 'complete' || status === 'submitted') && (
            <Card className="animate-in fade-in">
              <CardHeader>
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div>
                    <CardTitle>Your Custom Quiz</CardTitle>
                    <CardDescription>{totalQuestions} questions generated from your document.</CardDescription>
                  </div>
                  {/* Export Buttons */}
                  <div className="flex gap-2">
                      <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('txt')}><FileText className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .txt</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('json')}><FileJson2 className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .json</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('md')}><FileCode2 className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .md</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('pdf')}><Download className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .pdf</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('docx')}><File className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .docx</TooltipContent></Tooltip>
                      </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {score && status === 'submitted' && (
                  <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                    <h3 className="text-2xl font-bold text-primary">Quiz Complete!</h3>
                    <p className="text-lg mt-2">You scored <span className="font-bold">{score.correct}</span> out of <span className="font-bold">{score.total}</span>.</p>
                    <p className="text-4xl font-bold mt-2">{((score.correct / score.total) * 100).toFixed(0)}%</p>
                  </div>
                )}
                <Accordion type="multiple" defaultValue={['fill-in-the-blank', 'multiple-choice', 'true-false']} className="w-full">
                  <QuestionList title="Fill-in-the-Blank" data={questions.fillInTheBlank} />
                  <QuestionList title="Multiple Choice" data={questions.multipleChoice} />
                  <QuestionList title="True/False" data={questions.trueFalse} />
                </Accordion>
              </CardContent>
              <CardFooter>
                {status !== 'submitted' && (
                  <Button onClick={gradeQuiz} className="w-full" size="lg">
                    <GraduationCap className="mr-2 h-5 w-5" />
                    Grade My Quiz
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}
          
          {/* Idle/Initial State */}
          {(status === 'idle' || (status === 'parsed' && totalQuestions === 0)) && (
             <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-full">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Sparkles className="w-10 h-10 text-primary"/>
                </div>
                <h3 className="text-xl font-bold font-headline">Your Quiz Awaits</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                    Upload a document and provide your API key to start generating questions.
                    Your personalized quiz will appear here.
                </p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
