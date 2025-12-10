import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Volume2, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const LiveInterview: React.FC<Props> = ({ onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  // Helper: Create Blob for input
  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    
    // Encode simple base64 manually
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return {
      data: base64,
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  // Helper: Decode output audio
  const decodeAudioData = async (base64: string, ctx: AudioContext) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const numChannels = 1;
    const sampleRate = 24000;
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const startSession = async () => {
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      
      // Get Mic Stream
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are a strict but encouraging English examiner conducting an oral proficiency interview. Ask the user about their hobbies, work, and opinions. Keep responses concise.",
        },
        callbacks: {
          onopen: () => {
            console.log("Live Session Open");
            setIsConnected(true);
            
            // Start streaming input
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const blob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: blob });
              });
            };
            
            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              const buffer = await decodeAudioData(audioData, ctx);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onclose: () => {
            console.log("Live Session Closed");
            setIsConnected(false);
          },
          onerror: (e) => {
            console.error(e);
            setError("Connection Error");
            cleanup();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e) {
      console.error(e);
      setError("Failed to start session: " + (e as Error).message);
    }
  };

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    // There is no explicit .close() on the session object wrapper in SDK usually, 
    // but we can try if sessionPromise resolved. 
    // Usually closing the client side stream is enough or if the SDK exposes close.
    // Assuming simple cleanup here.
    setIsConnected(false);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 w-full max-w-lg rounded-2xl p-8 text-white relative border border-gray-700 shadow-2xl">
        <button onClick={() => { cleanup(); onClose(); }} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center gap-8 py-8">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${isConnected ? "bg-indigo-600 shadow-[0_0_40px_rgba(79,70,229,0.5)]" : "bg-gray-700"}`}>
             {isConnected ? (
                 <Volume2 className="w-12 h-12 animate-pulse" />
             ) : (
                 <MicOff className="w-12 h-12 text-gray-400" />
             )}
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Live Oral Interview</h3>
            <p className="text-gray-400">
                {isConnected 
                    ? "Examiner is listening. Speak naturally." 
                    : error 
                        ? <span className="text-red-400">{error}</span> 
                        : "Ready to start the interview?"}
            </p>
          </div>

          {!isConnected && (
            <button
                onClick={startSession}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-semibold transition-transform active:scale-95 flex items-center gap-2"
            >
                <Mic className="w-5 h-5" />
                Start Interview
            </button>
          )}

           {isConnected && (
            <button
                onClick={() => { cleanup(); onClose(); }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-6 py-2 rounded-full text-sm font-medium transition-colors border border-red-500/50"
            >
                End Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveInterview;
