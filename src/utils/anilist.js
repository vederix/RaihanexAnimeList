// In-Memory Cache Store untuk AniList GraphQL Queries
const queryCache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 Menit TTL (Time To Live)

/**
 * Mengambil data dari AniList GraphQL API dengan In-Memory Caching
 * @param {string} query - Query GraphQL AniList
 * @param {object} variables - Variabel parameter query
 * @param {object} options - Opsi caching { bypassCache: boolean, ttl: number }
 * @returns {Promise<object>} data hasil query
 */
export const fetchAniList = async (query, variables = {}, options = {}) => {
  const { bypassCache = false, ttl = DEFAULT_TTL_MS } = options;

  // Generate cache key unik berdasarkan query dan variabel
  const cacheKey = JSON.stringify({ query: query.trim(), variables });
  const now = Date.now();

  // 1. Cek apakah ada data di cache dan belum kedaluwarsa
  if (!bypassCache && queryCache.has(cacheKey)) {
    const cachedEntry = queryCache.get(cacheKey);
    if (now - cachedEntry.timestamp < ttl) {
      return cachedEntry.data;
    }
    // Jika sudah basi, hapus dari memory
    queryCache.delete(cacheKey);
  }

  // 2. Request ke AniList API
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
  });

  const json = await response.json();

  // Tangkap error jika GraphQL gagal
  if (!response.ok) {
    throw new Error(json.errors?.[0]?.message || "Gagal terhubung ke AniList");
  }

  // 3. Simpan ke Cache jika berhasil
  if (json.data) {
    queryCache.set(cacheKey, {
      data: json.data,
      timestamp: now,
    });
  }

  return json.data;
};

/**
 * Membersihkan semua cache memori AniList
 */
export const clearAniListCache = () => {
  queryCache.clear();
};
