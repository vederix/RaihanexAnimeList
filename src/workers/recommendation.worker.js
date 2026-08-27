self.onmessage = function (e) {
  const { genreData } = e.data;
  
  if (!genreData || !genreData.Page || !genreData.Page.media) {
    self.postMessage({ sortedGenres: [] });
    return;
  }

  const genreCounts = {};

  // Count genres
  genreData.Page.media.forEach((anime) => {
    if (anime.genres) {
      anime.genres.forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });

  // Sort and pick top 2
  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map((entry) => entry[0]);

  self.postMessage({ sortedGenres });
};
