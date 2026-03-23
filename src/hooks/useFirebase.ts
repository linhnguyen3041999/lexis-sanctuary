import { useState, useEffect } from "react";
import { auth, db, onAuthStateChanged, User, collection, query, where, onSnapshot, orderBy } from "../firebase";
import { Vocabulary, Topic, UserProgress } from "../types";

export function useFirebase() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTopics([]);
      setVocabulary([]);
      setProgress([]);
      return;
    }

    const topicsQuery = query(collection(db, "topics"), where("userId", "==", user.uid));
    const vocabQuery = query(collection(db, "vocabulary"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const progressQuery = query(collection(db, "progress"), where("userId", "==", user.uid));

    const unsubTopics = onSnapshot(topicsQuery, (snap) => {
      setTopics(snap.docs.map(d => ({ id: d.id, ...d.data() } as Topic)));
    });

    const unsubVocab = onSnapshot(vocabQuery, (snap) => {
      setVocabulary(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vocabulary)));
    });

    const unsubProgress = onSnapshot(progressQuery, (snap) => {
      setProgress(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProgress)));
    });

    return () => {
      unsubTopics();
      unsubVocab();
      unsubProgress();
    };
  }, [user]);

  return { user, loading, topics, vocabulary, progress };
}
