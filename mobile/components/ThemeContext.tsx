import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccentName = 'pink' | 'blue' | 'emerald' | 'purple' | 'amber';

export interface AccentColorConfig {
  name: AccentName;
  primary: string;
  subtle: string;
  glow: string;
}

export const ACCENTS: { [key in AccentName]: AccentColorConfig } = {
  pink: { name: 'pink', primary: '#ec4899', subtle: '#ec489915', glow: '#ec489930' },
  blue: { name: 'blue', primary: '#3b82f6', subtle: '#3b82f615', glow: '#3b82f630' },
  emerald: { name: 'emerald', primary: '#10b981', subtle: '#10b98115', glow: '#10b98130' },
  purple: { name: 'purple', primary: '#8b5cf6', subtle: '#8b5cf615', glow: '#8b5cf630' },
  amber: { name: 'amber', primary: '#f59e0b', subtle: '#f59e0b15', glow: '#f59e0b30' },
};

interface ThemeContextProps {
  accent: AccentColorConfig;
  setAccentColor: (name: AccentName) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccent] = useState<AccentColorConfig>(ACCENTS.blue); // Fallback standard blue
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAccent = async () => {
      try {
        const stored = await AsyncStorage.getItem('user_accent_theme');
        if (stored && ACCENTS[stored as AccentName]) {
          setAccent(ACCENTS[stored as AccentName]);
        }
      } catch (e) {
        console.error('Failed to load accent theme', e);
      } finally {
        setLoading(false);
      }
    };
    loadAccent();
  }, []);

  const setAccentColor = async (name: AccentName) => {
    try {
      if (ACCENTS[name]) {
        setAccent(ACCENTS[name]);
        await AsyncStorage.setItem('user_accent_theme', name);
      }
    } catch (e) {
      console.error('Failed to save accent theme', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ accent, setAccentColor, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
