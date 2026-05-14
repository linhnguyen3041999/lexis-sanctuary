import React, { useMemo, useState } from "react";
import { AlertTriangle, Edit3, FolderTree, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { db, collection, deleteDoc, doc, setDoc, updateDoc } from "../firebase";
import { useFirebase } from "../hooks/useFirebase";
import { Topic } from "../types";

type TopicDraft = {
  id?: string;
  name: string;
};

export default function TopicManager() {
  const { user, topics, vocabulary } = useFirebase();
  const [draft, setDraft] = useState<TopicDraft>({ name: "" });
  const [deleteTopic, setDeleteTopic] = useState<Topic | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => a.name.localeCompare(b.name));
  }, [topics]);

  const wordCountByTopicId = useMemo(() => {
    const counts = new Map<string, number>();
    vocabulary.forEach((word) => {
      counts.set(word.topicId, (counts.get(word.topicId) || 0) + 1);
    });
    return counts;
  }, [vocabulary]);

  const resetDraft = () => {
    setDraft({ name: "" });
    setError("");
  };

  const normalizeTopicName = (value: string) => value.trim().replace(/\s+/g, " ");

  const handleSave = async () => {
    if (!user) return;

    const name = normalizeTopicName(draft.name);
    if (!name) {
      setError("Topic name is required.");
      return;
    }

    const duplicate = topics.find(
      (topic) => topic.id !== draft.id && topic.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setError("A topic with this name already exists.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (draft.id) {
        await updateDoc(doc(db, "topics", draft.id), {
          name,
          userId: user.uid,
          isUnclassified: false,
        });
      } else {
        const topicRef = doc(collection(db, "topics"));
        await setDoc(topicRef, {
          name,
          userId: user.uid,
          isUnclassified: false,
        });
      }
      resetDraft();
    } catch (saveError) {
      console.error("Topic save error:", saveError);
      setError("Could not save the topic. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getOrCreateFallbackTopicId = async (excludedTopicId: string) => {
    if (!user) return "";

    const existingGeneralTopic = topics.find(
      (topic) => topic.id !== excludedTopicId && topic.name.trim().toLowerCase() === "general",
    );
    if (existingGeneralTopic?.id) return existingGeneralTopic.id;

    const topicRef = doc(collection(db, "topics"));
    await setDoc(topicRef, {
      name: "General",
      userId: user.uid,
      isUnclassified: false,
    });
    return topicRef.id;
  };

  const handleDelete = async () => {
    if (!deleteTopic?.id) return;

    setDeleting(true);
    setError("");

    try {
      const wordsInTopic = vocabulary.filter((word) => word.topicId === deleteTopic.id);

      if (wordsInTopic.length > 0) {
        const fallbackTopicId = await getOrCreateFallbackTopicId(deleteTopic.id);
        await Promise.all(
          wordsInTopic.map((word) => {
            if (!word.id) return Promise.resolve();
            return updateDoc(doc(db, "vocabulary", word.id), { topicId: fallbackTopicId });
          }),
        );
      }

      await deleteDoc(doc(db, "topics", deleteTopic.id));
      if (draft.id === deleteTopic.id) resetDraft();
      setDeleteTopic(null);
    } catch (deleteError) {
      console.error("Topic delete error:", deleteError);
      setError("Could not delete the topic. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = Boolean(draft.id);

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-headline font-extrabold text-on-background tracking-tight mb-2">
            Topic Manager
          </h1>
          <p className="text-on-surface-variant text-base sm:text-lg">
            Create, rename, and remove the topic groups that organize your vocabulary.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-4 py-2 text-sm font-bold text-primary w-fit">
          <FolderTree className="w-4 h-4" />
          {topics.length} Topics
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-headline font-bold text-xl text-on-background">
                {isEditing ? "Edit Topic" : "Create Topic"}
              </h2>
              <p className="text-sm text-on-surface-variant">
                {isEditing ? "Update this topic name." : "Add a new category for words."}
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={resetDraft}
                className="p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
                aria-label="Cancel editing"
                title="Cancel editing"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface-variant ml-1">Topic Name</label>
              <input
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., Business English"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={100}
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-error-container/40 px-4 py-3 text-sm font-medium text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !draft.name.trim()}
              className="w-full bg-primary text-on-primary px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEditing ? "Save Topic" : "Create Topic"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-surface-container-low rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-headline font-bold text-xl text-on-background">All Topics</h2>
              <p className="text-sm text-on-surface-variant">Manage each topic and its linked words.</p>
            </div>
          </div>

          <div className="space-y-3">
            {sortedTopics.map((topic) => {
              const wordCount = topic.id ? wordCountByTopicId.get(topic.id) || 0 : 0;

              return (
                <div
                  key={topic.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-headline font-bold text-on-background truncate">{topic.name}</h3>
                    <p className="text-sm text-on-surface-variant">
                      {wordCount} {wordCount === 1 ? "word" : "words"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ id: topic.id, name: topic.name });
                        setError("");
                      }}
                      className="p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary-container/60"
                      aria-label={`Edit ${topic.name}`}
                      title="Edit topic"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTopic(topic)}
                      className="p-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40"
                      aria-label={`Delete ${topic.name}`}
                      title="Delete topic"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {sortedTopics.length === 0 && (
              <div className="text-center py-10 text-sm text-on-surface-variant">
                No topics yet. Create your first topic to start organizing words.
              </div>
            )}
          </div>
        </div>
      </section>

      {deleteTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-outline-variant/10">
            <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center text-error mb-6">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-headline font-bold text-on-background mb-2">Delete Topic?</h3>
            <p className="text-on-surface-variant mb-8">
              Words in "{deleteTopic.name}" will be moved to General before the topic is removed.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setDeleteTopic(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-error text-on-error font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
