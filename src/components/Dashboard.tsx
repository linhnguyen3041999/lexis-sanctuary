import React from "react";
import { Play, TrendingUp, CheckCircle2, Clock, Star, ChevronRight } from "lucide-react";
import { useFirebase } from "../hooks/useFirebase";
import { isBefore } from "date-fns";

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user, vocabulary, progress, topics } = useFirebase();

  const dueCount = vocabulary.filter(v => {
    const p = progress.find(pr => pr.wordId === v.id);
    if (!p) return false;
    const nextReviewDate = p.nextReview.toDate ? p.nextReview.toDate() : new Date(p.nextReview);
    return isBefore(nextReviewDate, new Date());
  }).length;

  const masteredCount = progress.filter(p => p.status === "mastered").length;
  const learningCount = progress.filter(p => p.status === "learning").length;

  return (
    <div className="space-y-10">
      <header className="mb-10">
        <h1 className="text-4xl font-headline font-extrabold text-on-background tracking-tight mb-2">Welcome back, {user?.displayName?.split(" ")[0]}</h1>
        <p className="text-on-surface-variant font-body">You're on a <span className="text-primary font-bold">12-day streak</span>. Ready for your morning session?</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Today's Goal Card */}
        <section className="md:col-span-8 bg-surface-container-low rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
          <div className="relative z-10 flex-1">
            <span className="text-primary font-bold text-xs uppercase tracking-widest mb-2 block">Today's Focus</span>
            <h2 className="text-3xl font-headline font-bold text-on-background mb-4">You have {dueCount} words to review</h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveTab("flashcards")}
                className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Review
              </button>
              <div className="flex flex-col">
                <span className="text-2xl font-headline font-bold text-on-background">{masteredCount}</span>
                <span className="text-xs text-on-surface-variant font-medium">Words mastered total</span>
              </div>
            </div>
          </div>
          
          {/* Circular Progress */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle className="text-surface-container-highest" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="8" />
              <circle 
                cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
                className="text-primary"
                strokeDasharray="440"
                strokeDashoffset={440 - (440 * (masteredCount / (vocabulary.length || 1)))}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-headline font-extrabold text-primary">
                {Math.round((masteredCount / (vocabulary.length || 1)) * 100)}%
              </span>
            </div>
          </div>
        </section>

        {/* Stats Card */}
        <section className="md:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/10">
          <div>
            <h3 className="font-headline font-bold text-lg mb-1">Knowledge Growth</h3>
            <p className="text-sm text-on-surface-variant mb-6">Mastered vs. Learning words</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface">Mastered</span>
                <span className="font-bold">{masteredCount}</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(masteredCount / (vocabulary.length || 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface">Learning</span>
                <span className="font-bold">{learningCount}</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${(learningCount / (vocabulary.length || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-outline-variant/10">
            <span className="text-xs text-on-surface-variant font-medium">Retention Rate</span>
            <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary-container rounded-lg">92%</span>
          </div>
        </section>

        {/* Recent Topics */}
        <section className="md:col-span-12 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-headline font-bold text-on-background">Recent Topics</h2>
            <button onClick={() => setActiveTab("topics")} className="text-primary font-bold text-sm hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topics.slice(0, 3).map(topic => {
              const topicVocab = vocabulary.filter(v => v.topicId === topic.id);
              return (
                <div 
                  key={topic.id}
                  onClick={() => setActiveTab("topics")}
                  className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl group hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-lg bg-primary-container flex items-center justify-center text-primary flex-shrink-0">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-headline font-bold text-on-background">{topic.name}</h5>
                    <p className="text-xs text-on-surface-variant">{topicVocab.length} Words</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
