"use client";

import * as React from "react";
import * as pdfjs from "pdfjs-dist";
import { Document, Page, pdfjs as pdfjsReact } from "react-pdf";
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
  ChevronDown,
  ChevronRight,
  Clipboard,
  Download,
  FileCode2,
  FileJson2,
  FileText,
  FileWord,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { jsPDF } from "jspdf";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import { convert } from 'html-to-text';
import { ThemeToggle } from "./theme-toggle";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Question {
  id: string;
  type: "fib" | "mcq" | "tf";
  question: string;
  options?: string[];
  answer: string;
  context: string;
}

type QuestionCounts = {
  fib: number;
  mcq: number;
  tf: number;
};

type QuestionState = {
  fillInTheBlank: Question[];
  multipleChoice: Question[];
  trueFalse: Question[];
};

const initialQuestions: QuestionState = {
  fillInTheBlank: [],
  multipleChoice: [],
  trueFalse: [],
};

export function QuizCreator() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = React.useState<string>("");
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<string>("idle");
  const [progress, setProgress] = React.useState<number>(0);
  const [documentChunks, setDocumentChunks] = React.useState<string[]>([]);
  const [questions, setQuestions] = React.useState<QuestionState>(initialQuestions);
  const [questionCounts, setQuestionCounts] = React.useState<QuestionCounts>({ fib: 3, mcq: 3, tf: 3 });
  const [openAnswers, setOpenAnswers] = React.useState<Set<string>>(new Set());
  const [regeneratingId, setRegeneratingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const storedApiKey = localStorage.getItem("gemini-api-key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    localStorage.setItem("gemini-api-key", key);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" || selectedFile.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a PDF file smaller than 10MB.",
      });
      return;
    }
    setFile(selectedFile);
    setQuestions(initialQuestions);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const parsePdf = async () => {
    if (!file) return;

    setStatus("parsing");
    setProgress(0);
    setQuestions(initialQuestions);

    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      await new Promise<void>((resolve) => (reader.onload = () => resolve()));
      
      const pdf = await pdfjs.getDocument(reader.result as ArrayBuffer).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item) => ('str' in item ? item.str : '')).join(" ");
        setProgress((i / pdf.numPages) * 100);
      }
      
      const chunks = await intelligentlyChunkDocument({ documentContent: fullText });
      setDocumentChunks(chunks);
      setStatus("parsed");
    } catch (error) {
      console.error("Error parsing PDF:", error);
      toast({ variant: "destructive", title: "PDF Parsing Error", description: "Could not extract text from the PDF." });
      setStatus("idle");
    }
  };

  const handleGenerateQuestions = async () => {
    if (!documentChunks.length) {
      toast({ variant: "destructive", title: "No document", description: "Please upload and parse a PDF first." });
      return;
    }
    if (!apiKey) {
      toast({ variant: "destructive", title: "API Key Missing", description: "Please enter your Gemini API key." });
      return;
    }
    
    setStatus("generating");
    setProgress(0);
    setQuestions(initialQuestions);
    setOpenAnswers(new Set());

    try {
      let allGeneratedQuestions: QuestionState = { fillInTheBlank: [], multipleChoice: [], trueFalse: [] };
      
      for (let i = 0; i < documentChunks.length; i++) {
        const chunk = documentChunks[i];
        const res = await generateQuestions({
          text: chunk,
          numFillInTheBlank: questionCounts.fib,
          numMultipleChoice: questionCounts.mcq,
          numTrueFalse: questionCounts.tf,
        });

        const parsed = parseAIResponse(res, chunk);
        allGeneratedQuestions.fillInTheBlank.push(...parsed.fillInTheBlank);
        allGeneratedQuestions.multipleChoice.push(...parsed.multipleChoice);
        allGeneratedQuestions.trueFalse.push(...parsed.trueFalse);
        
        setProgress(((i + 1) / documentChunks.length) * 100);
      }
      
      setQuestions(allGeneratedQuestions);
      setStatus("complete");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast({ variant: "destructive", title: "Generation Error", description: "Failed to generate questions. Check your API key and try again." });
      setStatus("parsed");
    }
  };
  
  const parseAIResponse = (response: GenerateQuestionsOutput, context: string): QuestionState => {
    const parse = (raw: string[], type: Question['type']): Question[] => 
      raw.map((q, i) => {
        const [questionText, ...answerParts] = q.split('Answer:');
        const answer = answerParts.join('Answer:').trim();
        let options;

        if (type === 'mcq') {
            const mcqParts = questionText.trim().match(/(.*?)(A\..*?B\..*?C\..*?D\..*)/s);
            if(mcqParts) {
                const [, question, opts] = mcqParts;
                options = opts.split(/(?=[A-D]\.)/).map(opt => opt.trim()).filter(Boolean);
                return { id: `${type}-${Date.now()}-${i}`, type, question: question.trim(), answer, options, context };
            }
        }
        return { id: `${type}-${Date.now()}-${i}`, type, question: questionText.trim(), answer, context };
      }).filter(q => q.question && q.answer);

    return {
      fillInTheBlank: parse(response.fillInTheBlank, 'fib'),
      multipleChoice: parse(response.multipleChoice, 'mcq'),
      trueFalse: parse(response.trueFalse, 'tf'),
    };
  };

  const handleRegenerate = async (question: Question) => {
    setRegeneratingId(question.id);
    try {
      const questionTypeMap = { fib: 'Fill-in-the-Blank', mcq: 'MCQ', tf: 'True/False' };
      const response = await regenerateQuestion({
        originalQuestion: question.question,
        questionType: questionTypeMap[question.type],
        context: question.context,
      });

      const [newQuestionText, ...answerParts] = response.regeneratedQuestion.split('Answer:');
      const newAnswer = answerParts.join('Answer:').trim();

      const updatedQuestion = { ...question, question: newQuestionText.trim(), answer: newAnswer };
      
      if (question.type === 'mcq' && newQuestionText) {
          const mcqParts = newQuestionText.trim().match(/(.*?)(A\..*?B\..*?C\..*?D\..*)/s);
          if (mcqParts) {
              const [, qText, opts] = mcqParts;
              updatedQuestion.question = qText.trim();
              updatedQuestion.options = opts.split(/(?=[A-D]\.)/).map(opt => opt.trim()).filter(Boolean);
          }
      }

      setQuestions(prev => {
        const newQuestions = { ...prev };
        const keyMap = { fib: 'fillInTheBlank', mcq: 'multipleChoice', tf: 'trueFalse' };
        const qKey = keyMap[question.type];
        // @ts-ignore
        newQuestions[qKey] = newQuestions[qKey].map(q => q.id === question.id ? updatedQuestion : q);
        return newQuestions;
      });

    } catch (error) {
      console.error("Regeneration failed:", error);
      toast({ variant: "destructive", title: "Regeneration Failed", description: "Could not regenerate the question." });
    } finally {
      setRegeneratingId(null);
    }
  };

  const toggleAnswer = (id: string) => {
    setOpenAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const totalQuestions = questions.fillInTheBlank.length + questions.multipleChoice.length + questions.trueFalse.length;

  const exportToFile = (format: 'txt' | 'pdf' | 'docx' | 'json' | 'md') => {
    const questionText = (q: Question) => {
        if(q.type === 'mcq' && q.options) {
            return `${q.question}\n${q.options.join('\n')}`;
        }
        return q.question;
    }
    const fullText = (showAnswers: boolean) => 
        ['Fill-in-the-Blank', 'Multiple Choice', 'True/False'].map(type => {
            const qList = type === 'Fill-in-the-Blank' ? questions.fillInTheBlank : type === 'Multiple Choice' ? questions.multipleChoice : questions.trueFalse;
            if (qList.length === 0) return '';
            return `${type.toUpperCase()}\n\n` + qList.map((q, i) => 
                `${i + 1}. ${questionText(q)}${showAnswers ? `\nAnswer: ${q.answer}` : ''}`
            ).join('\n\n') + '\n\n';
        }).join('');
    
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

  const QuestionList = ({ title, data }: { title: string; data: Question[] }) => (
    <AccordionItem value={title.toLowerCase().replace(" ", "-")} disabled={!data.length}>
      <AccordionTrigger className="text-lg font-medium hover:no-underline">
        <div className="flex items-center gap-2">
            {title} <span className="text-muted-foreground text-sm font-normal">({data.length} questions)</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          {data.map((q) => (
            <Card key={q.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium mb-2">{q.question}</p>
                    {q.options && (
                      <ul className="space-y-1 text-muted-foreground">
                        {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                      </ul>
                    )}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleRegenerate(q)} disabled={regeneratingId === q.id}>
                          {regeneratingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Regenerate Question</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 px-4 py-2">
                <div className="w-full">
                  <button onClick={() => toggleAnswer(q.id)} className="flex items-center gap-1 text-sm font-medium text-primary">
                    {openAnswers.has(q.id) ? "Hide Answer" : "Show Answer"}
                    {openAnswers.has(q.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {openAnswers.has(q.id) && (
                    <div className="mt-2 text-sm text-foreground/80 p-2 bg-background rounded-md flex justify-between items-center">
                      <p><span className="font-semibold">Answer:</span> {q.answer}</p>
                      <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(q.answer)}>
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-8 pb-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Bot className="w-10 h-10 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold font-headline">QuizCraft AI</h1>
                    <p className="text-muted-foreground">Generate exam questions from your PDF study materials.</p>
                </div>
            </div>
            <ThemeToggle />
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 items-start">
        <div className="lg:col-span-1 space-y-6 sticky top-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="text-primary"/> Gemini API Key</CardTitle>
              <CardDescription>Your key is stored locally and never sent to our servers.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input type="password" placeholder="Enter your Gemini API Key" value={apiKey} onChange={handleApiKeyChange}/>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UploadCloud className="text-primary"/> Upload PDF</CardTitle>
              <CardDescription>Drag & drop or select a PDF file (max 10MB).</CardDescription>
            </CardHeader>
            <CardContent>
              <label 
                onDragEnter={handleDragEnter} onDragOver={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}
                className={cn("flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDragging && "border-primary bg-primary/10")}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PDF (MAX. 10MB)</p>
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
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
                <Button onClick={parsePdf} disabled={status === "parsing" || status === "generating"} className="w-full">
                  {status === 'parsing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {status === 'parsing' ? 'Parsing PDF...' : documentChunks.length > 0 ? 'Reparse PDF' : 'Parse PDF'}
                </Button>
              </CardFooter>
            )}
          </Card>

          {status === "parsed" && documentChunks.length > 0 && (
            <Card className="animate-in fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> Generation Settings</CardTitle>
                <CardDescription>Set how many questions of each type to generate per document chunk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Fill-in-the-Blank: {questionCounts.fib}</Label>
                  <Slider value={[questionCounts.fib]} onValueChange={([val]) => setQuestionCounts(c => ({ ...c, fib: val }))} min={0} max={10} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>Multiple Choice: {questionCounts.mcq}</Label>
                  <Slider value={[questionCounts.mcq]} onValueChange={([val]) => setQuestionCounts(c => ({ ...c, mcq: val }))} min={0} max={10} step={1} />
                </div>
                <div className="space-y-2">
                  <Label>True/False: {questionCounts.tf}</Label>
                  <Slider value={[questionCounts.tf]} onValueChange={([val]) => setQuestionCounts(c => ({ ...c, tf: val }))} min={0} max={10} step={1} />
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

        <div className="md:col-span-1 lg:col-span-2">
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

          {totalQuestions > 0 && status === 'complete' && (
            <Card className="animate-in fade-in">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Generated Questions</CardTitle>
                    <CardDescription>{totalQuestions} questions generated from your document.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                      <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('txt')}><FileText className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .txt</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('json')}><FileJson2 className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .json</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('md')}><FileCode2 className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .md</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('pdf')}><Download className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .pdf</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => exportToFile('docx')}><FileWord className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent>Export as .docx</TooltipContent></Tooltip>
                      </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" defaultValue={['fill-in-the-blank', 'multiple-choice', 'true-false']} className="w-full">
                  <QuestionList title="Fill-in-the-Blank" data={questions.fillInTheBlank} />
                  <QuestionList title="Multiple Choice" data={questions.multipleChoice} />
                  <QuestionList title="True/False" data={questions.trueFalse} />
                </Accordion>
              </CardContent>
            </Card>
          )}
          
          {status !== 'generating' && totalQuestions === 0 && (
             <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg h-full">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                    <Sparkles className="w-10 h-10 text-primary"/>
                </div>
                <h3 className="text-xl font-bold font-headline">Your Quiz Awaits</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                    Upload a PDF and provide your API key to start generating questions.
                    Your personalized quiz will appear here.
                </p>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
