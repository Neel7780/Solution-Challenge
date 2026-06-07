import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // Check local storage or default to light
  const savedTheme = localStorage.getItem('theme-mode') as ThemeMode | null;
  const initialMode: ThemeMode = savedTheme || 'light';

  // Apply data-theme attribute on load
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialMode);
  }

  return {
    mode: initialMode,
    toggleTheme: () => set((state) => {
      const newMode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', newMode);
      document.documentElement.setAttribute('data-theme', newMode);
      return { mode: newMode };
    }),
    setTheme: (mode: ThemeMode) => set(() => {
      localStorage.setItem('theme-mode', mode);
      document.documentElement.setAttribute('data-theme', mode);
      return { mode };
    }),
  };
});
