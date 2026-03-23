/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import VocabForm from "./components/VocabForm";
import Flashcard from "./components/Flashcard";
import TopicList from "./components/TopicList";
import { Vocabulary } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingWord, setEditingWord] = useState<Vocabulary | null>(null);

  const handleEditWord = (word: Vocabulary) => {
    setEditingWord(word);
    setActiveTab("vocabulary");
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "dashboard" && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === "vocabulary" && (
        <VocabForm 
          editingWord={editingWord} 
          onCancel={() => {
            setEditingWord(null);
            setActiveTab("topics");
          }} 
          onSuccess={() => {
            setEditingWord(null);
            setActiveTab("topics");
          }}
        />
      )}
      {activeTab === "flashcards" && <Flashcard />}
      {activeTab === "topics" && <TopicList onEdit={handleEditWord} />}
    </Layout>
  );
}

