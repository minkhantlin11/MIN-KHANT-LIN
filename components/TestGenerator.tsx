import React, { useState } from 'react';
import { generateFullTest } from '../services/geminiService';
import { FullTest, TestStatus } from '../types';
import { Loader2, BookOpen, Sparkles } from 'lucide-react';

interface Props {
  onTestGenerated: (test: FullTest) => void;
  setStatus: (status: TestStatus) => void;
  status: TestStatus;
}

const TestGenerator: React.FC<Props> = ({ onTestGenerated, setStatus, status }) => {
  const [topic, setTopic] = useState('');

  const handleGenerate = async () => {
    setStatus(TestStatus.GENERATING);
    try {
      const test = await generateFullTest(topic || undefined);
      onTestGenerated(test);
      setStatus(TestStatus.READY);
    } catch (error) {
      console.error(error);
      alert("Failed to generate test. Please try again.");
      setStatus(TestStatus.IDLE);
    }
  };

  if (status === TestStatus.GENERATING) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 animate-in fade-in">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
        <h2 className="text-xl font-semibold text-gray-700">Generating your unique test...</h2>
        <p className="text-sm text-gray-500">Using Gemini 3 Pro to craft reading, writing, listening, and speaking tasks.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 mt-10">
      <div className="text-center space-y-4 mb-8">
        <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">CEFR English Proficiency Test</h1>
        <p className="text-gray-600">
          Generate a complete A1-C1 assessment powered by AI. 
          Includes Reading, Listening, Writing, and Speaking sections.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Focus Topic (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., Technology, Travel, Business, Environment"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={status !== TestStatus.IDLE}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md"
        >
          <Sparkles className="w-5 h-5" />
          Generate New Test
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Powered by Gemini 3 Pro & 2.5 Flash. Generates ~50 questions.
        </p>
      </div>
    </div>
  );
};

export default TestGenerator;
