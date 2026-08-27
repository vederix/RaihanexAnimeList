// In-Memory Cache Store untuk AniList GraphQL Queries
const queryCache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 Menit TTL (Time To Live)

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mengambil data dari AniList GraphQL API dengan In-Memory Caching & Auto-Retry 429
 * @param {string} query - Query GraphQL AniList
 * @param {object} variables - Variabel parameter query
 * @param {object} options - Opsi caching { bypassCache: boolean, ttl: number, retryCount: number }
 * @returns {Promise<object>} data hasil query
 */
export const fetchAniList = async (query, variables = {}, options = {}) => {
  const { bypassCache = false, ttl = DEFAULT_TTL_MS, retryCount = 0 } = options;

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

  // Handle 429 Too Many Requests dengan auto-retry
  if (response.status === 429 && retryCount < 2) {
    const headerVal = response.headers.get("Retry-After");
    const retryAfter = headerVal ? parseInt(headerVal, 10) : (retryCount + 1) * 1.5;
    await delay(Math.max(1000, retryAfter * 1000));
    return fetchAniList(query, variables, { ...options, retryCount: retryCount + 1 });
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error("Gagal memproses data respon dari AniList.");
  }

  // Tangkap error jika HTTP status error atau terdapat GraphQL errors
  if (!response.ok || (json.errors && json.errors.length > 0)) {
    const errorMsg = json.errors?.[0]?.message || `Gagal terhubung ke AniList (Status: ${response.status})`;
    throw new Error(errorMsg);
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
