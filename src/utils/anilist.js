// Bounded In-Memory LRU Cache Store untuk AniList GraphQL Queries
const MAX_CACHE_ENTRIES = 150; // Batas memori maksimum entri cache
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 Menit TTL (Time To Live)

const queryCache = new Map();
const inFlightRequests = new Map(); // Deduplikasi request yang sedang berlangsung

/**
 * Helper delay yang mendukung pembatalan via AbortSignal
 */
const delay = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Aborted", "AbortError"));
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });

/**
 * Mengambil data dari cache dengan evaluasi TTL dan pembaruan urutan LRU
 */
function getFromCache(key, ttl) {
  if (!queryCache.has(key)) return null;
  const entry = queryCache.get(key);
  const now = Date.now();

  // Cek masa berlaku (TTL)
  if (now - entry.timestamp > (ttl || DEFAULT_TTL_MS)) {
    queryCache.delete(key);
    return null;
  }

  // Refresh posisi LRU: hapus dan masukkan kembali agar berada di urutan paling akhir
  queryCache.delete(key);
  queryCache.set(key, entry);
  return entry.data;
}

/**
 * Menyimpan data ke cache dengan pembatasan ukuran LRU maksimum
 */
function setInCache(key, data, ttl) {
  if (!key || data === undefined || data === null) return;

  if (queryCache.has(key)) {
    queryCache.delete(key);
  } else if (queryCache.size >= MAX_CACHE_ENTRIES) {
    // Buang entri paling awal (least recently used)
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey !== undefined) {
      queryCache.delete(oldestKey);
    }
  }

  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttl || DEFAULT_TTL_MS,
  });
}

/**
 * Eksekusi internal fetch ke AniList GraphQL API
 */
const executeAniListFetch = async (query, variables, options) => {
  const { bypassCache = false, ttl = DEFAULT_TTL_MS, retryCount = 0, signal } = options;

  if (!query || typeof query !== "string") {
    return { data: null, error: "Query GraphQL tidak valid." };
  }

  // Generate cache key unik berdasarkan query dan variabel
  let cacheKey;
  try {
    cacheKey = JSON.stringify({ query: query.trim(), variables: variables || {} });
  } catch {
    cacheKey = `${query.trim()}_${String(variables)}`;
  }

  // 1. Cek Cache (jika tidak dibypass)
  if (!bypassCache) {
    const cachedData = getFromCache(cacheKey, ttl);
    if (cachedData !== null) {
      return { data: cachedData, error: null };
    }
  }

  try {
    // 2. Request ke AniList API dengan proteksi signal & network try-catch
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
      signal: signal,
    });

    // Handle 429 Too Many Requests dengan auto-retry
    if (response.status === 429 && retryCount < 2) {
      const headerVal = response.headers.get("Retry-After");
      const parsedSec = headerVal ? parseInt(headerVal, 10) : NaN;
      const retryAfterSec = !isNaN(parsedSec) && parsedSec > 0 ? parsedSec : (retryCount + 1) * 1.5;

      await delay(Math.max(1000, retryAfterSec * 1000), signal);
      return executeAniListFetch(query, variables, {
        ...options,
        retryCount: retryCount + 1,
      });
    }

    let json;
    try {
      json = await response.json();
    } catch {
      return { data: null, error: "Gagal memproses data respon dari AniList." };
    }

    // Tangkap error jika HTTP status error atau terdapat GraphQL errors
    if (!response.ok || (json.errors && json.errors.length > 0)) {
      const errorMsg =
        json.errors?.[0]?.message ||
        `Gagal terhubung ke AniList (Status: ${response.status})`;
      return { data: null, error: errorMsg };
    }

    // 3. Simpan ke Cache jika berhasil
    if (json.data) {
      setInCache(cacheKey, json.data, ttl);
    }

    return { data: json.data, error: null };
  } catch (err) {
    if (err?.name === "AbortError" || signal?.aborted) {
      return { data: null, error: "Request dibatalkan.", isAborted: true };
    }
    console.warn("AniList network request failed:", err?.message || err);
    return {
      data: null,
      error: err?.message || "Gagal menghubungi server AniList. Periksa koneksi internet.",
    };
  }
};

/**
 * Mengambil data dari AniList GraphQL API dengan Bounded LRU Cache, Auto-Retry 429, & Request Deduplication
 * @param {string} query - Query GraphQL AniList
 * @param {object} [variables={}] - Variabel parameter query
 * @param {object} [options={}] - Opsi caching { bypassCache: boolean, ttl: number, retryCount: number, signal: AbortSignal }
 * @returns {Promise<{data: object|null, error: string|null, isAborted?: boolean}>} data hasil query dan error
 */
export const fetchAniList = (query, variables = {}, options = {}) => {
  // Hanya deduplikasi request baca jika tidak ada bypassCache dan bukan mutation/retry
  const { bypassCache = false, retryCount = 0 } = options;
  if (!bypassCache && retryCount === 0) {
    let reqKey;
    try {
      reqKey = JSON.stringify({ query: query?.trim(), variables: variables || {} });
    } catch {
      reqKey = `${query}_${String(variables)}`;
    }

    if (inFlightRequests.has(reqKey)) {
      return inFlightRequests.get(reqKey);
    }

    const fetchPromise = executeAniListFetch(query, variables, options).finally(() => {
      inFlightRequests.delete(reqKey);
    });

    inFlightRequests.set(reqKey, fetchPromise);
    return fetchPromise;
  }

  return executeAniListFetch(query, variables, options);
};

/**
 * Membersihkan semua cache memori AniList dan in-flight requests
 */
export const clearAniListCache = () => {
  queryCache.clear();
  inFlightRequests.clear();
};
