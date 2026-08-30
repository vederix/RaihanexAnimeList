import { useState, useEffect } from "react";
import { fetchAniList } from "./anilist";

// ============================================================================
// Genre Service Layer — Single Source of Truth untuk Seluruh Genre AniList
// ============================================================================

/**
 * GraphQL Query untuk mengambil seluruh koleksi genre resmi dari AniList API
 * Endpoint: https://graphql.anilist.co
 * Docs: https://anilist.github.io/ApiV2-GraphQL-Docs/
 */
const GENRE_COLLECTION_QUERY = `
  query {
    GenreCollection
  }
`;

// ── LocalStorage Cache Config ──
const CACHE_KEY = "raihanex_genres";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

/**
 * Fallback data lengkap genre resmi AniList (per Agustus 2026)
 * Digunakan HANYA ketika API gagal DAN tidak ada cache tersimpan
 */
const FALLBACK_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

// ── In-Memory Singleton Cache ──
// Mencegah multiple komponen memicu fetch paralel yang redundan
let memoryCache = null;
let fetchPromise = null;

/**
 * Membaca genre dari localStorage cache
 * @returns {string[]|null} Array genre jika cache valid, null jika expired/tidak ada
 */
function readFromLocalStorage() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.genres || !Array.isArray(parsed.genres) || !parsed.timestamp) {
      return null;
    }

    // Cek TTL
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      return null; // Expired, tapi data tetap bisa dipakai sebagai stale fallback
    }

    return parsed.genres;
  } catch {
    return null;
  }
}

/**
 * Membaca genre stale dari localStorage (tanpa cek TTL)
 * Digunakan sebagai fallback saat API gagal
 * @returns {string[]|null}
 */
function readStaleFromLocalStorage() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.genres || !Array.isArray(parsed.genres)) return null;
    return parsed.genres;
  } catch {
    return null;
  }
}

/**
 * Menyimpan genre ke localStorage cache
 * @param {string[]} genres
 */
function writeToLocalStorage(genres) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        genres,
        timestamp: Date.now(),
      })
    );
  } catch {
    // localStorage penuh atau tidak tersedia — abaikan tanpa crash
    console.warn("genreService: Gagal menulis ke localStorage.");
  }
}

/**
 * Mengambil seluruh koleksi genre dari AniList API dengan strategi caching berlapis:
 * 1. In-memory cache (instant, selama tab hidup)
 * 2. localStorage cache (TTL 24 jam, persisten antar sesi)
 * 3. API fetch (jika cache expired)
 * 4. Stale localStorage (jika API gagal, data lama masih ada)
 * 5. Hardcoded FALLBACK_GENRES (jika semua gagal)
 *
 * @returns {Promise<string[]>} Array genre yang sudah disortir alfabetis
 */
export async function fetchGenreCollection() {
  // 1. In-memory cache — paling cepat
  if (memoryCache) return memoryCache;

  // 2. localStorage cache valid
  const cached = readFromLocalStorage();
  if (cached && cached.length > 0) {
    memoryCache = cached;
    return cached;
  }

  // 3. Deduplikasi — jika sudah ada fetch yang berjalan, tunggu hasilnya
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data, error } = await fetchAniList(
        GENRE_COLLECTION_QUERY,
        {},
        { ttl: CACHE_TTL_MS }
      );

      if (error || !data?.GenreCollection) {
        throw new Error(error || "GenreCollection kosong.");
      }

      // Filter string kosong dan sortir alfabetis
      const genres = data.GenreCollection
        .filter((g) => typeof g === "string" && g.trim() !== "")
        .sort((a, b) => a.localeCompare(b));

      if (genres.length === 0) {
        throw new Error("GenreCollection return array kosong.");
      }

      // Simpan ke semua layer cache
      memoryCache = genres;
      writeToLocalStorage(genres);

      return genres;
    } catch (err) {
      console.warn("genreService: Gagal fetch dari AniList API —", err?.message);

      // 4. Fallback ke stale localStorage (data lama meskipun expired)
      const stale = readStaleFromLocalStorage();
      if (stale && stale.length > 0) {
        memoryCache = stale;
        return stale;
      }

      // 5. Fallback terakhir — hardcoded
      memoryCache = FALLBACK_GENRES;
      return FALLBACK_GENRES;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Custom React Hook — mengekspos genre dan loading state
 * Aman dipanggil dari komponen manapun tanpa duplikasi request
 *
 * @returns {{ genres: string[], isLoading: boolean }}
 *
 * @example
 * const { genres, isLoading } = useGenres();
 * // genres = ["Action", "Adventure", "Comedy", ...]
 */
export function useGenres() {
  const [genres, setGenres] = useState(() => {
    // Inisialisasi sinkron dari memory/localStorage agar tidak flash kosong
    if (memoryCache) return memoryCache;
    const cached = readFromLocalStorage();
    if (cached && cached.length > 0) {
      memoryCache = cached;
      return cached;
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(() => genres.length === 0);

  useEffect(() => {
    let isCancelled = false;

    // Skip fetch jika sudah punya data dari inisialisasi sinkron
    if (genres.length > 0) {
      setIsLoading(false);

      // Tetap lakukan background refresh jika cache mungkin sudah expired
      const cached = readFromLocalStorage();
      if (cached) return; // Cache masih valid, skip sepenuhnya

      // Cache expired — refresh di background tanpa block UI
      fetchGenreCollection().then((freshGenres) => {
        if (!isCancelled && freshGenres.length > 0) {
          setGenres(freshGenres);
        }
      });
      return () => { isCancelled = true; };
    }

    // Belum ada data — fetch dengan loading state
    fetchGenreCollection()
      .then((result) => {
        if (!isCancelled) {
          setGenres(result);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { genres, isLoading };
}
