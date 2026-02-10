import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ColorPalette } from './theme';

const STORAGE_KEY = '@expo-convex-starter/color-scheme';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  preference: ColorSchemePreference;
  setPreference: (p: ColorSchemePreference) => void;
  resolvedScheme: 'light' | 'dark';
  colors: ColorPalette;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ColorSchemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = useCallback((p: ColorSchemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme ?? 'light') : preference;

  const colors: ColorPalette = resolvedScheme === 'dark' ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, setPreference, resolvedScheme, colors }),
    [preference, setPreference, resolvedScheme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
