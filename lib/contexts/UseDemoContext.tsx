'use client';

/**
 * Use Demo Context
 * 
 * Provides global use_demo state management across the application
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UseDemoContextType {
  useDemo: boolean;
  setUseDemo: (value: boolean) => void;
  toggleUseDemo: () => void;
}

const UseDemoContext = createContext<UseDemoContextType | undefined>(undefined);

const STORAGE_KEY = 'use_demo_enabled';

export function UseDemoProvider({ children }: { children: ReactNode }) {
  const [useDemo, setUseDemoState] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setUseDemoState(saved === 'true');
      }
      setMounted(true);
    }
  }, []);

  // Save to localStorage when changed
  const setUseDemo = (value: boolean) => {
    setUseDemoState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
  };

  const toggleUseDemo = () => {
    setUseDemo(!useDemo);
  };

  return (
    <UseDemoContext.Provider value={{ useDemo: mounted ? useDemo : false, setUseDemo, toggleUseDemo }}>
      {children}
    </UseDemoContext.Provider>
  );
}

export function useUseDemo() {
  const context = useContext(UseDemoContext);
  if (context === undefined) {
    throw new Error('useUseDemo must be used within a UseDemoProvider');
  }
  return context;
}

