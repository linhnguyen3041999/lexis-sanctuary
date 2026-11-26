/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import VocabForm from "./components/VocabForm";
import Flashcard from "./components/Flashcard";
import WritingPractice from "./components/WritingPractice";
import WordList from "./components/WordList";
import TopicManager from "./components/TopicManager";
import { Vocabulary } from "./types";

const ACTIVE_TAB_STORAGE_KEY = "lexis:active-tab";
const validTabs = new Set([
  "dashboard", "vocabulary", "wordList", "topicManager", "flashcards", "writingPractice",
]);

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const storedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      return storedTab && validTabs.has(storedTab) ? storedTab : "dashboard";
    } catch (error) {
      console.error("Active tab restore error:", error);
      return "dashboard";
    }
  });
  const [topicEditingWord, setTopicEditingWord] = useState<Vocabulary | null>(null);
  const [wordListNotice, setWordListNotice] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch (error) {
      console.error("Active tab save error:", error);
    }
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setTopicEditingWord(null);
    if (tab !== "wordList") setWordListNotice("");
    setActiveTab(tab);
  };

  const handleEditWord = (word: Vocabulary) => {
    setTopicEditingWord(word);
    setActiveTab("wordList");
  };

  useEffect(() => {
    if (activeTab !== "wordList") {
      setTopicEditingWord(null);
    }
  }, [activeTab]);

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
      {activeTab === "dashboard" && <Dashboard setActiveTab={handleTabChange} />}
      {activeTab === "vocabulary" && <VocabForm />}
      {activeTab === "flashcards" && <Flashcard />}
      {activeTab === "writingPractice" && <WritingPractice />}
      {activeTab === "wordList" && (
        topicEditingWord ? (
          <VocabForm
            editingWord={topicEditingWord}
            onCancel={() => setTopicEditingWord(null)}
            onSuccess={() => {
              setTopicEditingWord(null);
              setWordListNotice("Word updated successfully.");
            }}
          />
        ) : (
          <WordList
            onEdit={handleEditWord}
            successMessage={wordListNotice}
            onDismissSuccessMessage={() => setWordListNotice("")}
          />
        )
      )}
      {activeTab === "topicManager" && <TopicManager />}
    </Layout>
  );
}
