import React from 'react';
import { useBackground } from '@/contexts/BackgroundContext';
import { backgroundThemes } from './background-themes';

export default function BackgroundScene() {
  const { currentTheme } = useBackground();
  const ThemeComponent = backgroundThemes[currentTheme];
  
  return <ThemeComponent />;
}