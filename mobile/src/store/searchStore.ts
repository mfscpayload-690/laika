import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchState {
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      addRecentSearch: (query: string) => {
        if (!query.trim()) return;
        set((state) => {
          const filtered = state.recentSearches.filter((q) => q.toLowerCase() !== query.toLowerCase());
          return {
            recentSearches: [query, ...filtered].slice(0, 5), // Keep last 5 unique searches
          };
        });
      },
      removeRecentSearch: (query: string) => {
        set((state) => ({
          recentSearches: state.recentSearches.filter((q) => q !== query),
        }));
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'search-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
