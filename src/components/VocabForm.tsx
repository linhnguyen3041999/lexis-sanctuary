import React, { useState } from "react";
import { Sparkles, Loader2, Save, Trash2 } from "lucide-react";
import { db, collection, setDoc, doc, serverTimestamp } from "../firebase";
import { useFirebase } from "../hooks/useFirebase";
import { Vocabulary, Topic } from "../types";
import { validateAndCompleteVocab } from "../services/aiService";

const AI_DECIDE_TOPIC = "__ai_decide__";

interface VocabFormProps {
  editingWord?: Vocabulary | null;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export default function VocabForm({ editingWord, onCancel, onSuccess }: VocabFormProps) {
  const { user, topics, vocabulary } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState(editingWord?.topicId || AI_DECIDE_TOPIC);
  const [formData, setFormData] = useState({
    word: editingWord?.word || "",
    type: editingWord?.type || "noun",
    ipa: editingWord?.ipa || "",
    meaning: editingWord?.meaning || "",
    context: editingWord?.context || "",
    example: editingWord?.example || "",
  });
  const [aiFeedback, setAiFeedback] = useState<any>(null);

  const capitalizeFirstLetter = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  // Update form data when editingWord changes
  React.useEffect(() => {
    if (editingWord) {
      setFormData({
        word: editingWord.word,
        type: editingWord.type,
        ipa: editingWord.ipa,
        meaning: editingWord.meaning,
        context: editingWord.context,
        example: editingWord.example,
      });
      setSelectedTopicId(editingWord.topicId || AI_DECIDE_TOPIC);
    } else {
      setSelectedTopicId(AI_DECIDE_TOPIC);
    }
  }, [editingWord]);

  const handleAiValidate = async () => {
    if (!formData.word) return;
    setAiLoading(true);
    try {
      const result = await validateAndCompleteVocab(formData);
      setAiFeedback(result);
      setFormData({
        ...formData,
        word: capitalizeFirstLetter(result.word || ""),
        type: result.type || "noun",
        ipa: capitalizeFirstLetter(result.ipa || ""),
        meaning: capitalizeFirstLetter(result.meaning || ""),
        context: capitalizeFirstLetter(result.context || ""),
        example: capitalizeFirstLetter(result.example || ""),
      });
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !formData.word) return;

    const normalizedNewWord = formData.word.trim().toLowerCase();
    const duplicateWord = vocabulary.find((entry) => entry.word.trim().toLowerCase() === normalizedNewWord);
    if (!editingWord && duplicateWord) {
      const existingTopicName = topics.find((topic) => topic.id === duplicateWord.topicId)?.name || "Unknown topic";
      alert(`"${formData.word.trim()}" already exists in your sanctuary (Topic: ${existingTopicName}).`);
      return;
    }

    setLoading(true);

    try {
      // 1. Handle Topic
      let topicId = "";
      if (selectedTopicId !== AI_DECIDE_TOPIC) {
        topicId = selectedTopicId;
      } else {
        const topicName = aiFeedback?.topic || "General";
        const existingTopic = topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());

        if (existingTopic) {
          topicId = existingTopic.id!;
        } else {
          const newTopicRef = doc(collection(db, "topics"));
          await setDoc(newTopicRef, {
            name: topicName,
            userId: user.uid,
            isUnclassified: false,
          });
          topicId = newTopicRef.id;
        }
      }

      // 2. Save Vocabulary
      const vocabRef = editingWord?.id ? doc(db, "vocabulary", editingWord.id) : doc(collection(db, "vocabulary"));
      const vocabData: Vocabulary = {
        ...formData,
        topicId,
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
      setFormData({ word: "", type: "noun", ipa: "", meaning: "", context: "", example: "" });
      setAiFeedback(null);
      setSelectedTopicId(AI_DECIDE_TOPIC);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Word or Phrase</label>
                <input 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Luminous"
                  value={formData.word}
                  onChange={e => setFormData({ ...formData, word: capitalizeFirstLetter(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Word Type</label>
                <select 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="noun">Noun</option>
                  <option value="verb">Verb</option>
                  <option value="adjective">Adjective</option>
                  <option value="adverb">Adverb</option>
                  <option value="idiom">Idiom</option>
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Topic</label>
                <select
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  value={selectedTopicId}
                  onChange={e => setSelectedTopicId(e.target.value)}
                >
                  <option value={AI_DECIDE_TOPIC}>AI suggest & decide (auto-create if needed)</option>
                  {topics.map((topic: Topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
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
                className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                placeholder="/ɪˈfɛmərəl/"
                value={formData.ipa}
                onChange={e => setFormData({ ...formData, ipa: capitalizeFirstLetter(e.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant ml-1">Core Meaning</label>
              <textarea 
                className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none"
                placeholder="Describe the essence of the word..."
                rows={2}
                value={formData.meaning}
                onChange={e => setFormData({ ...formData, meaning: capitalizeFirstLetter(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Context / Usage Notes</label>
                <input 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  placeholder="Academic, formal, poetic..."
                  value={formData.context}
                  onChange={e => setFormData({ ...formData, context: capitalizeFirstLetter(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Example Sentence</label>
                <textarea 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Use it in a natural sentence..."
                  rows={3}
                  value={formData.example}
                  onChange={e => setFormData({ ...formData, example: capitalizeFirstLetter(e.target.value) })}
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
                    setFormData({ word: "", type: "noun", ipa: "", meaning: "", context: "", example: "" });
                    setSelectedTopicId(AI_DECIDE_TOPIC);
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
                  <p className="text-sm font-medium">{aiFeedback.topic}</p>
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
