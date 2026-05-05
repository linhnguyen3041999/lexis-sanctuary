/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import VocabForm from "./components/VocabForm";
import Flashcard from "./components/Flashcard";
import TopicList from "./components/TopicList";
import { Vocabulary } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [topicEditingWord, setTopicEditingWord] = useState<Vocabulary | null>(null);
  const [topicResetSignal, setTopicResetSignal] = useState(0);
  const [lastTopicId, setLastTopicId] = useState<string | null>(null);
  const [topicReturnSignal, setTopicReturnSignal] = useState(0);

  const handleSidebarTabChange = (tab: string) => {
    if (tab === "topics") {
      setTopicEditingWord(null);
      setTopicResetSignal(prev => prev + 1);
    }
    setActiveTab(tab);
  };

  const handleEditWord = (word: Vocabulary) => {
    setTopicEditingWord(word);
    setLastTopicId(word.topicId || null);
    setActiveTab("topics");
  };

  useEffect(() => {
    if (activeTab !== "topics") {
      setTopicEditingWord(null);
    }
  }, [activeTab]);

  return (
    <Layout activeTab={activeTab} setActiveTab={handleSidebarTabChange}>
      {activeTab === "dashboard" && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === "vocabulary" && <VocabForm />}
      {activeTab === "flashcards" && <Flashcard />}
      {activeTab === "topics" && (
        topicEditingWord ? (
          <VocabForm
            editingWord={topicEditingWord}
            onCancel={() => {
              setTopicEditingWord(null);
              setTopicReturnSignal(prev => prev + 1);
            }}
            onSuccess={() => {
              setTopicEditingWord(null);
              setTopicReturnSignal(prev => prev + 1);
            }}
          />
        ) : (
          <TopicList
            onEdit={handleEditWord}
            resetToRootSignal={topicResetSignal}
            restoreSelectedTopicId={lastTopicId}
            restoreSelectedTopicSignal={topicReturnSignal}
          />
        )
      )}
    </Layout>
  );
}

