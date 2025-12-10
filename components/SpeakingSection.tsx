import React, { useState, useRef } from 'react';
import { SpeakingTask } from '../types';
import { transcribeAudio } from '../services/geminiService';
import { Mic, Square, Loader2, CheckCircle } from 'lucide-react';

interface Props {
  task: SpeakingTask;
  onRecordComplete: (taskId: string, transcript: string) => void;
  transcript?: string;
}

const SpeakingSection: React.FC<Props> = ({ task, onRecordComplete, transcript: existingTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        try {
          // In a real app we might upload the audio, but here we transcribe for text-based scoring context
          const text = await transcribeAudio(blob);
          onRecordComplete(task.id, text);
        } catch (error) {
          console.error("Transcription failed", error);
          alert("Failed to process audio. Try again.");
        } finally {
          setIsProcessing(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Microphone access required for speaking section.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 mb-3 uppercase tracking-wide">
          {task.type}
        </span>
        <h3 className="text-xl font-medium text-gray-900 mb-4">{task.prompt}</h3>
        
        {task.imageUrl && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500 italic">
             {/* Placeholder for where generated image would go */}
             [Image Description: {task.prompt}]
          </div>
        )}

        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            {!isRecording && !isProcessing && !existingTranscript && (
                <button
                    onClick={startRecording}
                    className="flex flex-col items-center gap-3 group"
                >
                    <div className="w-16 h-16 rounded-full bg-indigo-600 group-hover:bg-indigo-700 flex items-center justify-center transition-all shadow-lg group-hover:scale-105">
                        <Mic className="w-8 h-8 text-white" />
                    </div>
                    <span className="text-gray-600 font-medium">Click to Start Recording</span>
                </button>
            )}

            {isRecording && (
                <button
                    onClick={stopRecording}
                    className="flex flex-col items-center gap-3 animate-pulse"
                >
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                        <Square className="w-6 h-6 text-white fill-current" />
                    </div>
                    <span className="text-red-500 font-medium">Recording... Click to Stop</span>
                </button>
            )}

            {isProcessing && (
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <span className="text-indigo-600">Transcribing answer...</span>
                </div>
            )}

            {existingTranscript && !isProcessing && !isRecording && (
                <div className="w-full text-left">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">Answer Recorded</span>
                    </div>
                    <p className="text-gray-600 bg-white p-3 rounded border text-sm italic">
                        "{existingTranscript}"
                    </p>
                    <button 
                        onClick={() => onRecordComplete(task.id, "")}
                        className="text-xs text-indigo-600 mt-2 hover:underline"
                    >
                        Record again
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SpeakingSection;
