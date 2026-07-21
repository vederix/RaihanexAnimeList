// Fungsi serbaguna untuk mengambil data dari AniList
export const fetchAniList = async (query, variables = {}) => {
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

  return json.data;
};
