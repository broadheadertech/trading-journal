'use client';

// Story 9.2 — React context combining OS prefers-reduced-motion + app setting (FR44, NFR14)

import { createContext, useContext, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useProfile } from '@/hooks/useStore';

interface ReducedMotionContextValue {
  isReducedMotion: boolean;
}

const ReducedMotionContext = createContext<ReducedMotionContextValue>({ isReducedMotion: false });

export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  const osPreference = useReducedMotion(); // boolean | null
  const { reducedMotion: appSetting } = useProfile();
  const isReducedMotion = !!osPreference || appSetting;

  // Sync body attribute for CSS targeting of app-level setting
  useEffect(() => {
    if (isReducedMotion) {
      document.body.setAttribute('data-reduced-motion', 'true');
    } else {
      document.body.removeAttribute('data-reduced-motion');
    }
    return () => { document.body.removeAttribute('data-reduced-motion'); };
  }, [isReducedMotion]);

  return (
    <ReducedMotionContext.Provider value={{ isReducedMotion }}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotionContext(): ReducedMotionContextValue {
  return useContext(ReducedMotionContext);
}
