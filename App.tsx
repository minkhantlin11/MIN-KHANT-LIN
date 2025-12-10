import React, { useState } from 'react';
import { FullTest, TestStatus } from './types';
import TestGenerator from './components/TestGenerator';
import ListeningSection from './components/ListeningSection';
import SpeakingSection from './components/SpeakingSection';
import LiveInterview from './components/LiveInterview';
import BotTutor from './components/BotTutor';
import { evaluateSubmission } from './services/geminiService';
import { CheckCircle, Clock, Volume2, PenTool, Book, BarChart2, Award, Mic, Info } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<TestStatus>(TestStatus.IDLE);
  const [test, setTest] = useState<FullTest | null>(null);
  const [activeSection, setActiveSection] = useState<'reading' | 'listening' | 'writing' | 'speaking'>('reading');
  const [showLiveInterview, setShowLiveInterview] = useState(false);
  
  // User Answers
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, string>>({});
  const [writingAnswers, setWritingAnswers] = useState<Record<string, string>>({});
  const [speakingTranscripts, setSpeakingTranscripts] = useState<Record<string, string>>({});

  // Result
  const [result, setResult] = useState<any | null>(null);

  const handleTestGenerated = (generatedTest: FullTest) => {
    setTest(generatedTest);
    setStatus(TestStatus.IN_PROGRESS);
    setActiveSection('reading');
  };

  const handleSubmit = async () => {
    if (!test) return;
    setStatus(TestStatus.EVALUATING);
    try {
      const submission = {
        reading: readingAnswers,
        listening: listeningAnswers,
        writing: writingAnswers,
        speaking: speakingTranscripts
      };
      const resultJson = await evaluateSubmission(test, submission);
      const parsedResult = JSON.parse(resultJson);
      setResult(parsedResult);
      setStatus(TestStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      alert("Evaluation failed. Please try again.");
      setStatus(TestStatus.IN_PROGRESS);
    }
  };

  const renderSection = () => {
    if (!test) return null;

    switch (activeSection) {
      case 'reading':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Instructions */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-blue-900">Instructions</h4>
                        <p className="text-blue-800 text-sm mt-1 leading-relaxed">
                            Read the following passages carefully. For each question, select the best answer from the options provided. Ensure you read the entire text to understand the context before answering.
                        </p>
                    </div>
                </div>
            </div>

            {test.reading.passages.map((p, idx) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
                  <h3 className="text-lg font-bold text-indigo-900">Passage {idx + 1}: {p.title}</h3>
                </div>
                <div className="p-6">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed mb-8 font-serif text-lg">{p.text}</p>
                  <div className="space-y-6">
                    {p.questions.map((q, qIdx) => (
                      <div key={q.id} className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium text-gray-800 mb-2">{qIdx + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map(opt => (
                            <label key={opt} className={`flex items-center gap-3 p-3 rounded cursor-pointer border transition-colors ${readingAnswers[q.id] === opt ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-gray-200 hover:border-indigo-200'}`}>
                              <input 
                                type="radio" 
                                name={q.id} 
                                value={opt} 
                                checked={readingAnswers[q.id] === opt} 
                                onChange={() => setReadingAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className="text-indigo-600"
                              />
                              <span className="text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'listening':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Instructions */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-blue-900">Instructions</h4>
                        <p className="text-blue-800 text-sm mt-1 leading-relaxed">
                            Click the play button to listen to the audio passage. You may listen to the audio as many times as you need. Answer the questions based on the information in the recording.
                        </p>
                    </div>
                </div>
            </div>

            {test.listening.scripts.map((script) => (
              <ListeningSection 
                key={script.id} 
                script={script} 
                answers={listeningAnswers}
                onAnswer={(qid, ans) => setListeningAnswers(prev => ({ ...prev, [qid]: ans }))}
              />
            ))}
          </div>
        );
      case 'writing':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Instructions */}
             <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-blue-900">Instructions</h4>
                        <p className="text-blue-800 text-sm mt-1 leading-relaxed">
                            Complete the tasks below. For sentence correction, rewrite the sentence with proper grammar. For paragraphs and essays, write a structured response in the text box provided.
                        </p>
                    </div>
                </div>
            </div>

             {test.writing.tasks.map((task, idx) => (
               <div key={task.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                 <div className="mb-4">
                   <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{task.type} Task {idx + 1}</span>
                   <h3 className="text-lg font-medium text-gray-900 mt-1">{task.prompt}</h3>
                 </div>
                 <textarea
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
                    placeholder="Type your answer here..."
                    value={writingAnswers[task.id] || ''}
                    onChange={(e) => setWritingAnswers(prev => ({...prev, [task.id]: e.target.value}))}
                 />
               </div>
             ))}
          </div>
        );
      case 'speaking':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
             {/* Instructions */}
             <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-blue-900">Instructions</h4>
                        <p className="text-blue-800 text-sm mt-1 leading-relaxed">
                            For each task, read the prompt and prepare your answer. Click the microphone icon to record your response. Speak clearly and naturally. Click the stop button when finished.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {test.speaking.tasks.map((task) => (
               <SpeakingSection
                 key={task.id}
                 task={task}
                 transcript={speakingTranscripts[task.id]}
                 onRecordComplete={(tid, text) => setSpeakingTranscripts(prev => ({...prev, [tid]: text}))}
               />
             ))}
            </div>
          </div>
        );
    }
  };

  if (status === TestStatus.IDLE || status === TestStatus.GENERATING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <TestGenerator 
            onTestGenerated={handleTestGenerated} 
            setStatus={setStatus} 
            status={status}
          />
          <div className="mt-8 text-center">
             <button 
               onClick={() => setShowLiveInterview(true)}
               className="bg-white text-indigo-600 px-6 py-3 rounded-full font-semibold shadow-md hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
             >
                <Volume2 className="w-5 h-5" /> Practice with Live Interviewer
             </button>
          </div>
        </div>
        {showLiveInterview && <LiveInterview onClose={() => setShowLiveInterview(false)} />}
      </div>
    );
  }

  if (status === TestStatus.COMPLETED && result) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-indigo-100 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
             <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
             <h1 className="text-4xl font-bold text-gray-900 mb-2">Test Completed</h1>
             <p className="text-xl text-gray-600 mb-6">Your estimated level: <span className="font-bold text-indigo-600 text-2xl">{result.level}</span></p>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {Object.entries(result.breakdown).map(([key, val]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-xl">
                        <div className="text-xs uppercase text-gray-500 font-semibold mb-1">{key}</div>
                        <div className="text-2xl font-bold text-gray-800">{val as number}/25</div> {/* Approximating section weights visually */}
                    </div>
                ))}
             </div>
             
             <div className="text-left bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">Detailed Feedback</h3>
                <p className="text-blue-800 whitespace-pre-wrap">{result.feedback}</p>
             </div>

             <button 
               onClick={() => { setStatus(TestStatus.IDLE); setTest(null); setResult(null); }}
               className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
             >
               Take Another Test
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
             <span className="font-bold text-gray-800">LinguistAI</span>
           </div>
           
           <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'reading', icon: Book, label: 'Reading' },
                { id: 'listening', icon: Volume2, label: 'Listening' },
                { id: 'writing', icon: PenTool, label: 'Writing' },
                { id: 'speaking', icon: Mic, label: 'Speaking' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeSection === tab.id 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
           </div>

           <button 
             onClick={handleSubmit}
             disabled={status === TestStatus.EVALUATING}
             className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
           >
             {status === TestStatus.EVALUATING ? (
                 <>
                   <Clock className="w-4 h-4 animate-spin" /> Evaluating...
                 </>
             ) : (
                 <>
                   <CheckCircle className="w-4 h-4" /> Submit Test
                 </>
             )}
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        {renderSection()}
      </main>

      <BotTutor />
      {showLiveInterview && <LiveInterview onClose={() => setShowLiveInterview(false)} />}
    </div>
  );
};

export default App;