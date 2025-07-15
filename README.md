# QuizCraft AI

QuizCraft AI is a web application that leverages the power of Google's Gemini AI to automatically generate mock exam questions from your academic PDF documents. Simply upload your study materials, and get a set of fill-in-the-blank, multiple-choice, and true/false questions to help you prepare for your exams.

![QuizCraft AI Screenshot](https://storage.googleapis.com/project-spark-341006-public/a6c57f0f-6147-497b-b5d1-72f3d6118d0c.png)

## ✨ Features

- **📄 PDF Upload**: Upload any PDF document (up to 10MB) to use as a source for question generation.
- **🧠 AI-Powered Question Generation**: Utilizes Google Gemini to create relevant questions based on the document's content.
- **✅ Multiple Question Types**: Generates a mix of Fill-in-the-Blank, Multiple Choice (MCQ), and True/False questions.
- **🔧 Customizable Generation**: Specify the number of questions you want for each type.
- **🔄 Regenerate Questions**: Don't like a question? Regenerate it with a single click for a new version.
- **💾 Multiple Export Formats**: Export your generated quiz to TXT, JSON, Markdown, PDF, or DOCX files.
- **🔐 Secure API Key Handling**: Your Google Gemini API key is stored exclusively in your browser's local storage and is never sent to our servers.
- **🎨 Light & Dark Mode**: A sleek interface with support for both light and dark themes.
- ** responsive**: Fully responsive design that works on desktop and mobile devices.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **AI Integration**: [Google Genkit](https://firebase.google.com/docs/genkit)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PDF Parsing**: [pdf.js](https://mozilla.github.io/pdf.js/)

## 🚀 Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- `npm`, `pnpm`, or `yarn`

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/quizcraft-ai.git
    cd quizcraft-ai
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up your environment variables:**
    You'll need a Google Gemini API key to use the AI features. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

    The application is designed to have the user input their key directly in the UI, but you can set it up in an environment file for local development.

    Create a `.env` file in the root of the project and add your key:
    ```
    GOOGLE_API_KEY=your_gemini_api_key
    ```
    *Note: The key entered in the UI will always take precedence over the one in the `.env` file.*


4.  **Run the development server:**
    The application uses `genkit` for the AI flows and `next` for the frontend. You can run them concurrently.

    In your first terminal, run the Genkit server:
    ```sh
    npm run genkit:dev
    ```

    In a second terminal, run the Next.js development server:
    ```sh
    npm run dev
    ```

5.  **Open the application:**
    Open [http://localhost:9002](http://localhost:9002) in your browser to see the result.

## Usage

1.  **Enter your Gemini API Key**: Paste your key into the designated input field. It will be saved in your browser for future sessions.
2.  **Upload a PDF**: Drag and drop a PDF file or click to select one from your computer.
3.  **Parse the Document**: Click the "Parse PDF" button to extract the text content.
4.  **Configure Questions**: Use the sliders to choose how many questions of each type you want to generate.
5.  **Generate**: Click "Generate Questions" and wait for the AI to create your quiz.
6.  **Review and Export**: Look through the generated questions, regenerate any you dislike, and export the final set in your desired format.
