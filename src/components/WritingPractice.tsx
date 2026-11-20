import { FormEvent, useMemo, useState } from "react";
import { Check, Info, PenLine, RotateCw, X } from "lucide-react";
import { reviewVocabulary } from "../api";
import { useAppData, useInvalidateAppData } from "../hooks/useAppData";
import { SRSLevel, UserProgress, Vocabulary } from "../types";

function shuffleWords(words: Vocabulary[]): Vocabulary[] {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }
  return shuffled;
}

function normalizeAnswer(answer: string): string {
  return answer.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export default function WritingPractice() {
  const { user, vocabulary, topics, progress } = useAppData();
  const invalidateAppData = useInvalidateAppData(user?.id);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sessionStatusOverrides, setSessionStatusOverrides] = useState<Record<string, UserProgress["status"]>>({});
  const shuffledWords = useMemo(
    () => shuffleWords(vocabulary),
    [vocabulary]
  );
  const words = useMemo(
    () => shuffledWords.filter(word =>
      word.meaning.trim() &&
      word.word.trim() &&
      (!selectedTopicId || word.topicId === selectedTopicId) &&
      (!selectedStatus || (
        sessionStatusOverrides[word.id || ""] ||
        progress.find(item => item.wordId === word.id)?.status ||
        "new"
      ) === selectedStatus)
    ),
    [shuffledWords, selectedTopicId, selectedStatus, progress, sessionStatusOverrides]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [showWordDetails, setShowWordDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<SRSLevel | null>(null);
  const displayIndex = words.length > 0 ? currentIndex % words.length : 0;
  const currentWord = words[displayIndex];
  const isCorrect = currentWord ? normalizeAnswer(answer) === normalizeAnswer(currentWord.word) : false;
  const currentProgress = progress.find(item => item.wordId === currentWord?.id);

  const handleCheck = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checked) {
      handleNext();
      return;
    }
    if (!answer.trim()) return;
    setChecked(true);
  };

  const handleNext = () => {
    setCurrentIndex(displayIndex + 1);
    setAnswer("");
    setChecked(false);
    setShowWordDetails(false);
    setUpdatingStatus(null);
  };

  const handleReview = async (level: SRSLevel) => {
    if (!currentWord || updatingStatus) return;

    setUpdatingStatus(level);
    try {
      const reviewed = await reviewVocabulary(currentWord.id, level);
      await invalidateAppData();
      const wordId = currentWord.id;
      if (wordId && selectedStatus) {
        setSessionStatusOverrides(current => ({
          ...current,
          [wordId]: reviewed.progress.status,
        }));
      }
      setCurrentIndex(displayIndex + 1);
      setAnswer("");
      setChecked(false);
      setShowWordDetails(false);
    } catch (error) {
      console.error("Writing Practice review error:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const topicSelector = (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <span className="text-xs font-bold text-primary tracking-widest uppercase">Filter Practice</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="sr-only" htmlFor="writing-topic">Study Topic</label>
        <select
          id="writing-topic"
          value={selectedTopicId}
          onChange={event => {
            setSelectedTopicId(event.target.value);
            setSessionStatusOverrides({});
            setCurrentIndex(0);
            setAnswer("");
            setChecked(false);
          }}
          className="w-full sm:min-w-48 bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All topics</option>
          {topics.map(topic => (
            <option key={topic.id} value={topic.id}>{topic.name}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="writing-status">Study Status</label>
        <select
          id="writing-status"
          value={selectedStatus}
          onChange={event => {
            setSelectedStatus(event.target.value);
            setSessionStatusOverrides({});
            setCurrentIndex(0);
            setAnswer("");
            setChecked(false);
          }}
          className="w-full sm:min-w-40 bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="learning">Learning</option>
          <option value="good">Good</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>
    </div>
  );

  if (!currentWord) {
    return (
      <div className="max-w-3xl mx-auto">
        {topicSelector}
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center text-primary mb-6">
            <PenLine className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-background mb-2">No words to practice</h1>
          <p className="text-on-surface-variant">Add vocabulary with a Vietnamese meaning or choose another topic.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {topicSelector}
      <section className="bg-[#f6f3ed] border border-[#e7dfd2] rounded-[2rem] p-6 sm:p-10 md:p-16">
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-error mb-4">Viết lại mục từ</p>
      <h1 className="text-4xl sm:text-5xl font-headline font-extrabold text-on-background tracking-tight mb-3">
        {currentWord.meaning}
      </h1>
      <p className="text-sm sm:text-base text-on-surface-variant mb-8">Nhập từ hoặc cụm từ tiếng Anh tương ứng.</p>

      <form onSubmit={handleCheck}>
        <label htmlFor="writing-answer" className="block text-xs font-bold text-on-surface mb-2">Câu trả lời</label>
        <div className="flex flex-col sm:flex-row">
          <input
            id="writing-answer"
            type="text"
            value={answer}
            onChange={event => {
              const value = event.target.value;
              setAnswer(value ? value[0].toLocaleUpperCase() + value.slice(1) : value);
            }}
            readOnly={checked}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none border border-outline-variant/30 bg-white px-5 py-4 text-lg text-on-surface outline-none focus:border-primary disabled:bg-surface-container-low"
            placeholder="Nhập từ tiếng Anh..."
          />
          {checked ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center gap-2 rounded-b-xl sm:rounded-r-xl sm:rounded-bl-none bg-primary px-6 py-4 font-bold text-on-primary transition-colors hover:bg-primary-dim"
            >
              <RotateCw className="w-4 h-4" />
              Từ tiếp theo
            </button>
          ) : (
            <button
              type="submit"
              disabled={!answer.trim()}
              className="flex items-center justify-center gap-2 rounded-b-xl sm:rounded-r-xl sm:rounded-bl-none bg-primary px-6 py-4 font-bold text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Kiểm tra
            </button>
          )}
        </div>
      </form>

      {checked && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            className={`text-sm font-semibold ${isCorrect ? "text-green-700" : "text-error"}`}
          >
            {isCorrect ? "Chính xác!" : `Chưa chính xác. Đáp án: ${currentWord.word}`}
          </p>
          <button
            type="button"
            onClick={() => setShowWordDetails(true)}
            className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Info className="h-4 w-4" />
            Detail
          </button>
        </div>
      )}

      <p className="mt-8 text-xs text-on-surface-variant">
        Từ {displayIndex + 1} / {words.length}
      </p>
      </section>

      {checked && (
        <div className="mt-8 w-full rounded-full bg-surface-container-low p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
            {([
              { id: "again", label: "Again", time: "< 1m", color: "text-error" },
              { id: "hard", label: "Hard", time: "2d", color: "text-secondary" },
              { id: "good", label: "Good", time: "4d", color: "text-primary" },
              { id: "easy", label: "Easy", time: "7d", color: "text-blue-400" },
            ] as const).map(level => (
              <button
                key={level.id}
                type="button"
                disabled={!currentProgress?.id || updatingStatus !== null}
                onClick={() => handleReview(level.id)}
                className="group flex flex-col items-center rounded-xl px-4 py-3 transition-all hover:bg-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1 sm:rounded-full"
              >
                <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {level.label}
                </span>
                <span className={`text-lg font-headline font-extrabold ${level.color}`}>
                  {updatingStatus === level.id ? "..." : level.time}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showWordDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowWordDetails(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="writing-word-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-2xl sm:p-8"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="writing-word-details-title" className="break-words text-2xl font-headline font-bold text-on-background sm:text-3xl">
                  {currentWord.word}
                </h2>
                <p className="mt-1 break-all font-mono text-sm text-on-surface-variant">
                  {currentWord.ipa || "No pronunciation provided"}
                </p>
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
    </div>
  );
}
