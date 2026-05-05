import React, { useEffect, useState } from "react";
import { LayoutDashboard, BookOpen, Layers, GraduationCap, LogOut, HelpCircle, Search, Bell, Settings, Menu, X } from "lucide-react";
import { auth, googleProvider, signInWithPopup } from "../firebase";
import { useFirebase } from "../hooks/useFirebase";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, loading } = useFirebase();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeTab]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        console.log("Sign-in popup closed by user.");
      } else {
        console.error("Auth Error:", error);
      }
    }
  };
  const handleLogout = () => auth.signOut();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading Sanctuary...</div>;

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-4xl font-headline font-extrabold text-blue-900 mb-4 tracking-tight">Lexis Sanctuary</h1>
        <p className="text-on-surface-variant mb-8 max-w-md">Your AI-powered cognitive sanctuary for mastering English vocabulary.</p>
        <button 
          onClick={handleLogin}
          className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
        >
          Enter the Sanctuary with Google
        </button>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "vocabulary", label: "Vocabulary", icon: BookOpen },
    { id: "topics", label: "Word List", icon: Layers },
    { id: "flashcards", label: "Flashcards", icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased">
      {/* Top Bar */}
      <header className="fixed top-0 w-full bg-surface/80 backdrop-blur-xl z-50 border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-full hover:bg-surface-container-high"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base sm:text-xl font-bold text-blue-800 font-headline tracking-tight truncate">Lexis Sanctuary</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden md:flex items-center bg-surface-container-low px-4 py-1.5 rounded-full">
              <Search className="w-4 h-4 text-outline" />
              <input className="bg-transparent border-none focus:ring-0 text-sm w-48 ml-2" placeholder="Search dictionary..." />
            </div>
            <button className="p-2 hover:bg-surface-container-high rounded-full"><Bell className="w-5 h-5" /></button>
            <button className="hidden sm:inline-flex p-2 hover:bg-surface-container-high rounded-full"><Settings className="w-5 h-5" /></button>
            <img src={user.photoURL || ""} alt="Profile" className="w-8 h-8 rounded-full border border-outline-variant/20" />
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-on-background/40 z-40 lg:hidden"
            aria-label="Close navigation menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="fixed left-0 top-0 h-screen w-72 max-w-[85vw] bg-surface p-4 z-50 lg:hidden flex flex-col border-r border-outline-variant/10"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold text-blue-800 font-headline tracking-tight">Lexis Sanctuary</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-2 rounded-full hover:bg-surface-container-high"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    activeTab === item.id
                      ? "bg-primary-container text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary text-sm font-medium">
                <HelpCircle className="w-5 h-5" /> Help
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error text-sm font-medium">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-surface pt-20 p-4 hidden lg:flex flex-col border-r border-outline-variant/10">
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                activeTab === item.id 
                  ? "bg-primary-container text-primary shadow-sm" 
                  : "text-on-surface-variant hover:text-primary hover:translate-x-1"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-outline-variant/10 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary text-sm font-medium">
            <HelpCircle className="w-5 h-5" /> Help
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error text-sm font-medium">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-20 sm:pt-24 px-4 sm:px-6 pb-10 sm:pb-12 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
