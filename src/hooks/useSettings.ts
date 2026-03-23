import { useState, useEffect } from 'react';

type Settings = {
  webgpu: boolean;
  showFps: boolean;
};

const defaultSettings: Settings = {
  webgpu: false,
  showFps: false,
};

let settings: Settings = { ...defaultSettings };
const listeners = new Set<(settings: Settings) => void>();

export function getSettings() {
  return settings;
}

export function updateSettings(newSettings: Partial<Settings>) {
  settings = { ...settings, ...newSettings };
  listeners.forEach((listener) => listener(settings));
}

export function useSettings() {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  useEffect(() => {
    listeners.add(setLocalSettings);
    return () => {
      listeners.delete(setLocalSettings);
    };
  }, []);

  return { settings: localSettings, updateSettings };
}
