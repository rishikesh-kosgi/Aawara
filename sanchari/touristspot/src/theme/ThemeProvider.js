import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from './index';

const THEME_STORAGE_KEY = 'app_theme_mode';

const ThemeContext = createContext({
  mode: 'dark',
  colors: darkColors,
  isDark: true,
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(saved => {
        if (saved === 'dark' || saved === 'light') {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = async nextMode => {
    const normalized = nextMode === 'dark' ? 'dark' : 'light';
    setModeState(normalized);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (error) {}
  };

  const value = useMemo(() => ({
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    isDark: mode === 'dark',
    setMode,
    toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark'),
  }), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
