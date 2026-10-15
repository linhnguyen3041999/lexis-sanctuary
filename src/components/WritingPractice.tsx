import { FormEvent, useMemo, useState } from "react";
import { Check, PenLine, RotateCw } from "lucide-react";
import { useFirebase } from "../hooks/useFirebase";
import { Vocabulary } from "../types";

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
  const { vocabulary, topics } = useFirebase();
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const words = useMemo(
    () => shuffleWords(vocabulary.filter(word =>
      word.meaning.trim() &&
      word.word.trim() &&
      (!selectedTopicId || word.topicId === selectedTopicId)
    )),
    [vocabulary, selectedTopicId]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const displayIndex = words.length > 0 ? currentIndex % words.length : 0;
  const currentWord = words[displayIndex];
  const isCorrect = currentWord ? normalizeAnswer(answer) === normalizeAnswer(currentWord.word) : false;

  const handleCheck = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!answer.trim() || checked) return;
    setChecked(true);
  };

  const handleNext = () => {
    setCurrentIndex(displayIndex + 1);
    setAnswer("");
    setChecked(false);
  };

  const topicSelector = (
    <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <label htmlFor="writing-topic" className="text-xs font-bold text-primary tracking-widest uppercase">
        Study Topic
      </label>
      <select
        id="writing-topic"
        value={selectedTopicId}
        onChange={event => {
          setSelectedTopicId(event.target.value);
          setCurrentIndex(0);
          setAnswer("");
          setChecked(false);
        }}
        className="w-full sm:w-auto min-w-56 bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-2.5 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
      >
        <option value="">All topics</option>
        {topics.map(topic => (
          <option key={topic.id} value={topic.id}>{topic.name}</option>
        ))}
      </select>
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
      <section className="min-h-[60vh] bg-[#f6f3ed] border border-[#e7dfd2] rounded-[2rem] p-6 sm:p-10 md:p-16">
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
            onChange={event => setAnswer(event.target.value)}
            disabled={checked}
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
        <p
          role="status"
          className={`mt-5 text-sm font-semibold ${isCorrect ? "text-green-700" : "text-error"}`}
        >
          {isCorrect ? "Chính xác!" : `Chưa chính xác. Đáp án: ${currentWord.word}`}
        </p>
      )}

      <p className="mt-8 text-xs text-on-surface-variant">
        Từ {displayIndex + 1} / {words.length}
      </p>
      </section>
    </div>
  );
}
