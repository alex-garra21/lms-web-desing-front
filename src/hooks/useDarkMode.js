"use client";

import { useSyncExternalStore, useCallback, useEffect } from 'react';

const THEME_STORAGE_KEY = 'lms-theme';

// Helper para detectar cliente
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshotClient = () => false;

function getSystemDark() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function getThemeSnapshot() {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return getSystemDark() ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function getServerThemeSnapshot() {
  return 'light';
}

function subscribeTheme(callback) {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('storage', callback);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => callback();

  if (media.addEventListener) {
    media.addEventListener('change', handleMediaChange);
  } else {
    media.addListener(handleMediaChange);
  }

  return () => {
    window.removeEventListener('storage', callback);
    if (media.removeEventListener) {
      media.removeEventListener('change', handleMediaChange);
    } else {
      media.removeListener(handleMediaChange);
    }
  };
}

/**
 * Hook de React para alternar y persistir el tema oscuro/claro del LMS UMG.
 * Utiliza useSyncExternalStore para una sincronización reactiva limpia sin efectos en cascada,
 * cumpliendo estrictamente con las directrices de AGENTS.md y React 19.
 */
export function useDarkMode() {
  const currentTheme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshotClient
  );

  const isDark = currentTheme === 'dark';

  // Sincronizar la clase 'dark' en el documento cuando cambia el tema
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const setDarkMode = useCallback((value) => {
    if (typeof window === 'undefined') return;
    let nextTheme;
    if (typeof value === 'boolean') {
      nextTheme = value ? 'dark' : 'light';
    } else if (value === 'system') {
      nextTheme = getSystemDark() ? 'dark' : 'light';
    } else {
      nextTheme = value === 'dark' ? 'dark' : 'light';
    }

    try {
      if (value === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }
      // Notificar suscriptores en la ventana actual
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Ignorar si localStorage está restringido
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const enableDarkMode = useCallback(() => {
    setDarkMode('dark');
  }, [setDarkMode]);

  const disableDarkMode = useCallback(() => {
    setDarkMode('light');
  }, [setDarkMode]);

  return {
    isDark,
    theme: currentTheme,
    toggleDarkMode,
    setDarkMode,
    enableDarkMode,
    disableDarkMode,
    mounted,
  };
}

export default useDarkMode;
