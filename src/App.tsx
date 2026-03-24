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

  const handleEditWord = (word: Vocabulary) => {
    setTopicEditingWord(word);
    setActiveTab("topics");
  };

  useEffect(() => {
    if (activeTab !== "topics") {
      setTopicEditingWord(null);
    }
  }, [activeTab]);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "dashboard" && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === "vocabulary" && <VocabForm />}
      {activeTab === "flashcards" && <Flashcard />}
      {activeTab === "topics" && (
        topicEditingWord ? (
          <VocabForm
            editingWord={topicEditingWord}
            onCancel={() => setTopicEditingWord(null)}
            onSuccess={() => setTopicEditingWord(null)}
          />
        ) : (
          <TopicList onEdit={handleEditWord} />
        )
      )}
    </Layout>
  );
}

