import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, use, useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';

import { deleteItemImage } from './image';
import { languageFor, translate, type StringKey } from './i18n';
import { countryFor, defaultMarketplaces } from './markets';
import type { Item, Settings } from './types';

const KEY = 'flipp:v1';

interface State {
  ready: boolean;
  settings: Settings;
  items: Item[];
}

type Action =
  | { type: 'load'; state: Omit<State, 'ready'> }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'addItem'; item: Item }
  | { type: 'updateItem'; id: string; patch: Partial<Item> }
  | { type: 'removeItem'; id: string };

export function initialSettings(): Settings {
  const locale = getLocales()[0];
  const country = countryFor(locale?.regionCode);
  return {
    onboarded: false,
    language: languageFor(locale?.languageCode),
    country: country.code,
    currency: country.currency,
    marketplaces: defaultMarketplaces(country.code),
    monthlyGoal: null,
    scansCompleted: 0,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      return { ready: true, ...action.state };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'addItem':
      return { ...state, items: [action.item, ...state.items] };
    case 'updateItem':
      return { ...state, items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)) };
    case 'removeItem':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
  }
}

interface StoreValue extends State {
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  updateSettings: (patch: Partial<Settings>) => void;
  addItem: (item: Item) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  removeItem: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { ready: false, settings: initialSettings(), items: [] });

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as Partial<Omit<State, 'ready'>>) : {};
        dispatch({
          type: 'load',
          state: { settings: { ...initialSettings(), ...saved.settings }, items: saved.items ?? [] },
        });
      })
      .catch(() => dispatch({ type: 'load', state: { settings: initialSettings(), items: [] } }));
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ settings: state.settings, items: state.items })).catch(() => {});
  }, [state]);

  const removeItem = useCallback(
    (id: string) => {
      const item = state.items.find((i) => i.id === id);
      if (item) deleteItemImage(item.imageUri);
      dispatch({ type: 'removeItem', id });
    },
    [state.items],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      t: (key, vars) => translate(state.settings.language, key, vars),
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      addItem: (item) => dispatch({ type: 'addItem', item }),
      updateItem: (id, patch) => dispatch({ type: 'updateItem', id, patch }),
      removeItem,
    }),
    [state, removeItem],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): StoreValue {
  const value = use(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}
