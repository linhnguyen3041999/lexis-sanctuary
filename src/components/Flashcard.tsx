import React, { useState, useMemo, useEffect, useRef } from "react";
import { Volume2, Edit, Star, FlipHorizontal, CheckCircle2, Loader2, Sparkles, Info, X } from "lucide-react";
import { db, updateDoc, doc } from "../firebase";
import { useFirebase } from "../hooks/useFirebase";
import { Vocabulary, UserProgress, SRSLevel } from "../types";
import { calculateNextReview } from "../services/srsService";
import { speakEnglish } from "../services/speechService";
import { isBefore, format } from "date-fns";

function getEnglishExample(example: string): string {
  return example
    .split(/\r?\n/)
    .filter(line => !/^\s*(?:→|⇒|➜|->)/.test(line))
    .join("\n")
    .trim();
}

function SkillTagBadges({ tags }: { tags?: Vocabulary["skillTags"] }) {
  if (!tags?.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-5">
      {tags.map(tag => (
        <span
          key={tag}
          className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold capitalize text-on-surface-variant"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function Flashcard() {
  const { vocabulary, progress, topics } = useFirebase();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const [sessionWordIds, setSessionWordIds] = useState<string[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showWordDetails, setShowWordDetails] = useState(false);
  const frontMeasureRef = useRef<HTMLDivElement | null>(null);
  const backMeasureRef = useRef<HTMLDivElement | null>(null);

  const handleListen = (text: string) => {
    if (isListening) return;
    setIsListening(true);
    try {
      void speakEnglish(text, () => setIsListening(false)).catch(error => {
        console.error("Speech synthesis error:", error);
        setIsListening(false);
      });
    } catch (error) {
      console.error("Speech synthesis error:", error);
      setIsListening(false);
    }
  };

  // Filter words that are due for review
  const dueWords = useMemo(() => {
    const now = new Date();
    return vocabulary.filter(v => {
      if (selectedTopicId && v.topicId !== selectedTopicId) return false;
      const p = progress.find(pr => pr.wordId === v.id);
      if (!p) return false;
      const nextReviewDate = p.nextReview.toDate ? p.nextReview.toDate() : new Date(p.nextReview);
      return isBefore(nextReviewDate, now);
    });
  }, [vocabulary, progress, selectedTopicId]);

  // Keep the session list stable while SRS updates remove reviewed words from dueWords.
  const sessionWords = useMemo(
    () => sessionWordIds
      .map(wordId => vocabulary.find(word => word.id === wordId))
      .filter((word): word is Vocabulary => Boolean(word)),
    [sessionWordIds, vocabulary]
  );

  const currentWord = sessionWords[currentIndex];
  const englishExample = currentWord?.example ? getEnglishExample(currentWord.example) : "";
  const currentProgress = progress.find(p => p.wordId === currentWord?.id);

  React.useEffect(() => {
    setCurrentIndex(0);
    setFlipped(false);
    setSessionWordIds([]);
    setSessionComplete(false);
  }, [selectedTopicId]);

  React.useEffect(() => {
    if (sessionWordIds.length === 0 && dueWords.length > 0) {
      setSessionWordIds(
        dueWords
          .map(word => word.id)
          .filter((id): id is string => Boolean(id))
      );
    }
  }, [dueWords, sessionWordIds.length]);

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
      
      setShowWordDetails(false);
      setFlipped(false);
      if (currentIndex < sessionWords.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Finished session
        setCurrentIndex(0);
        setSessionComplete(true);
      }
    } catch (error) {
      console.error("Review Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center">
      <div className="w-full mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <label htmlFor="flashcard-topic" className="text-xs font-bold text-primary tracking-widest uppercase">
            Study Topic
          </label>
          <select
            id="flashcard-topic"
            value={selectedTopicId}
            onChange={e => setSelectedTopicId(e.target.value)}
            className="w-full sm:w-auto min-w-56 bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All topics</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>
        </div>
      </div>

      {sessionComplete || sessionWords.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center text-primary mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-headline font-bold text-on-background mb-2">All Caught Up!</h2>
          <p className="text-on-surface-variant">No words due for review in this topic right now. Choose another topic to study.</p>
        </div>
      ) : (
        <>
          <div className="w-full mb-6 sm:mb-8">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Session Progress</span>
              <span className="text-xs text-on-surface-variant font-medium">{currentIndex + 1} / {sessionWords.length}</span>
            </div>
            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / sessionWords.length) * 100}%` }}
              ></div>
            </div>
          </div>

      <div className="relative w-full">
        <div className="absolute inset-x-0 top-0 opacity-0 pointer-events-none -z-10">
          <div ref={frontMeasureRef} className="bg-surface-container-lowest rounded-xl p-5 sm:p-8 md:p-12 border border-outline-variant/10">
            <span className="text-sm md:text-base text-primary/70 mb-4 block tracking-widest font-medium break-all">{currentWord?.ipa}</span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-headline font-extrabold text-on-background tracking-tighter mb-4 sm:mb-6 leading-none break-words">{currentWord?.word}</h1>
            <div className="h-px w-16 bg-surface-container-high mx-auto mb-6 sm:mb-8"></div>
            <p className="text-on-surface-variant text-sm font-medium text-center">Click to reveal meaning</p>
          </div>
          <div ref={backMeasureRef} className="bg-surface-container-lowest rounded-xl p-5 sm:p-8 md:p-12 border border-outline-variant/10">
            <span className="text-sm md:text-base text-primary/70 mb-4 block tracking-widest font-medium break-all">{currentWord?.ipa}</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-on-background tracking-tighter mb-4 sm:mb-6 leading-none break-words text-center">{currentWord?.word}</h1>
            <span className="text-sm text-on-surface-variant font-medium capitalize mb-4 block">{currentWord?.type}</span>
            <SkillTagBadges tags={currentWord?.skillTags} />
            <div className="h-px w-16 bg-surface-container-high mx-auto mb-6 sm:mb-8"></div>
            <div className="space-y-3 sm:space-y-4 max-w-lg mx-auto w-full">
              <p className="text-base sm:text-lg md:text-xl text-on-surface font-medium leading-relaxed text-center">{currentWord?.meaning}</p>
              <div className="bg-surface-container-low p-4 rounded-lg text-sm text-on-surface-variant text-left border-l-2 border-primary/30 whitespace-pre-wrap break-words">
                {currentWord?.example}
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
              <span className="text-sm md:text-base text-primary/70 mb-4 tracking-widest font-medium break-all">{currentWord?.ipa}</span>
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
                <span className="text-sm md:text-base text-primary/70 mb-4 block tracking-widest font-medium break-all">{currentWord?.ipa}</span>
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-on-background tracking-tighter leading-none break-words">{currentWord?.word}</h1>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleListen(currentWord.word);
                    }}
                    disabled={isListening}
                    aria-label="Listen to word"
                    title="Listen to word"
                    className="shrink-0 p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors disabled:opacity-50"
                  >
                    {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
                <span className="text-sm text-on-surface-variant font-medium capitalize mb-4 block">{currentWord?.type}</span>
                <SkillTagBadges tags={currentWord?.skillTags} />
                <div className="h-px w-16 bg-surface-container-high mx-auto mb-6 sm:mb-8"></div>
                <div className="space-y-3 sm:space-y-4 max-w-lg mx-auto">
                  <p className="text-base sm:text-lg md:text-xl text-on-surface font-medium leading-relaxed">{currentWord?.meaning}</p>
                  <div className="bg-surface-container-low p-4 rounded-lg text-sm text-on-surface-variant text-left border-l-2 border-primary/30 whitespace-pre-wrap break-words">
                    {currentWord?.example}
                  </div>
                  {englishExample && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleListen(englishExample);
                      }}
                      disabled={isListening}
                      aria-label="Listen to example"
                      className="mx-auto flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                      Listen example
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWordDetails(true);
                    }}
                    className="mx-auto flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    <Info className="w-4 h-4" />
                    Detail
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showWordDetails && currentWord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowWordDetails(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-word-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="flashcard-word-details-title" className="break-words text-2xl font-headline font-bold text-on-background sm:text-3xl">
                  {currentWord.word}
                </h2>
                <p className="mt-1 break-all font-mono text-sm text-on-surface-variant">{currentWord.ipa || "No pronunciation provided"}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWordDetails(false)}
                aria-label="Close word details"
                className="shrink-0 rounded-full bg-surface-container-high p-2 text-on-surface-variant transition-colors hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Meaning</h3>
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-on-background">{currentWord.meaning || "Unspecified"}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Type</h3>
                  <p className="capitalize text-on-background">{currentWord.type || "Unspecified"}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Skill Context</h3>
                  {currentWord.skillTags?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {currentWord.skillTags.map(tag => (
                        <span key={tag} className="rounded-full bg-surface-container-high px-3 py-1 text-sm font-medium capitalize text-on-surface-variant">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-on-surface-variant">Unspecified</p>}
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Level</h3>
                  <p className="text-on-background">{currentWord.level ? currentWord.level.toUpperCase() : "Unspecified"}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Topic</h3>
                  <p className="text-on-background">{topics.find(topic => topic.id === currentWord.topicId)?.name || "Unclassified"}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Synonyms</h3>
                  <p className="whitespace-pre-wrap break-words text-on-background">{currentWord.synonyms || "Unspecified"}</p>
                </section>
              </div>

              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Verb Pattern / Usage Formula</h3>
                  <p className="whitespace-pre-wrap break-words text-on-background">{currentWord.verbPattern || "Not applicable"}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Collocations</h3>
                  <p className="whitespace-pre-wrap break-words text-on-background">{currentWord.collocations || "Unspecified"}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Related Forms</h3>
                  <p className="whitespace-pre-wrap break-words text-on-background">{currentWord.relatedForms || "Unspecified"}</p>
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Example Sentence</h3>
                  <div className="rounded-2xl border border-outline-variant/5 bg-surface-container-low p-4">
                    <p className="whitespace-pre-wrap break-words leading-relaxed text-on-background">{currentWord.example || "No example provided"}</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

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

        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">Updating Progress...</span>
        </div>
      )}
        </>
      )}
    </div>
  );
}
