"use client";

import { useState, useEffect } from "react";

const FAVORITES_STORAGE_KEY = "openpdf_favorite_tools";
const DEFAULT_FAVORITES = ["photo-enhancer", "merge-pdf", "compress-pdf", "word-to-pdf"];

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      } else {
        setFavorites(DEFAULT_FAVORITES);
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(DEFAULT_FAVORITES));
      }
    } catch {
      setFavorites(DEFAULT_FAVORITES);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const toggleFavorite = (toolId: string) => {
    setFavorites((prev) => {
      let updated: string[];
      if (prev.includes(toolId)) {
        updated = prev.filter((id) => id !== toolId);
      } else {
        updated = [...prev, toolId];
      }
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const isFavorite = (toolId: string) => favorites.includes(toolId);

  return { favorites, toggleFavorite, isFavorite, isLoaded };
}
