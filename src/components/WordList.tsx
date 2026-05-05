import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Edit, Trash2, X, Volume2, Loader2 } from "lucide-react";
import { useFirebase } from "../hooks/useFirebase";
import { db, deleteDoc, doc, collection, query, where, getDocs, updateDoc } from "../firebase";
import { Vocabulary } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";

const PAGE_SIZE = 10;
const WORD_LIST_FILTERS_STORAGE_KEY_PREFIX = "lexis:word-list-filters";

type WordListFilters = {
  search?: string;
  filterType?: string;
  filterLevel?: string;
  filterTopicId?: string;
  filterStatus?: string;
  currentPage?: number;
};

interface WordListProps {
  onEdit?: (word: Vocabulary) => void;
  resetToRootSignal?: number;
}

export default function WordList({ onEdit, resetToRootSignal }: WordListProps) {
  const { user, topics, progress, vocabulary } = useFirebase();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterTopicId, setFilterTopicId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingWord, setViewingWord] = useState<Vocabulary | null>(null);
  const [isListening, setIsListening] = useState(false);
  const hasLoadedStoredFiltersRef = useRef(false);
  const skipNextFiltersPersistRef = useRef(false);

  const filterStorageKey = useMemo(() => {
    if (!user?.uid) return "";
    return `${WORD_LIST_FILTERS_STORAGE_KEY_PREFIX}:${user.uid}`;
  }, [user?.uid]);

  const capitalizeFirstLetter = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const runWordCapitalizationMigration = async (userId: string) => {
    const vocabQuery = query(collection(db, "vocabulary"), where("userId", "==", userId));
    const snap = await getDocs(vocabQuery);

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Vocabulary;
      const nextWord = capitalizeFirstLetter(data.word || "");
      if (nextWord && nextWord !== data.word) {
        await updateDoc(doc(db, "vocabulary", docSnap.id), { word: nextWord });
      }
    }
  };


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
              prebuiltVoiceConfig: { voiceName: "Kore" },
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
        view.setUint32(4, 36 + len, true); // File size
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true); // AudioFormat (PCM)
        view.setUint16(22, 1, true); // NumChannels
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, sampleRate * 2, true); // ByteRate
        view.setUint16(32, 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, len, true); // Subchunk2Size

        const wavBlob = new Blob([wavHeader, bytes], { type: "audio/wav" });
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "vocabulary", deleteId));
      // Also delete progress
      const p = progress.find(pr => pr.wordId === deleteId);
      if (p?.id) {
        await deleteDoc(doc(db, "progress", p.id));
      }
      setDeleteId(null);
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  useEffect(() => {
    setSearch("");
    setFilterType("");
    setFilterLevel("");
    setFilterTopicId("");
    setFilterStatus("");
    setCurrentPage(1);
    setDeleteId(null);
    setViewingWord(null);
  }, [resetToRootSignal]);

  useEffect(() => {
    if (!filterStorageKey) return;

    hasLoadedStoredFiltersRef.current = false;
    skipNextFiltersPersistRef.current = true;

    try {
      const storedFilters = sessionStorage.getItem(filterStorageKey);
      if (!storedFilters) {
        setSearch("");
        setFilterType("");
        setFilterLevel("");
        setFilterTopicId("");
        setFilterStatus("");
        setCurrentPage(1);
        hasLoadedStoredFiltersRef.current = true;
        return;
      }

      const parsedFilters = JSON.parse(storedFilters) as WordListFilters | null;
      setSearch(parsedFilters?.search || "");
      setFilterType(parsedFilters?.filterType || "");
      setFilterLevel(parsedFilters?.filterLevel || "");
      setFilterTopicId(parsedFilters?.filterTopicId || "");
      setFilterStatus(parsedFilters?.filterStatus || "");
      setCurrentPage(
        parsedFilters?.currentPage && parsedFilters.currentPage > 0
          ? parsedFilters.currentPage
          : 1,
      );
    } catch (error) {
      console.error("Word list filters restore error:", error);
      sessionStorage.removeItem(filterStorageKey);
    } finally {
      hasLoadedStoredFiltersRef.current = true;
    }
  }, [filterStorageKey]);

  useEffect(() => {
    if (!filterStorageKey || !hasLoadedStoredFiltersRef.current) return;
    if (skipNextFiltersPersistRef.current) {
      skipNextFiltersPersistRef.current = false;
      return;
    }

    const nextFilters: WordListFilters = {
      search,
      filterType,
      filterLevel,
      filterTopicId,
      filterStatus,
      currentPage,
    };

    try {
      sessionStorage.setItem(filterStorageKey, JSON.stringify(nextFilters));
    } catch (error) {
      console.error("Word list filters persist error:", error);
    }
  }, [filterStorageKey, search, filterType, filterLevel, filterTopicId, filterStatus, currentPage]);

  useEffect(() => {
    if (!user) return;
    const key = `lexis:migrate-capitalize-word:${user.uid}`;
    if (localStorage.getItem(key)) return;

    const runMigration = async () => {
      try {
        await runWordCapitalizationMigration(user.uid);
        localStorage.setItem(key, "1");
      } catch (error) {
        console.error("Migration Error:", error);
      }
    };

    void runMigration();
  }, [user]);

  const topicNameById = useMemo(() => {
    return new Map(topics.map(topic => [topic.id, topic.name]));
  }, [topics]);

  const typeOptions = useMemo(() => {
    const values = vocabulary.map(v => v.type).filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [vocabulary]);

  const levelOptions = useMemo(() => ["A1", "A2", "B1", "B2", "C1", "C2"], []);

  const statusOptions = useMemo(() => ["new", "learning", "mastered"], []);

  const getStatus = (word: Vocabulary) => {
    return progress.find(pr => pr.wordId === word.id)?.status || "new";
  };

  const getCreatedAtMs = (value: any) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const filteredVocab = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return vocabulary
      .filter(v => {
        const matchesSearch = !normalizedSearch || v.word.toLowerCase().startsWith(normalizedSearch);
        const matchesType = !filterType || v.type === filterType;
        const matchesLevel = !filterLevel || (v.level || "").toUpperCase() === filterLevel;
        const matchesTopic = !filterTopicId || v.topicId === filterTopicId;
        const matchesStatus = !filterStatus || getStatus(v) === filterStatus;

        return matchesSearch && matchesType && matchesLevel && matchesTopic && matchesStatus;
      })
      .sort((a, b) => getCreatedAtMs(b.createdAt) - getCreatedAtMs(a.createdAt));
  }, [vocabulary, search, filterType, filterLevel, filterTopicId, filterStatus, progress]);

  const totalPages = Math.max(1, Math.ceil(filteredVocab.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedVocab = filteredVocab.slice(
    (currentPageSafe - 1) * PAGE_SIZE,
    currentPageSafe * PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-8 sm:space-y-12">
      <header className="space-y-4 sm:space-y-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-headline font-extrabold text-on-background tracking-tight mb-2 sm:mb-3">Vocabulary List</h2>
          <p className="text-on-surface-variant text-base sm:text-lg">All vocabulary sorted by newest additions.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_repeat(4,1fr)] gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input
              className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20"
              placeholder="Search vocabulary..."
              value={search}
              onChange={e => {
                setSearch(capitalizeFirstLetter(e.target.value));
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All types</option>
            {typeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
            value={filterLevel}
            onChange={e => {
              setFilterLevel(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All levels</option>
            {levelOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
            value={filterTopicId}
            onChange={e => {
              setFilterTopicId(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All topics</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>
          <select
            className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20"
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All status</option>
            {statusOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </header>

      <section className="bg-surface-container-low rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col">
            <h4 className="text-lg sm:text-xl font-headline font-bold text-on-background">All Vocabulary</h4>
            <p className="text-sm text-on-surface-variant">Showing {filteredVocab.length} terms</p>
          </div>
          <div className="text-xs text-on-surface-variant">
            Page {currentPageSafe} of {totalPages}
          </div>
        </div>

        <div className="px-4 sm:px-8 pb-4 sm:pb-8">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="bg-[#fafafa] text-[#333] font-bold tracking-wide border-b border-outline-variant/30">
                  <th className="px-6 py-4 text-left">Word</th>
                  <th className="px-6 py-4 text-left">Type</th>
                  <th className="px-6 py-4 text-center">Level</th>
                  <th className="px-6 py-4 text-left">Topic</th>
                  <th className="px-6 py-4 text-left">IPA</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {pagedVocab.map(v => {
                  const status = getStatus(v);
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setViewingWord(v)}
                      className="bg-surface-container-lowest hover:bg-white transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-5 rounded-l-xl">
                        <span className="font-headline font-bold text-lg text-on-background">{v.word}</span>
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant font-medium capitalize">{v.type}</td>
                      <td className="px-6 py-5 text-on-surface-variant font-medium text-center">
                        {v.level ? v.level.toUpperCase() : "-"}
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant font-medium">
                        {topicNameById.get(v.topicId) || "Unclassified"}
                      </td>
                      <td className="px-6 py-5 font-mono text-primary text-sm">{v.ipa}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${
                          status === "mastered" ? "bg-secondary-container text-on-secondary-container" :
                          status === "learning" ? "bg-primary-container text-primary" :
                          "bg-surface-container-highest text-on-surface-variant"
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right rounded-r-xl">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit && onEdit(v);
                            }}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(v.id!);
                            }}
                            className="p-2 text-on-surface-variant hover:text-error transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {pagedVocab.map(v => {
              const status = getStatus(v);
              return (
                <div
                  key={v.id}
                  onClick={() => setViewingWord(v)}
                  className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-headline font-bold text-lg text-on-background leading-tight">{v.word}</h5>
                      <p className="text-xs text-primary font-mono mt-1">{v.ipa}</p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {topicNameById.get(v.topicId) || "Unclassified"}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${
                      status === "mastered" ? "bg-secondary-container text-on-secondary-container" :
                      status === "learning" ? "bg-primary-container text-primary" :
                      "bg-surface-container-highest text-on-surface-variant"
                    }`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">{v.meaning}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="capitalize">{v.type}</span>
                      <span>•</span>
                      <span>{v.level ? v.level.toUpperCase() : "-"}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit && onEdit(v);
                        }}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(v.id!);
                        }}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredVocab.length === 0 && (
              <div className="text-center py-8 text-sm text-on-surface-variant">No terms found.</div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Page {currentPageSafe} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPageSafe === 1}
                className="px-4 py-2 rounded-lg bg-surface-container-low text-on-surface font-semibold disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPageSafe === totalPages}
                className="px-4 py-2 rounded-lg bg-surface-container-low text-on-surface font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-outline-variant/10">
            <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center text-error mb-6">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-headline font-bold text-on-background mb-2">Delete Word?</h3>
            <p className="text-on-surface-variant mb-8">
              This will permanently remove this word and all its learning progress from your sanctuary.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-error text-on-error font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingWord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setViewingWord(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-3xl p-4 sm:p-8 max-w-2xl w-full shadow-2xl border border-outline-variant/10 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                <div className="px-3 sm:px-4 py-2 bg-primary-container text-primary rounded-xl font-headline font-bold text-xl sm:text-2xl truncate max-w-[180px] sm:max-w-none">
                  {viewingWord.word}
                </div>
                <span className="text-on-surface-variant font-mono text-sm sm:text-lg break-all">{viewingWord.ipa}</span>
                <button
                  onClick={() => handleListen(viewingWord.word)}
                  disabled={isListening}
                  className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50"
                  title="Listen"
                >
                  {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={() => setViewingWord(null)}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors bg-surface-container-high rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-5 sm:space-y-6">
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Meaning</h5>
                  <p className="text-base sm:text-lg text-on-background leading-relaxed">{viewingWord.meaning}</p>
                </section>
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Type</h5>
                  <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant rounded-full text-sm font-medium capitalize">
                    {viewingWord.type}
                  </span>
                </section>
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Level</h5>
                  <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant rounded-full text-sm font-medium">
                    {viewingWord.level ? viewingWord.level.toUpperCase() : "Unspecified"}
                  </span>
                </section>
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Topic</h5>
                  <span className="text-on-background font-medium">
                    {topicNameById.get(viewingWord.topicId) || "Unclassified"}
                  </span>
                </section>
              </div>

              <div className="space-y-5 sm:space-y-6">
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Context</h5>
                  <p className="text-on-surface-variant italic leading-relaxed">"{viewingWord.context}"</p>
                </section>
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Example Sentence</h5>
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                    <p className="text-on-background leading-relaxed">{viewingWord.example}</p>
                  </div>
                </section>
              </div>
            </div>

            <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-outline-variant/10 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setViewingWord(null);
                  setDeleteId(viewingWord.id!);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-error hover:bg-error-container/50 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  const word = viewingWord;
                  setViewingWord(null);
                  onEdit && onEdit(word);
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Edit className="w-5 h-5" />
                Edit Word
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
