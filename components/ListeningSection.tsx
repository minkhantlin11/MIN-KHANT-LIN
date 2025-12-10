import React, { useState, useEffect } from 'react';
import { ListeningScript } from '../types';
import { generateSpeech } from '../services/geminiService';
import { Play, Pause, Loader2, Volume2 } from 'lucide-react';

interface Props {
  script: ListeningScript;
  onAnswer: (questionId: string, answer: string) => void;
  answers: Record<string, string>;
}

const ListeningSection: React.FC<Props> = ({ script, onAnswer, answers }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)());
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Reset audio when script changes
    if (sourceNode) {
      sourceNode.stop();
      setSourceNode(null);
    }
    setAudioBuffer(null);
    setIsPlaying(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script.id]);

  const loadAudio = async () => {
    if (audioBuffer) return audioBuffer;
    setIsLoadingAudio(true);
    try {
      const buffer = await generateSpeech(script.script);
      setAudioBuffer(buffer);
      setIsLoadingAudio(false);
      return buffer;
    } catch (e) {
      console.error("TTS Failed", e);
      setIsLoadingAudio(false);
      alert("Failed to load audio. Please try again.");
      return null;
    }
  };

  const togglePlay = async () => {
    if (isPlaying && sourceNode) {
      sourceNode.stop();
      setIsPlaying(false);
      setSourceNode(null);
    } else {
      await audioContext.resume();
      const buffer = await loadAudio();
      if (!buffer) return;

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      setSourceNode(source);
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{script.title}</h3>
        <p className="text-sm text-slate-500 mb-4">Click play to listen to the passage. You can listen as many times as you need.</p>
        
        <button
          onClick={togglePlay}
          disabled={isLoadingAudio}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
            isPlaying 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isLoadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {isLoadingAudio ? "Generating Audio..." : isPlaying ? "Stop Audio" : "Play Audio"}
        </button>
      </div>

      <div className="space-y-8">
        {script.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <p className="font-medium text-gray-800 mb-3">{idx + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-start gap-3 p-3 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => onAnswer(q.id, opt)}
                    className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListeningSection;
