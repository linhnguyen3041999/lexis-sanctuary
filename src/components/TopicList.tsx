import React, { useState } from "react";
import { Search, Filter, Download, Edit, ChevronLeft, ChevronRight, Play, Trash2, X, Save, Volume2, Loader2 } from "lucide-react";
import { useFirebase } from "../hooks/useFirebase";
import { db, deleteDoc, doc, updateDoc } from "../firebase";
import { Vocabulary, Topic } from "../types";
import { GoogleGenAI, Modality } from "@google/genai";

interface TopicListProps {
  onEdit?: (word: Vocabulary) => void;
}

export default function TopicList({ onEdit }: TopicListProps) {
  const { vocabulary, topics, progress } = useFirebase();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTopicId, setDeleteTopicId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editTopicName, setEditTopicName] = useState("");
  const [viewingWord, setViewingWord] = useState<Vocabulary | null>(null);
  const [isListening, setIsListening] = useState(false);

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

  const handleDeleteTopic = async () => {
    if (!deleteTopicId) return;
    try {
      // Delete all vocabulary items in this topic
      const topicVocab = vocabulary.filter(v => v.topicId === deleteTopicId);
      for (const v of topicVocab) {
        await deleteDoc(doc(db, "vocabulary", v.id!));
        const p = progress.find(pr => pr.wordId === v.id);
        if (p?.id) {
          await deleteDoc(doc(db, "progress", p.id));
        }
      }
      // Delete the topic itself
      await deleteDoc(doc(db, "topics", deleteTopicId));
      if (selectedTopic === deleteTopicId) setSelectedTopic(null);
      setDeleteTopicId(null);
    } catch (error) {
      console.error("Delete Topic Error:", error);
    }
  };

  const handleEditTopic = async () => {
    if (!editingTopic || !editTopicName.trim()) return;
    try {
      await updateDoc(doc(db, "topics", editingTopic.id!), {
        name: editTopicName.trim()
      });
      setEditingTopic(null);
      setEditTopicName("");
    } catch (error) {
      console.error("Edit Topic Error:", error);
    }
  };

  const filteredVocab = vocabulary.filter(v => {
    const matchesTopic = !selectedTopic || v.topicId === selectedTopic;
    const matchesSearch = v.word.toLowerCase().includes(search.toLowerCase()) || 
                         v.meaning.toLowerCase().includes(search.toLowerCase());
    return matchesTopic && matchesSearch;
  });

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-headline font-extrabold text-on-background tracking-tight mb-3">Topic Exploration</h2>
          <p className="text-on-surface-variant text-lg">Organize your lexicon by semantic domains. Monitor your progress through each conceptual landscape.</p>
        </div>
      </header>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map(topic => {
          const topicVocab = vocabulary.filter(v => v.topicId === topic.id);
          const masteredCount = topicVocab.filter(v => {
            const p = progress.find(pr => pr.wordId === v.id);
            return p?.status === "mastered";
          }).length;

          return (
            <div 
              key={topic.id}
              onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
              className={`group relative bg-surface-container-lowest rounded-xl p-8 transition-all duration-300 cursor-pointer flex flex-col justify-between h-64 shadow-sm border-2 ${
                selectedTopic === topic.id ? "border-primary bg-primary-container" : "border-transparent hover:border-primary/10"
              }`}
            >
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTopic(topic);
                    setEditTopicName(topic.name);
                  }}
                  className="p-2 bg-surface-container-high rounded-full text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTopicId(topic.id!);
                  }}
                  className="p-2 bg-surface-container-high rounded-full text-on-surface-variant hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-2xl font-headline font-bold mb-2">{topic.name}</h3>
                <p className="text-on-surface-variant text-sm">{topicVocab.length} Words • {masteredCount} Mastered</p>
              </div>
              <div className="flex gap-4 mt-6">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Total</span>
                  <span className="text-xl font-headline font-bold">{topicVocab.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Mastered</span>
                  <span className="text-xl font-headline font-bold text-primary">{masteredCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Section */}
      <section className="bg-surface-container-low rounded-3xl overflow-hidden shadow-sm">
        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col">
            <h4 className="text-xl font-headline font-bold text-on-background">
              {selectedTopic ? topics.find(t => t.id === selectedTopic)?.name : "All Vocabulary"}
            </h4>
            <p className="text-sm text-on-surface-variant">Showing {filteredVocab.length} terms</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
              <input 
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                placeholder="Filter terms..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="p-3 bg-surface-container-highest rounded-xl text-on-surface-variant hover:text-primary transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-3 bg-surface-container-highest rounded-xl text-on-surface-variant hover:text-primary transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-8 pb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Word</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">IPA</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredVocab.map(v => {
                  const p = progress.find(pr => pr.wordId === v.id);
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
                      <td className="px-6 py-5 font-mono text-primary text-sm">{v.ipa}</td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase ${
                          p?.status === "mastered" ? "bg-secondary-container text-on-secondary-container" :
                          p?.status === "learning" ? "bg-primary-container text-primary" :
                          "bg-surface-container-highest text-on-surface-variant"
                        }`}>
                          {p?.status || "new"}
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
        </div>
      </section>

      {/* Delete Word Confirmation Modal */}
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

      {/* Delete Topic Confirmation Modal */}
      {deleteTopicId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-outline-variant/10">
            <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center text-error mb-6">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-headline font-bold text-on-background mb-2">Delete Topic?</h3>
            <p className="text-on-surface-variant mb-8">
              This will permanently remove the topic <strong>"{topics.find(t => t.id === deleteTopicId)?.name}"</strong> and ALL words within it.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteTopicId(null)}
                className="flex-1 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTopic}
                className="flex-1 py-3 rounded-xl bg-error text-on-error font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-headline font-bold text-on-background">Rename Topic</h3>
              <button onClick={() => setEditingTopic(null)} className="text-on-surface-variant hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface-variant ml-1">Topic Name</label>
                <input 
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter new name..."
                  value={editTopicName}
                  onChange={e => setEditTopicName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setEditingTopic(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditTopic}
                  disabled={!editTopicName.trim() || editTopicName.trim() === editingTopic.name}
                  className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Word Detail Modal */}
      {viewingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-outline-variant/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-primary-container text-primary rounded-xl font-headline font-bold text-2xl">
                  {viewingWord.word}
                </div>
                <span className="text-on-surface-variant font-mono text-lg">{viewingWord.ipa}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Meaning</h5>
                  <p className="text-lg text-on-background leading-relaxed">{viewingWord.meaning}</p>
                </section>
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Type</h5>
                  <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant rounded-full text-sm font-medium capitalize">
                    {viewingWord.type}
                  </span>
                </section>
                <section>
                  <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Topic</h5>
                  <span className="text-on-background font-medium">
                    {topics.find(t => t.id === viewingWord.topicId)?.name || "Unclassified"}
                  </span>
                </section>
              </div>

              <div className="space-y-6">
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

            <div className="mt-10 pt-8 border-t border-outline-variant/10 flex justify-end gap-4">
              <button 
                onClick={() => {
                  setViewingWord(null);
                  setDeleteId(viewingWord.id!);
                }}
                className="px-6 py-3 rounded-xl font-bold text-error hover:bg-error-container/50 transition-colors"
              >
                Delete
              </button>
              <button 
                onClick={() => {
                  const word = viewingWord;
                  setViewingWord(null);
                  onEdit && onEdit(word);
                }}
                className="px-8 py-3 rounded-xl bg-primary text-on-primary font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
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
