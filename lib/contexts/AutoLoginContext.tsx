'use client';

/**
 * Auto Login Context
 * 
 * Provides auto-login status to all components in the application.
 * This ensures that API calls wait for auto-login to complete before executing.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useAutoLogin } from '@/lib/hooks/useAutoLogin';

interface AutoLoginContextType {
  enabled: boolean;
  verified: boolean;
  loading: boolean;
  error?: string;
  isReady: boolean; // True when auto-login is complete (either verified or not enabled)
}

const AutoLoginContext = createContext<AutoLoginContextType | undefined>(undefined);

export function AutoLoginProvider({ children }: { children: ReactNode }) {
  const autoLoginStatus = useAutoLogin();
  
  // isReady is true when:
  // 1. Auto-login is not enabled (no need to wait)
  // 2. Auto-login is enabled and not loading (either verified, failed, or completed)
  const isReady = !autoLoginStatus.enabled || !autoLoginStatus.loading;

  return (
    <AutoLoginContext.Provider
      value={{
        enabled: autoLoginStatus.enabled,
        verified: autoLoginStatus.verified,
        loading: autoLoginStatus.loading,
        error: autoLoginStatus.error,
        isReady,
      }}
    >
      {children}
    </AutoLoginContext.Provider>
  );
}

export function useAutoLoginContext() {
  const context = useContext(AutoLoginContext);
  if (context === undefined) {
    throw new Error('useAutoLoginContext must be used within AutoLoginProvider');
  }
  return context;
}

