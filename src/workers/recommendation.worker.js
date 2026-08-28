self.onmessage = function (e) {
  try {
    const { genreData } = e.data || {};

    if (!genreData || !genreData.Page || !Array.isArray(genreData.Page.media)) {
      self.postMessage({ sortedGenres: [] });
      return;
    }

    const genreCounts = {};

    // Hitung frekuensi genre secara aman
    genreData.Page.media.forEach((anime) => {
      if (anime && Array.isArray(anime.genres)) {
        anime.genres.forEach((genre) => {
          if (genre && typeof genre === "string") {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          }
        });
      }
    });

    // Urutkan dan ambil top 2 genre dominan
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map((entry) => entry[0]);

    self.postMessage({ sortedGenres });
  } catch (err) {
    self.postMessage({
      sortedGenres: [],
      error: err?.message || "Gagal memproses rekomendasi genre",
    });
  }
};
