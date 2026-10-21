import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Sparkles, Loader2, Save, Trash2 } from "lucide-react";
import { db, collection, setDoc, doc, serverTimestamp } from "../firebase";
import { useFirebase } from "../hooks/useFirebase";
import { Vocabulary, Topic } from "../types";
import { validateAndCompleteVocab } from "../services/aiService";

const AI_SELECT_TOPIC = "__ai_select_existing__";

interface VocabFormProps {
  editingWord?: Vocabulary | null;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function VocabForm({ editingWord, onCancel, onSuccess }: VocabFormProps) {
  const { user, topics, vocabulary } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState(editingWord?.topicId || AI_SELECT_TOPIC);
  const [isTopicPickerOpen, setIsTopicPickerOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const topicPickerRef = useRef<HTMLDivElement>(null);
  const sortedTopics = useMemo(
    () => [...topics].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [topics],
  );
  const filteredTopics = useMemo(() => {
    const normalizedSearch = topicSearch.trim().toLocaleLowerCase();
    return sortedTopics.filter(topic => topic.name.toLocaleLowerCase().includes(normalizedSearch));
  }, [sortedTopics, topicSearch]);
  const selectedTopicName = selectedTopicId === AI_SELECT_TOPIC
    ? "AI choose from existing topics"
    : topics.find(topic => topic.id === selectedTopicId)?.name || "Select a topic";
  const [formData, setFormData] = useState({
    word: editingWord?.word || "",
    skillTags: editingWord?.skillTags || [],
    type: editingWord?.type || "noun",
    level: editingWord?.level || "",
    ipa: editingWord?.ipa || "",
    synonyms: editingWord?.synonyms || "",
    verbPattern: editingWord?.verbPattern || "",
    collocations: editingWord?.collocations || "",
    relatedForms: editingWord?.relatedForms || "",
    meaning: editingWord?.meaning || "",
    example: editingWord?.example || "",
  });
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const aiTopicExists = Boolean(aiFeedback?.topic && sortedTopics.some(
    topic => topic.name.trim().toLocaleLowerCase() === aiFeedback.topic.trim().toLocaleLowerCase(),
  ));

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const normalizeLevel = (value: string) => {
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized === "UNKNOWN") return "";
    return normalized;
  };


  // Update form data when editingWord changes
  React.useEffect(() => {
    if (editingWord) {
      setFormData({
        word: editingWord.word,
        skillTags: editingWord.skillTags || [],
        type: editingWord.type,
        level: normalizeLevel(editingWord.level || ""),
        ipa: editingWord.ipa,
        synonyms: editingWord.synonyms || "",
        verbPattern: editingWord.verbPattern || "",
        collocations: editingWord.collocations || "",
        relatedForms: editingWord.relatedForms || "",
        meaning: editingWord.meaning,
        example: editingWord.example,
      });
      setSelectedTopicId(editingWord.topicId || AI_SELECT_TOPIC);
    } else {
      setSelectedTopicId(AI_SELECT_TOPIC);
    }
  }, [editingWord]);

  useEffect(() => {
    if (!isTopicPickerOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !topicPickerRef.current?.contains(event.target)) {
        setIsTopicPickerOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsTopicPickerOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isTopicPickerOpen]);

  const handleAiValidate = async () => {
    if (!formData.word) return;
    setAiLoading(true);
    try {
      const result = await validateAndCompleteVocab({
        ...formData,
        availableTopics: sortedTopics.map(topic => topic.name),
      });
      const matchedTopic = sortedTopics.find(
        topic => topic.name.trim().toLocaleLowerCase() === result.topic.trim().toLocaleLowerCase(),
      );
      setAiFeedback(result);
      if (matchedTopic?.id) {
        setSelectedTopicId(matchedTopic.id);
      }
      setFormData(current => ({
        ...current,
        skillTags: result.skillTags.length > 0 ? result.skillTags : current.skillTags,
        type: result.type || "noun",
        level: normalizeLevel(result.level || ""),
        ipa: capitalizeFirstLetter(result.ipa || ""),
        synonyms: capitalizeFirstLetter(result.synonyms || current.synonyms),
        verbPattern: result.verbPattern || current.verbPattern,
        collocations: result.collocations || current.collocations,
        relatedForms: result.relatedForms || current.relatedForms,
        meaning: capitalizeFirstLetter(result.meaning || ""),
        example: capitalizeFirstLetter(result.example || ""),
      }));
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.word) return;

    const selectedTopic = topics.find(topic => topic.id === selectedTopicId);
    if (!selectedTopic?.id) {
      alert(topics.length === 0
        ? "Create a topic before saving vocabulary."
        : "Run AI validation to choose an existing topic, or select one manually.");
      return;
    }

    const normalizedNewWord = formData.word.trim().toLowerCase();
    const duplicateWord = vocabulary.find((entry) => entry.word.trim().toLowerCase() === normalizedNewWord);
    if (!editingWord && duplicateWord) {
      const existingTopicName = topics.find((topic) => topic.id === duplicateWord.topicId)?.name || "Unknown topic";
      alert(`"${formData.word.trim()}" already exists in your sanctuary (Topic: ${existingTopicName}).`);
      return;
    }

    setLoading(true);

    try {
      // Save Vocabulary
      const vocabRef = editingWord?.id ? doc(db, "vocabulary", editingWord.id) : doc(collection(db, "vocabulary"));
      const vocabData: Vocabulary = {
        ...formData,
        topicId: selectedTopic.id,
        userId: user.uid,
        createdAt: editingWord?.createdAt || serverTimestamp(),
      };
      await setDoc(vocabRef, vocabData);

      // 3. Initialize Progress (only for new words)
      if (!editingWord) {
        const progressRef = doc(collection(db, "progress"));
        await setDoc(progressRef, {
          wordId: vocabRef.id,
          userId: user.uid,
          interval: 0,
          repetition: 0,
          easeFactor: 2.5,
          nextReview: new Date(),
          status: "new",
        });
      }

      // Reset
      setFormData({ word: "", skillTags: [], type: "noun", level: "", ipa: "", synonyms: "", verbPattern: "", collocations: "", relatedForms: "", meaning: "", example: "" });
      setAiFeedback(null);
      setSelectedTopicId(AI_SELECT_TOPIC);
      setTopicSearch("");
      setIsTopicPickerOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Save Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section>
        <h1 className="text-3xl sm:text-4xl font-headline font-extrabold text-on-background tracking-tight mb-2">
          {editingWord ? "Edit Word" : "Add New Word"}
        </h1>
        <p className="text-on-surface-variant text-base sm:text-lg">
          {editingWord ? "Refine your cognitive sanctuary." : "Expand your cognitive sanctuary, one term at a time."}
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-4 sm:p-8 shadow-sm border border-outline-variant/10">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!aiLoading && !loading) {
                void handleAiValidate();
              }
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Word or Phrase</label>
                <input 
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Luminous"
                  value={formData.word}
                  onChange={e => {
                    setFormData(current => ({ ...current, word: e.target.value }));
                    setAiFeedback(null);
                  }}
                  required
                />
                {aiFeedback?.spellingSuggestion &&
                  aiFeedback.spellingSuggestion.trim().toLocaleLowerCase() !== formData.word.trim().toLocaleLowerCase() && (
                    <div className="rounded-lg bg-primary-container/50 p-3 text-sm">
                      <p className="text-on-surface-variant">
                        AI spelling suggestion: <span className="font-semibold text-on-surface">{aiFeedback.spellingSuggestion}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(current => ({ ...current, word: aiFeedback.spellingSuggestion }));
                          setAiFeedback((current: typeof aiFeedback) => ({ ...current, spellingSuggestion: "" }));
                        }}
                        className="mt-2 font-semibold text-primary hover:underline"
                      >
                        Apply spelling suggestion
                      </button>
                    </div>
                  )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Word Type</label>
                <select 
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="noun">Noun</option>
                  <option value="verb">Verb</option>
                  <option value="adjective">Adjective</option>
                  <option value="adverb">Adverb</option>
                  <option value="idiom">Idiom</option>
                  <option value="collocation">Collocations</option>
                  <option value="expression">Expression</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Level (CEFR)</label>
                <select
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: e.target.value })}
                >
                  <option value="">Select level</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>
              <fieldset className="space-y-2 md:col-span-3">
                <legend className="text-sm font-medium text-on-surface-variant ml-1">Skill context</legend>
                <p className="text-xs text-on-surface-variant ml-1">Choose where this word is most useful. AI can suggest tags when you validate.</p>
                <div className="flex flex-wrap gap-3">
                  {(["speaking", "writing"] as const).map(skillTag => (
                    <label
                      key={skillTag}
                      className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm font-medium capitalize text-on-surface cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.skillTags.includes(skillTag)}
                        onChange={e => setFormData({
                          ...formData,
                          skillTags: e.target.checked
                            ? [...formData.skillTags, skillTag]
                            : formData.skillTags.filter(tag => tag !== skillTag),
                        })}
                        className="h-4 w-4 accent-primary"
                      />
                      {skillTag}
                    </label>
                  ))}
                </div>
                {aiFeedback?.skillTags?.length > 0 && (
                  <p className="text-xs text-primary font-medium ml-1">
                    AI suggestion: {aiFeedback.skillTags.join(", ")}
                  </p>
                )}
              </fieldset>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Topic</label>
                <div className="relative" ref={topicPickerRef}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 text-left focus:ring-2 focus:ring-primary/20"
                    onClick={() => {
                      setIsTopicPickerOpen(open => !open);
                      setTopicSearch("");
                    }}
                    aria-haspopup="listbox"
                    aria-controls="vocab-topic-options"
                    aria-expanded={isTopicPickerOpen}
                  >
                    <span className="truncate">{selectedTopicName}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isTopicPickerOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isTopicPickerOpen && (
                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-2 shadow-xl">
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                        <input
                          type="search"
                          autoFocus
                          value={topicSearch}
                          onChange={e => setTopicSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") e.preventDefault();
                          }}
                          placeholder="Search topics..."
                          aria-label="Search topics"
                          className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-low py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div id="vocab-topic-options" role="listbox" aria-label="Topics" className="max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedTopicId === AI_SELECT_TOPIC}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-container-low"
                          onClick={() => {
                            setSelectedTopicId(AI_SELECT_TOPIC);
                            setIsTopicPickerOpen(false);
                            setTopicSearch("");
                          }}
                        >
                          AI choose from existing topics
                        </button>
                        {filteredTopics.map((topic: Topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            role="option"
                            aria-selected={selectedTopicId === topic.id}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-container-low"
                            onClick={() => {
                              setSelectedTopicId(topic.id || AI_SELECT_TOPIC);
                              setIsTopicPickerOpen(false);
                              setTopicSearch("");
                            }}
                          >
                            {topic.name}
                          </button>
                        ))}
                        {filteredTopics.length === 0 && (
                          <p className="px-3 py-2 text-sm text-on-surface-variant">
                            {topics.length === 0 ? "Create a topic first." : "No matching topics."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant ml-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span>IPA Pronunciation</span>
                {aiFeedback?.ipa && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Suggestion: {aiFeedback?.ipa}
                  </span>
                )}
              </label>
              <input 
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., /ˈren.ə.veɪt/"
                value={formData.ipa}
                onChange={e => setFormData({ ...formData, ipa: capitalizeFirstLetter(e.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant ml-1">Core Meaning</label>
              <textarea 
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Describe the essence of the word..."
                rows={2}
                value={formData.meaning}
                onChange={e => setFormData({ ...formData, meaning: capitalizeFirstLetter(e.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant ml-1">Verb Pattern / Usage Formula</label>
              <input
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., be worth + V-ing or be worth + noun"
                value={formData.verbPattern}
                onChange={e => setFormData({ ...formData, verbPattern: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Example Sentence</label>
                <textarea
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none font-mono text-sm leading-6"
                  placeholder="Use it in a natural sentence..."
                  rows={4}
                  value={formData.example}
                  onChange={e => setFormData({ ...formData, example: capitalizeFirstLetter(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <span>Synonyms</span>
                  {aiFeedback?.synonyms && (
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Suggestion: {aiFeedback.synonyms}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  placeholder="radiant, bright, glowing"
                  value={formData.synonyms}
                  onChange={e => setFormData({ ...formData, synonyms: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <span>Collocations</span>
                  {aiFeedback?.collocations && (
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Suggestion available
                    </span>
                  )}
                </label>
                <textarea
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none min-h-[140px] font-mono text-sm leading-6"
                  placeholder={`### Common collocations\n- **make a decision** = đưa ra quyết định\n- **deeply concerned** = vô cùng lo ngại`}
                  rows={6}
                  value={formData.collocations}
                  onChange={e => setFormData({ ...formData, collocations: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <span>Related Word Forms</span>
                  {aiFeedback?.relatedForms && (
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Suggestion available
                    </span>
                  )}
                </label>
                <textarea
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none min-h-[180px] font-mono text-sm leading-6"
                  placeholder={`### Danh từ (noun)\n- **photograph** = bức ảnh (trang trọng hơn)\n\n### Động từ (verb)\n- **photograph** = chụp ảnh`}
                  rows={8}
                  value={formData.relatedForms}
                  onChange={e => setFormData({ ...formData, relatedForms: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-2 sm:pt-4 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button 
                type="submit"
                  disabled={aiLoading || loading || !formData.word}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold text-primary hover:bg-primary-container transition-all disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Validate & Complete
              </button>
              <div className="grid grid-cols-1 sm:flex gap-3 sm:gap-4 w-full sm:w-auto">
                <button 
                  type="button"
                  onClick={() => {
                    if (onCancel) {
                      onCancel();
                      return;
                    }
                    setFormData({ word: "", skillTags: [], type: "noun", level: "", ipa: "", synonyms: "", verbPattern: "", collocations: "", relatedForms: "", meaning: "", example: "" });
                    setSelectedTopicId(AI_SELECT_TOPIC);
                    setTopicSearch("");
                    setIsTopicPickerOpen(false);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high"
                >
                  {editingWord ? "Cancel" : "Discard"}
                </button>
                <button 
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || aiLoading || !formData.word}
                  className="w-full sm:w-auto bg-primary text-on-primary px-8 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save to Sanctuary
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-high rounded-xl p-5 sm:p-6 border border-white/40 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline font-bold text-on-background">AI Assistant</h2>
                <span className="text-[10px] uppercase tracking-widest text-primary font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  Live Sync
                </span>
              </div>
            </div>

            {aiFeedback ? (
              <div className="space-y-4">
                <div className="bg-surface-container-lowest/50 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary mb-1">TOPIC CLASSIFICATION</p>
                  <p className="text-sm font-medium">
                    {aiTopicExists ? aiFeedback.topic : "No matching existing topic. Select one manually."}
                  </p>
                </div>
                <div className="bg-surface-container-lowest/50 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary mb-1">SKILL CONTEXT</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed capitalize">{aiFeedback.skillTags?.join(", ") || "No skill tags suggested."}</p>
                </div>
                <div className="bg-surface-container-lowest/50 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary mb-1">SYNONYMS</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{aiFeedback.synonyms || "No synonyms suggested."}</p>
                </div>
                <div className="bg-surface-container-lowest/50 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary mb-1">VERB PATTERN</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{aiFeedback.verbPattern || "Not applicable."}</p>
                </div>
                <div className="bg-surface-container-lowest/50 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary mb-1">COLLOCATIONS</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{aiFeedback.collocations || "No collocations suggested."}</p>
                </div>
                <div className="bg-surface-container-lowest/50 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary mb-1">RELATED FORMS</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{aiFeedback.relatedForms || "No related forms suggested."}</p>
                </div>
                <div className="bg-surface-container-lowest/50 rounded-lg p-4">
                  <p className="text-xs font-bold text-primary mb-1">SUGGESTIONS</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{aiFeedback.suggestions}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-on-surface-variant italic">Enter a word and click "AI Validate" to get smart suggestions, topic classification, and more.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
