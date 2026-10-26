import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F7F4',
  card: '#FFFFFF',
  text: '#0F1A12',
  muted: '#5E6B62',
  border: '#E3E7E1',
  brand: '#12B76A',
  brandText: '#FFFFFF',
  brandSoft: '#DDF7EA',
  danger: '#D92D20',
  warn: '#B54708',
};

const dark: typeof light = {
  bg: '#0B0F0C',
  card: '#151B17',
  text: '#F1F5F2',
  muted: '#9AA79F',
  border: '#26302A',
  brand: '#2BD486',
  brandText: '#06130B',
  brandSoft: '#123222',
  danger: '#F97066',
  warn: '#FDB022',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
