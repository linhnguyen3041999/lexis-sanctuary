import React, { useState, useMemo, useEffect, useRef } from "react";
import { Volume2, Edit, Star, FlipHorizontal, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { db, updateDoc, doc } from "../firebase";
import { useFirebase } from "../hooks/useFirebase";
import { Vocabulary, UserProgress, SRSLevel } from "../types";
import { calculateNextReview } from "../services/srsService";
import { isBefore, format } from "date-fns";
import { GoogleGenAI, Modality } from "@google/genai";

export default function Flashcard() {
  const { vocabulary, progress } = useFirebase();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const frontMeasureRef = useRef<HTMLDivElement | null>(null);
  const backMeasureRef = useRef<HTMLDivElement | null>(null);

  const handleListen = async (text: string) => {
    if (isListening) return;
    setIsListening(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Pronounce clearly: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create WAV header for 24kHz, 16-bit mono PCM
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        const sampleRate = 24000;
        
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + len, true);    // File size
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);         // Subchunk1Size
        view.setUint16(20, 1, true);          // AudioFormat (PCM)
        view.setUint16(22, 1, true);          // NumChannels
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, sampleRate * 2, true); // ByteRate
        view.setUint16(32, 2, true);          // BlockAlign
        view.setUint16(34, 16, true);         // BitsPerSample
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, len, true);        // Subchunk2Size

        const wavBlob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(wavBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => URL.revokeObjectURL(audioUrl);
        await audio.play();
      }
    } catch (error) {
      console.error("TTS Error:", error);
    } finally {
      setIsListening(false);
    }
  };

  // Filter words that are due for review
  const dueWords = useMemo(() => {
    const now = new Date();
    return vocabulary.filter(v => {
      const p = progress.find(pr => pr.wordId === v.id);
      if (!p) return false;
      const nextReviewDate = p.nextReview.toDate ? p.nextReview.toDate() : new Date(p.nextReview);
      return isBefore(nextReviewDate, now);
    });
  }, [vocabulary, progress]);

  const currentWord = dueWords[currentIndex];
  const currentProgress = progress.find(p => p.wordId === currentWord?.id);

  // Reset index if it goes out of bounds due to data changes
  React.useEffect(() => {
    if (currentIndex >= dueWords.length && dueWords.length > 0) {
      setCurrentIndex(0);
    }
  }, [dueWords.length, currentIndex]);

  useEffect(() => {
    const updateCardHeight = () => {
      const frontHeight = frontMeasureRef.current?.getBoundingClientRect().height || 0;
      const backHeight = backMeasureRef.current?.getBoundingClientRect().height || 0;
      const nextHeight = Math.ceil(Math.max(frontHeight, backHeight, 320));
      setCardHeight(nextHeight);
    };

    const frame = window.requestAnimationFrame(updateCardHeight);
    window.addEventListener("resize", updateCardHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateCardHeight);
    };
  }, [currentWord]);

  const handleReview = async (level: SRSLevel) => {
    if (!currentProgress || !currentWord) return;
    setLoading(true);

    try {
      const updates = calculateNextReview(currentProgress, level);
      await updateDoc(doc(db, "progress", currentProgress.id!), updates);
      
      setFlipped(false);
      if (currentIndex < dueWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Finished session
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error("Review Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (dueWords.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center text-primary mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-headline font-bold text-on-background mb-2">All Caught Up!</h2>
        <p className="text-on-surface-variant">No words due for review right now. Add more words to your sanctuary!</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center">
      <div className="w-full mb-6 sm:mb-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-bold text-primary tracking-widest uppercase">Session Progress</span>
          <span className="text-xs text-on-surface-variant font-medium">{currentIndex + 1} / {dueWords.length}</span>
        </div>
        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${((currentIndex + 1) / dueWords.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="relative w-full">
        <div className="absolute inset-x-0 top-0 opacity-0 pointer-events-none -z-10">
          <div ref={frontMeasureRef} className="bg-surface-container-lowest rounded-xl p-5 sm:p-8 md:p-12 border border-outline-variant/10">
            <span className="text-sm md:text-base text-primary/70 mb-4 block tracking-widest font-medium break-all">{currentWord?.ipa?.toLowerCase()}</span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-headline font-extrabold text-on-background tracking-tighter mb-4 sm:mb-6 leading-none break-words">{currentWord?.word}</h1>
            <div className="h-px w-16 bg-surface-container-high mx-auto mb-6 sm:mb-8"></div>
            <p className="text-on-surface-variant text-sm font-medium text-center">Click to reveal meaning</p>
          </div>
          <div ref={backMeasureRef} className="bg-surface-container-lowest rounded-xl p-5 sm:p-8 md:p-12 border border-outline-variant/10">
            <span className="text-sm md:text-base text-primary/70 mb-4 block tracking-widest font-medium break-all">{currentWord?.ipa?.toLowerCase()}</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-on-background tracking-tighter mb-4 sm:mb-6 leading-none break-words text-center">{currentWord?.word}</h1>
            <div className="h-px w-16 bg-surface-container-high mx-auto mb-6 sm:mb-8"></div>
            <div className="space-y-3 sm:space-y-4 max-w-lg mx-auto w-full">
              <p className="text-base sm:text-lg md:text-xl text-on-surface font-medium leading-relaxed text-center">{currentWord?.meaning}</p>
              <div className="bg-surface-container-low p-4 rounded-lg text-sm italic text-on-surface-variant text-left border-l-2 border-primary/30">
                "{currentWord?.example}"
              </div>
            </div>
          </div>
        </div>

        <div
          className="w-full perspective-1000 cursor-pointer group"
          style={{ height: cardHeight > 0 ? `${cardHeight}px` : undefined }}
          onClick={() => !loading && setFlipped(!flipped)}
        >
          <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${flipped ? "rotate-y-180" : ""}`}>
            <div className="absolute inset-0 backface-hidden bg-surface-container-lowest rounded-xl p-5 sm:p-8 md:p-12 flex flex-col items-center justify-center text-center shadow-sm border border-outline-variant/10 overflow-hidden">
              <span className="text-sm md:text-base text-primary/70 mb-4 tracking-widest font-medium break-all">{currentWord?.ipa?.toLowerCase()}</span>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-headline font-extrabold text-on-background tracking-tighter mb-4 sm:mb-6 leading-none break-words">{currentWord?.word}</h1>
              <div className="h-px w-16 bg-surface-container-high mx-auto mb-6 sm:mb-8"></div>
              <p className="text-on-surface-variant text-sm font-medium">Click to reveal meaning</p>
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 text-on-surface-variant/40">
                <span className="text-[10px] uppercase font-bold tracking-tighter">Flip Card</span>
                <FlipHorizontal className="w-5 h-5" />
              </div>
            </div>

            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-surface-container-lowest rounded-xl p-5 sm:p-8 md:p-12 flex flex-col items-stretch justify-start text-center shadow-sm border border-outline-variant/10 overflow-y-auto">
              <div className="relative z-10 w-full">
                <span className="text-sm md:text-base text-primary/70 mb-4 block tracking-widest font-medium break-all">{currentWord?.ipa?.toLowerCase()}</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-on-background tracking-tighter mb-4 sm:mb-6 leading-none break-words">{currentWord?.word}</h1>
                <div className="h-px w-16 bg-surface-container-high mx-auto mb-6 sm:mb-8"></div>
                <div className="space-y-3 sm:space-y-4 max-w-lg mx-auto">
                  <p className="text-base sm:text-lg md:text-xl text-on-surface font-medium leading-relaxed">{currentWord?.meaning}</p>
                  <div className="bg-surface-container-low p-4 rounded-lg text-sm italic text-on-surface-variant text-left border-l-2 border-primary/30">
                    "{currentWord?.example}"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="w-full mt-8 sm:mt-12 space-y-6 sm:space-y-8">
          <div className="bg-surface-container-low rounded-2xl sm:rounded-full p-2 grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 shadow-sm">
            {[
              { id: "again", label: "Again", time: "< 1m", color: "text-error" },
              { id: "hard", label: "Hard", time: "2d", color: "text-secondary" },
              { id: "good", label: "Good", time: "4d", color: "text-primary" },
              { id: "easy", label: "Easy", time: "7d", color: "text-blue-400" },
            ].map((lvl) => (
              <button
                key={lvl.id}
                disabled={loading}
                onClick={() => handleReview(lvl.id as SRSLevel)}
                className={`sm:flex-1 flex flex-col items-center py-3 px-4 rounded-xl sm:rounded-full hover:bg-white transition-all active:scale-95 group disabled:opacity-50`}
              >
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-1">{lvl.label}</span>
                <span className={`text-lg font-headline font-extrabold ${lvl.color}`}>{lvl.time}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-6 items-center justify-center text-on-surface-variant">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleListen(currentWord.word);
              }}
              disabled={isListening}
              className="flex items-center gap-2 hover:text-primary transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
              Listen
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">Updating Progress...</span>
        </div>
      )}
    </div>
  );
}
