import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface ClickedWord {
  word: string;
  position: { x: number; y: number };
}

export interface Translation {
  word: string;
  translation: string;
  partOfSpeech?: string;
  pronunciation?: string;
}

interface ClickableTextContextType {
  clickedWord: ClickedWord | null;
  translation: Translation | null;
  isLoading: boolean;
  setClickedWord: (word: ClickedWord | null) => void;
  setTranslation: (translation: Translation | null) => void;
  setIsLoading: (loading: boolean) => void;
  closePopup: () => void;
  setCallbacks: (callbacks: {
    onWordAdded?: (word: string) => void;
    onDeepAnalysis?: (word: string) => void;
    onAIAnalysisClick?: (word: string) => void;
  }) => void;
  callbacks: {
    onWordAdded?: (word: string) => void;
    onDeepAnalysis?: (word: string) => void;
    onAIAnalysisClick?: (word: string) => void;
  };
}

const ClickableTextContext = createContext<ClickableTextContextType | undefined>(undefined);

export const ClickableTextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clickedWord, setClickedWord] = useState<ClickedWord | null>(null);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [callbacks, setCallbacks] = useState<{
    onWordAdded?: (word: string) => void;
    onDeepAnalysis?: (word: string) => void;
    onAIAnalysisClick?: (word: string) => void;
  }>({});

  const closePopup = useCallback(() => {
    setClickedWord(null);
    setTranslation(null);
    setIsLoading(false);
  }, []);

  const handleSetCallbacks = useCallback((newCallbacks: {
    onWordAdded?: (word: string) => void;
    onDeepAnalysis?: (word: string) => void;
    onAIAnalysisClick?: (word: string) => void;
  }) => {
    setCallbacks(newCallbacks);
  }, []);

  const value = useMemo(() => ({
    clickedWord,
    translation,
    isLoading,
    setClickedWord,
    setTranslation,
    setIsLoading,
    closePopup,
    callbacks,
    setCallbacks: handleSetCallbacks
  }), [clickedWord, translation, isLoading, closePopup, callbacks, handleSetCallbacks]);

  return (
    <ClickableTextContext.Provider value={value}>
      {children}
    </ClickableTextContext.Provider>
  );
};

export const useClickableTextContext = (): ClickableTextContextType => {
  const context = useContext(ClickableTextContext);
  if (!context) {
    throw new Error('useClickableTextContext must be used within a ClickableTextProvider');
  }
  return context;
};