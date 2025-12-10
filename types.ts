export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string; // The letter or full text
}

export interface ReadingPassage {
  id: string;
  title: string;
  text: string;
  questions: Question[]; // Comprehension + Vocab mixed
}

export interface WritingTask {
  id: string;
  type: 'grammar' | 'paragraph' | 'essay';
  prompt: string;
}

export interface ListeningScript {
  id: string;
  title: string;
  script: string; // To be converted to audio
  questions: Question[];
}

export interface SpeakingTask {
  id: string;
  type: 'picture' | 'role-play' | 'opinion' | 'storytelling';
  prompt: string;
  imageUrl?: string; // For picture description
}

export interface FullTest {
  reading: {
    passages: ReadingPassage[];
  };
  writing: {
    tasks: WritingTask[];
  };
  listening: {
    scripts: ListeningScript[];
  };
  speaking: {
    tasks: SpeakingTask[];
  };
}

export interface TestResult {
  score: number;
  level: string; // A1, A2, etc.
  breakdown: {
    reading: number;
    writing: number;
    listening: number;
    speaking: number;
  };
  feedback: string;
}

export enum TestStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EVALUATING = 'EVALUATING'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
