import { GoogleGenAI, Type, Modality } from "@google/genai";
import { FullTest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Test Generation ---

export const generateFullTest = async (topic?: string): Promise<FullTest> => {
  const prompt = `
    You are an expert English Language Test Generator. Create a full 50-question English test for CEFR levels A1-C1.
    ${topic ? `Focus the reading and listening topics around: ${topic}.` : ''}

    Structure Requirements:
    1. Reading: 2 passages. Total 15 questions (10 comprehension, 5 vocab/grammar).
    2. Writing: 10 tasks (5 sentence correction, 3 paragraph prompts, 2 essay prompts).
    3. Listening: 3 scripts. Total 15 questions (5 per script).
    4. Speaking: 10 tasks (4 picture descriptions, 2 role-play, 2 opinion, 2 storytelling).

    For Picture Description tasks, provide a vivid text description of an image in the 'prompt' field that I can use to generate an image later, or just describe the scene for the user to imagine.

    Output PURE JSON matching this schema:
    {
      "reading": { "passages": [ { "id": "r1", "title": "...", "text": "...", "questions": [ { "id": "rq1", "question": "...", "options": ["A)", "B)"], "correctAnswer": "A" } ] } ] },
      "writing": { "tasks": [ { "id": "w1", "type": "grammar", "prompt": "Correct this: ..." } ] },
      "listening": { "scripts": [ { "id": "l1", "title": "...", "script": "...", "questions": [...] } ] },
      "speaking": { "tasks": [ { "id": "s1", "type": "picture", "prompt": "Describe an image showing..." } ] }
    }
  `;

  // Use Pro for complex reasoning and large output
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // Set a high thinking budget to ensure logical consistency and CEFR alignment
      thinkingConfig: { thinkingBudget: 2048 },
      tools: [{ googleSearch: {} }] // Use search to find interesting topics if needed
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  try {
    return JSON.parse(text) as FullTest;
  } catch (e) {
    console.error("Failed to parse JSON", text);
    throw new Error("Failed to parse generated test");
  }
};

// --- TTS (Text to Speech) ---

export const generateSpeech = async (text: string, voice: 'Kore' | 'Puck' | 'Fenrir' = 'Kore'): Promise<AudioBuffer> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned");

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  return decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
};

// --- Evaluation ---

export const evaluateSubmission = async (
  test: FullTest, 
  userAnswers: { reading: any, listening: any, writing: any, speaking: any }
): Promise<string> => {
  const prompt = `
    Evaluate this English test submission.
    
    Test Context:
    Reading/Listening keys are implicit in the test data.
    Writing submissions: ${JSON.stringify(userAnswers.writing)}
    Speaking transcripts: ${JSON.stringify(userAnswers.speaking)}
    
    Calculate the score based on:
    Reading (30pts), Listening (30pts), Writing (20pts), Speaking (20pts). Total 100.
    
    Level Mapping:
    0-20: A1
    21-40: A2
    41-60: B1
    61-80: B2
    81-100: C1
    
    Return a JSON object:
    {
      "score": number,
      "level": "A1" | "A2" | "B1" | "B2" | "C1",
      "breakdown": { "reading": number, "listening": number, "writing": number, "speaking": number },
      "feedback": "Detailed feedback string..."
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 1024 }
    }
  });

  return response.text || "{}";
};

// --- Transcription ---

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  // Convert blob to base64
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      const base64data = (reader.result as string).split(',')[1];
      
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              { inlineData: { mimeType: 'audio/mp3', data: base64data } }, // Assuming mp3/wav/webm, genai handles standard formats
              { text: "Transcribe this audio exactly." }
            ]
          }
        });
        resolve(response.text || "");
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsDataURL(audioBlob);
  });
};

// --- Chatbot ---

export const chatWithBot = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        history: history,
        config: {
            systemInstruction: "You are a helpful English tutor assisting a student with their test preparation."
        }
    });
    const result = await chat.sendMessage({ message });
    return result.text;
};


// --- Live API Helpers ---

// Helper to decode base64 to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode audio data for playback
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
