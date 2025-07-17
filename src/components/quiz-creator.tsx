
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateQuestions } from "@/ai/flows/generate-questions";
import { regenerateQuestion } from "@/ai/flows/regenerate-question";
import * as pdfjs from "pdfjs-dist";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import mammoth from "mammoth";
import { jsPDF } from "jspdf";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bot,
  FileCode2,
  FileJson2,
  FileText,
  File,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Type definitions for the application state.
 */
type QuestionType = "fillInTheBlank" | "multipleChoice" | "trueFalse";

type Question = {
  id: string; // Unique ID for each question for React keys
  type: "fill" | "mcq" | "tf";
  question: string;
  answer: string;
  options?: string[];
};

type GeneratedQuestions = {
  fillInTheBlank: Question[];
  multipleChoice: Question[];
  trueFalse: Question[];
};

type UserAnswers = {
  [questionId: string]: string;
};

type GradedResult = {
  score: number;
  results: {
    [questionId: string]: boolean;
  };
};

/**
 * The main component for creating quizzes. It handles file uploads,
 * API key management, question generation, and the interactive quiz experience.
 */
export function QuizCreator() {
  const { toast } = useToast();
  // State for managing API key
  const [apiKey, setApiKey] = useState<string>("");
  // State for tracking if the component has mounted to avoid hydration errors
  const [hasMounted, setHasMounted] = useState(false);
  // State for the uploaded file
  const [file, setFile] = useState<File | null>(null);
  // State for the extracted text content from the file
  const [textContent, setTextContent] = useState<string>("");
  // State to track parsing progress
  const [parsingProgress, setParsingProgress] = useState(0);
  // State to track parsing status text
  const [parsingStatus, setParsingStatus] = useState<string>("");
  // State for loading indicators
  const [isLoading, setIsLoading] = useState({
    parsing: false,
    generating: false,
    regenerating: null as string | null,
  });
  // State for the number of questions to generate for each type
  const [questionCounts, setQuestionCounts] = useState({
    fillInTheBlank: 5,
    multipleChoice: 5,
    trueFalse: 5,
  });
  // State to hold the generated questions
  const [questions, setQuestions] = useState<GeneratedQuestions>({
    fillInTheBlank: [],
    multipleChoice: [],
    trueFalse: [],
  });
  // State to hold user's answers
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  // State to show/hide answers
  const [showAnswers, setShowAnswers] = useState(false);
  // State to hold the grading results
  const [gradedResult, setGradedResult] = useState<GradedResult | null>(null);

  /**
   * Effect to load API key from sessionStorage on component mount.
   * This prevents hydration errors by ensuring sessionStorage is only accessed on the client.
   */
  useEffect(() => {
    setHasMounted(true);
    try {
      const storedKey = sessionStorage.getItem("gemini-api-key");
      if (storedKey) {
        setApiKey(storedKey);
      }
    } catch (error) {
      console.error("Could not access sessionStorage:", error);
    }
  }, []);

  /**
   * Generates a unique ID.
   * @returns A string combining a timestamp and a random number.
   */
  const generateUniqueId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };
  
  /**
   * Parses the generated question string into a structured Question object.
   * It also handles multi-line MCQs and extracts options.
   * @param rawQuestion The raw question string from the AI.
   * @param type The type of question ('fill', 'mcq', 'tf').
   * @returns A structured Question object.
   */
  const parseQuestion = useCallback((rawQuestion: string, type: "fill" | "mcq" | "tf"): Question | null => {
    const answerPrefix = "Answer:";
    const answerIndex = rawQuestion.lastIndexOf(answerPrefix);

    if (answerIndex === -1) {
      console.error("Could not find answer for question:", rawQuestion);
      toast({
        variant: "destructive",
        title: "Question Parsing Error",
        description: "The AI returned a question in an unexpected format. Please try regenerating it.",
      });
      return null;
    }

    const questionText = rawQuestion.substring(0, answerIndex).trim();
    const answerText = rawQuestion.substring(answerIndex + answerPrefix.length).trim();

    const question: Question = {
      id: generateUniqueId(),
      type,
      question: questionText,
      answer: answerText,
    };

    if (type === 'mcq') {
      const lines = questionText.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 1) {
        question.question = lines[0];
        question.options = lines.slice(1).map(line => line.trim().replace(/^[A-D]\.?\s*/, ''));
      } else {
        // Fallback for single-line MCQs, though the prompt discourages this.
        question.options = [];
      }
    }

    return question;
  }, [toast]);


  /**
   * Handles changes to the API key input field and saves the key to sessionStorage.
   * @param e The input change event.
   */
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    try {
      sessionStorage.setItem("gemini-api-key", key);
    } catch (error) {
      console.error("Could not access sessionStorage:", error);
      toast({
        variant: "destructive",
        title: "Could not save API key",
        description: "Your browser settings may be blocking session storage.",
      });
    }
  };

  /**
   * Handles file selection from the file input.
   * @param e The input change event.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  /**
   * Handles dropping a file onto the dropzone.
   * @param e The drag event.
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  
  /**
   * Prevents the default behavior for drag-over events.
   * @param e The drag event.
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Resets the file and text content state.
   */
  const handleRemoveFile = () => {
    setFile(null);
    setTextContent("");
    setQuestions({ fillInTheBlank: [], multipleChoice: [], trueFalse: [] });
    setGradedResult(null);
    setUserAnswers({});
  };

  /**
   * Parses the content of the uploaded file based on its type.
   * Supports PDF, DOCX, TXT, and MD files.
   */
  const handleParseFile = useCallback(async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please choose a file to parse.",
      });
      return;
    }
    
    setIsLoading(prev => ({ ...prev, parsing: true }));
    setParsingProgress(0);
    setParsingStatus("Starting parsing...");

    try {
      let text = "";
      const reader = new FileReader();

      const processText = (extractedText: string) => {
        setTextContent(extractedText);
        setParsingProgress(100);
        setParsingStatus("Parsing complete!");
        toast({ title: "Document Parsed", description: "You can now configure and generate questions." });
      };

      if (file.type === "text/plain" || file.name.endsWith(".md")) {
        reader.onload = (e) => processText(e.target?.result as string);
        reader.readAsText(file);
      } 
      else if (file.name.endsWith(".docx")) {
        reader.onload = async (e) => {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer: e.target?.result as ArrayBuffer });
            processText(result.value);
          } catch (mammothError) {
            console.error("Error parsing DOCX:", mammothError);
            throw new Error("Failed to parse DOCX file.");
          }
        };
        reader.readAsArrayBuffer(file);
      } 
      else if (file.type === "application/pdf") {
        reader.onload = async (e) => {
          try {
            const pdf = await pdfjs.getDocument({ data: e.target?.result as ArrayBuffer }).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
              setParsingProgress((i / pdf.numPages) * 100);
              setParsingStatus(`Processing page ${i} of ${pdf.numPages}...`);
            }
            processText(fullText);
          } catch (pdfError) {
            console.error("Error parsing PDF:", pdfError);
            throw new Error("Failed to parse PDF file. It might be corrupted or protected.");
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        throw new Error("Unsupported file type. Please use PDF, DOCX, TXT, or MD.");
      }
    } catch (error: any) {
      console.error("Error parsing file:", error);
      toast({
        variant: "destructive",
        title: "Parsing Failed",
        description: error.message || "Could not parse the selected file.",
      });
      handleRemoveFile();
    } finally {
      setIsLoading(prev => ({ ...prev, parsing: false }));
    }
  }, [file, toast]);

  /**
   * Handles changes in the question count sliders.
   * @param type The type of question.
   * @param value The new count.
   */
  const handleSliderChange = (type: keyof typeof questionCounts, value: number[]) => {
    setQuestionCounts(prev => ({ ...prev, [type]: value[0] }));
  };

  /**
   * Chunks the text content into smaller pieces to fit within the AI model's context window.
   * @param text The full text content.
   * @returns An array of text chunks.
   */
  const chunkText = (text: string): string[] => {
    const chunkSize = 4000; // Characters, approximates to ~1000 tokens
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  };
  
  /**
   * Fetches generated questions from the AI model.
   * It handles chunking the document and distributing question generation across chunks.
   */
  const handleGenerateQuestions = useCallback(async () => {
    if (!textContent) {
      toast({ variant: "destructive", title: "No text content", description: "Please parse a document first." });
      return;
    }
    if (!apiKey) {
      toast({ variant: "destructive", title: "API Key is missing", description: "Please enter your Gemini API key." });
      return;
    }
    
    setIsLoading(prev => ({ ...prev, generating: true }));
    setGradedResult(null); // Reset grading when regenerating
    setUserAnswers({});
    
    try {
        const textChunks = chunkText(textContent);
        const totalQuestions = questionCounts.fillInTheBlank + questionCounts.multipleChoice + questionCounts.trueFalse;
        
        if (totalQuestions === 0) {
            setQuestions({ fillInTheBlank: [], multipleChoice: [], trueFalse: [] });
            setIsLoading(prev => ({ ...prev, generating: false }));
            return;
        }

        let allGenerated: GeneratedQuestions = { fillInTheBlank: [], multipleChoice: [], trueFalse: [] };
        
        const promises = textChunks.map(chunk => {
            const numFill = Math.ceil(questionCounts.fillInTheBlank / textChunks.length);
            const numMcq = Math.ceil(questionCounts.multipleChoice / textChunks.length);
            const numTf = Math.ceil(questionCounts.trueFalse / textChunks.length);
            
            return generateQuestions({
                text: chunk,
                numFillInTheBlank: numFill,
                numMultipleChoice: numMcq,
                numTrueFalse: numTf,
            });
        });

        const results = await Promise.all(promises);

        for (const response of results) {
            allGenerated.fillInTheBlank.push(...response.fillInTheBlank.map(q => parseQuestion(q, 'fill')).filter(Boolean) as Question[]);
            allGenerated.multipleChoice.push(...response.multipleChoice.map(q => parseQuestion(q, 'mcq')).filter(Boolean) as Question[]);
            allGenerated.trueFalse.push(...response.trueFalse.map(q => parseQuestion(q, 'tf')).filter(Boolean) as Question[]);
        }

        setQuestions({
            fillInTheBlank: allGenerated.fillInTheBlank.slice(0, questionCounts.fillInTheBlank),
            multipleChoice: allGenerated.multipleChoice.slice(0, questionCounts.multipleChoice),
            trueFalse: allGenerated.trueFalse.slice(0, questionCounts.trueFalse),
        });

    } catch (error) {
      console.error("Error generating questions:", error);
      toast({ variant: "destructive", title: "Generation Failed", description: "The AI failed to generate questions. Please check your API key and try again." });
    } finally {
      setIsLoading(prev => ({ ...prev, generating: false }));
    }
  }, [apiKey, parseQuestion, questionCounts, textContent, toast]);

  /**
   * Regenerates a single question.
   * @param type The type of the question to regenerate.
   * @param questionToRegen The original question object.
   */
  const handleRegenerateQuestion = useCallback(async (type: QuestionType, questionToRegen: Question) => {
    setIsLoading(prev => ({ ...prev, regenerating: questionToRegen.id }));
    try {
        const questionTypeMap = {
            fillInTheBlank: 'Fill-in-the-Blank',
            multipleChoice: 'MCQ',
            trueFalse: 'True/False'
        };
        
        const response = await regenerateQuestion({
            questionType: questionTypeMap[type] as 'Fill-in-the-Blank' | 'MCQ' | 'True/False',
            originalQuestion: questionToRegen.question,
            context: textContent,
        });

        const newQuestion = parseQuestion(response.regeneratedQuestion, questionToRegen.type);

        if (newQuestion) {
            setQuestions(prev => {
                const updatedList = prev[type].map(q => q.id === questionToRegen.id ? newQuestion : q);
                return { ...prev, [type]: updatedList };
            });
        }
    } catch (error) {
        console.error("Error regenerating question:", error);
        toast({ variant: "destructive", title: "Regeneration Failed" });
    } finally {
        setIsLoading(prev => ({ ...prev, regenerating: null }));
    }
  }, [parseQuestion, textContent, toast]);
  
  /**
   * Handles changes to user's answers.
   * @param questionId The ID of the question being answered.
   * @param answer The user's selected answer.
   */
  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };
  
  /**
   * Grades the quiz by comparing user answers with correct answers.
   */
  const handleGradeQuiz = () => {
    const allQuestions = [
      ...questions.fillInTheBlank,
      ...questions.multipleChoice,
      ...questions.trueFalse
    ];
    let correctCount = 0;
    const results: { [questionId: string]: boolean } = {};

    allQuestions.forEach(q => {
      const userAnswer = userAnswers[q.id]?.trim().toLowerCase();
      const correctAnswer = q.answer.trim().toLowerCase();
      
      let isCorrect = false;
      if (q.type === 'mcq') {
        // For MCQs, answer can be "C. Tokyo" or just "C" or "Tokyo"
        isCorrect = correctAnswer.includes(userAnswer || "___xyz___");
      } else {
        isCorrect = userAnswer === correctAnswer;
      }

      if (isCorrect) {
        correctCount++;
      }
      results[q.id] = !!isCorrect;
    });

    const score = allQuestions.length > 0 ? (correctCount / allQuestions.length) * 100 : 0;
    setGradedResult({ score, results });
    setShowAnswers(true);
    toast({
        title: "Quiz Graded!",
        description: `You scored ${score.toFixed(0)}%.`,
    });
  };

  /**
   * Exports the generated questions to a specified format (TXT, JSON, MD, PDF, DOCX).
   * @param format The desired export format.
   */
  const handleExport = (format: "txt" | "json" | "md" | "pdf" | "docx") => {
    const allQuestions = [
      ...questions.fillInTheBlank,
      ...questions.multipleChoice,
      ...questions.trueFalse,
    ];

    if (allQuestions.length === 0) {
      toast({ variant: "destructive", title: "No questions to export" });
      return;
    }

    const questionText = (q: Question) => {
      if (q.type === 'mcq' && q.options) {
        const optionsString = q.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n');
        return `${q.question}\n${optionsString}`;
      }
      return q.question.replace('____', '________________');
    };
    
    const fullText = (showAnswers: boolean) =>
      ['Fill-in-the-Blank', 'Multiple Choice', 'True/False'].map(type => {
        const qList = type === 'Fill-in-the-Blank' ? questions.fillInTheBlank : type === 'Multiple Choice' ? questions.multipleChoice : questions.trueFalse;
        if (qList.length === 0) return '';
        return `${type.toUpperCase()}\n\n` + qList.map((q, i) =>
          `${i + 1}. ${questionText(q)}${showAnswers ? `\nAnswer: ${q.answer}` : ''}`
        ).join('\n\n') + '\n\n';
      }).join('');

    if (format === "txt") {
      const blob = new Blob([fullText(true)], { type: "text/plain;charset=utf-8" });
      saveAs(blob, "quizcraft-questions.txt");
    } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        const content = fullText(true);
        const lines = doc.splitTextToSize(content, 180);
        
        let cursorY = 20;
        const pageHeight = doc.internal.pageSize.height;
        for (const line of lines) {
            if (cursorY > pageHeight - 20) {
                doc.addPage();
                cursorY = 20;
            }
            doc.text(line, 15, cursorY);
            cursorY += 7;
        }
        doc.save('quizcraft-questions.pdf');
    } else if (format === 'docx') {
        const doc = new DocxDocument({
            sections: [{
                children: fullText(true).split('\n').map(line => new Paragraph({
                    children: [new TextRun(line)]
                }))
            }]
        });
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, 'quizcraft-questions.docx');
        });
    } else if (format === "json") {
      const json = JSON.stringify(questions, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      saveAs(blob, "quizcraft-questions.json");
    } else if (format === "md") {
      const mdContent = ['Fill-in-the-Blank', 'Multiple Choice', 'True/False'].map(type => {
        const qList = type === 'Fill-in-the-Blank' ? questions.fillInTheBlank : type === 'Multiple Choice' ? questions.multipleChoice : questions.trueFalse;
        if (qList.length === 0) return '';
        return `## ${type}\n\n` + qList.map((q, i) =>
          `${i + 1}. ${questionText(q)}\n   **Answer:** ${q.answer}`
        ).join('\n\n') + '\n\n';
      }).join('');
      const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
      saveAs(blob, "quizcraft-questions.md");
    }
  };

  /**
   * Memoized value to check if any questions have been generated.
   */
  const hasQuestions = useMemo(() => {
    return questions.fillInTheBlank.length > 0 || questions.multipleChoice.length > 0 || questions.trueFalse.length > 0;
  }, [questions]);

  // If the component hasn't mounted yet, render a loading state or nothing to avoid hydration mismatch.
  if (!hasMounted) {
    return null; 
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      {/* Header */}
      <header className="bg-card shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-8 w-8" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              QuizCraft AI
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Setup and Generation */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* API Key Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="text-primary" />
                <span>API Key</span>
              </CardTitle>
              <CardDescription>
                Enter your Google Gemini API key. It's stored securely in your browser's session storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="password"
                placeholder="Enter your Gemini API Key"
                value={apiKey}
                onChange={handleApiKeyChange}
              />
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="text-primary" />
                    <span>Upload Document</span>
                </CardTitle>
                <CardDescription>
                    Upload a PDF, DOCX, TXT, or MD file (max 10MB).
                </CardDescription>
            </CardHeader>
            <CardContent>
            {file ? (
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <File size={20} className="text-primary flex-shrink-0" />
                        <span className="truncate text-sm font-medium">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt,.md"
                    />
                    <label htmlFor="file-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                        <UploadCloud className="h-10 w-10 text-gray-400" />
                        <span className="text-sm font-medium">Drag & drop or click to upload</span>
                        <span className="text-xs text-gray-500">PDF, DOCX, TXT, MD up to 10MB</span>
                    </label>
                </div>
            )}
            {file && !textContent && (
                <Button 
                    onClick={handleParseFile} 
                    disabled={isLoading.parsing}
                    className="w-full mt-4"
                >
                    {isLoading.parsing ? <Loader2 className="animate-spin" /> : "Parse Document"}
                </Button>
            )}
            {isLoading.parsing && (
                <div className="mt-4 space-y-2">
                    <Progress value={parsingProgress} />
                    <p className="text-xs text-center text-gray-500">{parsingStatus}</p>
                </div>
            )}
            </CardContent>
          </Card>
          
          {/* Question Generation Controls */}
          {textContent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="text-primary" />
                  <span>Configure Questions</span>
                </CardTitle>
                <CardDescription>
                  Choose how many questions of each type to generate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Fill-in-the-Blank: {questionCounts.fillInTheBlank}</Label>
                  <Slider
                    value={[questionCounts.fillInTheBlank]}
                    onValueChange={(val) => handleSliderChange("fillInTheBlank", val)}
                    max={20}
                    step={1}
                  />
                </div>
                <div>
                  <Label>Multiple Choice: {questionCounts.multipleChoice}</Label>
                  <Slider
                    value={[questionCounts.multipleChoice]}
                    onValueChange={(val) => handleSliderChange("multipleChoice", val)}
                    max={20}
                    step={1}
                  />
                </div>
                <div>
                  <Label>True/False: {questionCounts.trueFalse}</Label>
                  <Slider
                    value={[questionCounts.trueFalse]}
                    onValueChange={(val) => handleSliderChange("trueFalse", val)}
                    max={20}
                    step={1}
                  />
                </div>
                <Button
                  onClick={handleGenerateQuestions}
                  disabled={isLoading.generating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading.generating ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Questions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Generated Questions */}
        <div className="lg:col-span-2">
          {hasQuestions ? (
            <Card className="shadow-lg">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Generated Quiz</CardTitle>
                        <CardDescription>Review the questions or start the quiz.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => handleExport('txt')}><FileText className="mr-2 h-4 w-4" />TXT</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleExport('json')}><FileJson2 className="mr-2 h-4 w-4" />JSON</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleExport('md')}><FileCode2 className="mr-2 h-4 w-4" />Markdown</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleExport('pdf')}><File className="mr-2 h-4 w-4" />PDF</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleExport('docx')}><File className="mr-2 h-4 w-4" />DOCX</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center space-x-2">
                                        <Label htmlFor="show-answers" className="text-sm">Show Answers</Label>
                                        <Switch
                                            id="show-answers"
                                            checked={showAnswers}
                                            onCheckedChange={setShowAnswers}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Toggle to reveal correct answers.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
              <CardContent>
                {gradedResult && (
                    <div className="p-4 mb-6 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                        <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200">Quiz Complete!</h3>
                        <p className="text-4xl font-bold mt-2 text-primary">{gradedResult.score.toFixed(0)}%</p>
                    </div>
                )}
                <Accordion type="multiple" defaultValue={["fillInTheBlank", "multipleChoice", "trueFalse"]} className="w-full">
                  {questions.fillInTheBlank.length > 0 && (
                    <AccordionItem value="fillInTheBlank">
                      <AccordionTrigger className="text-lg font-semibold">
                        Fill-in-the-Blank ({questions.fillInTheBlank.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-6">
                          {questions.fillInTheBlank.map((q, index) => {
                            const result = gradedResult?.results[q.id];
                            return (
                                <div key={q.id} className={cn("p-4 rounded-lg border", result === true ? "border-green-500 bg-green-50 dark:bg-green-900/20" : result === false ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700")}>
                                  <div className="flex justify-between items-start gap-4">
                                    <Label htmlFor={`q-${q.id}`} className="font-medium flex-grow">
                                      {index + 1}. {q.question.replace('____', '')}
                                      <Input
                                          id={`q-${q.id}`}
                                          type="text"
                                          className="mt-2"
                                          placeholder="Type your answer here..."
                                          value={userAnswers[q.id] || ''}
                                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                          disabled={showAnswers}
                                      />
                                    </Label>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRegenerateQuestion("fillInTheBlank", q)}
                                            disabled={!!isLoading.regenerating}
                                            className="flex-shrink-0"
                                          >
                                            {isLoading.regenerating === q.id ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Regenerate question</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  {showAnswers && (
                                    <p className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">
                                      Correct Answer: {q.answer}
                                    </p>
                                  )}
                                </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {questions.multipleChoice.length > 0 && (
                    <AccordionItem value="multipleChoice">
                        <AccordionTrigger className="text-lg font-semibold">Multiple Choice ({questions.multipleChoice.length})</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-6">
                            {questions.multipleChoice.map((q, index) => {
                                const result = gradedResult?.results[q.id];
                                return (
                                <div key={q.id} className={cn("p-4 rounded-lg border", result === true ? "border-green-500 bg-green-50 dark:bg-green-900/20" : result === false ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700")}>
                                    <div className="flex justify-between items-start gap-4">
                                      <p className="font-medium flex-grow">{index + 1}. {q.question}</p>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => handleRegenerateQuestion('multipleChoice', q)} disabled={!!isLoading.regenerating} className="flex-shrink-0">
                                              {isLoading.regenerating === q.id ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Regenerate question</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    <RadioGroup onValueChange={(val) => handleAnswerChange(q.id, val)} value={userAnswers[q.id]} className="mt-4 space-y-2 pl-2" disabled={showAnswers}>
                                    {q.options?.map((option, i) => (
                                        <div key={i} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option} id={`${q.id}-${i}`} />
                                        <Label htmlFor={`${q.id}-${i}`} className="font-normal">{String.fromCharCode(65 + i)}. {option}</Label>
                                        </div>
                                    ))}
                                    </RadioGroup>
                                    {showAnswers && <p className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">Correct Answer: {q.answer}</p>}
                                </div>
                                );
                            })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                  )}
                  {questions.trueFalse.length > 0 && (
                    <AccordionItem value="trueFalse">
                      <AccordionTrigger className="text-lg font-semibold">True/False ({questions.trueFalse.length})</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-6">
                            {questions.trueFalse.map((q, index) => {
                                const result = gradedResult?.results[q.id];
                                return (
                                <div key={q.id} className={cn("p-4 rounded-lg border", result === true ? "border-green-500 bg-green-50 dark:bg-green-900/20" : result === false ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700")}>
                                    <div className="flex justify-between items-start gap-4">
                                      <p className="font-medium flex-grow">{index + 1}. {q.question}</p>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" onClick={() => handleRegenerateQuestion('trueFalse', q)} disabled={!!isLoading.regenerating} className="flex-shrink-0">
                                              {isLoading.regenerating === q.id ? <Loader2 className="animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                          </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Regenerate question</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    <RadioGroup onValueChange={(val) => handleAnswerChange(q.id, val)} value={userAnswers[q.id]} className="mt-4 space-y-2 pl-2" disabled={showAnswers}>
                                      <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="True" id={`${q.id}-true`} />
                                          <Label htmlFor={`${q.id}-true`} className="font-normal">True</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="False" id={`${q.id}-false`} />
                                          <Label htmlFor={`${q.id}-false`} className="font-normal">False</Label>
                                      </div>
                                    </RadioGroup>
                                    {showAnswers && <p className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">Correct Answer: {q.answer}</p>}
                                </div>
                                );
                            })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                {hasQuestions && !gradedResult && (
                    <div className="mt-6">
                        <Button onClick={handleGradeQuiz} className="w-full text-lg py-6 bg-accent hover:bg-accent/90 text-accent-foreground">
                            Grade My Quiz!
                        </Button>
                    </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 min-h-[400px] border-dashed">
              <Bot className="h-16 w-16 text-gray-300 dark:text-gray-600" />
              <h3 className="mt-4 text-xl font-semibold">Your Quiz Awaits</h3>
              <p className="mt-2 text-center text-gray-500">
                Upload a document and configure your questions to get started.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
