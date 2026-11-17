const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
export const POPULAR_MOVIES_BATCH_SIZE = 50;
export const MAX_POPULAR_MOVIE_BATCH = 200;
const TMDB_MOVIES_PER_PAGE = 20;
const MOVIES_PER_SOURCE_BATCH = POPULAR_MOVIES_BATCH_SIZE;
const MOVIE_GENRES_BY_ID: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
   878: "Science Fiction",
   9648: "Mystery",
   10402: "Music",
   10749: "Romance",
   10751: "Family",
   10752: "War",
   10770: "TV Movie",
};

export class TmdbApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TmdbApiError";
  }
}

export type TmdbMovie = {
  id: number;
  title: string;
  originalTitle: string;
  releaseDate: string | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number | null;
  genres: string[];
};

export type TmdbMovieDetails = TmdbMovie & {
  runtime: number | null;
  certification: string | null;
  director: string | null;
  cast: string[];
  genres: string[];
  watchProviders: TmdbWatchProvider[];
  youtubeTrailerKey: string | null;
  youtubeSecondaryVideoKey: string | null;
};

export type TmdbWatchProvider = {
  id: number;
  name: string;
  logoUrl: string;
};

export type TmdbLogo = {
  language: string | null;
  filePath: string;
  url: string;
  width: number;
  height: number;
  voteAverage: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new TmdbApiError(`TMDB returned an invalid ${field}.`, 502);
  }
  return value;
}

async function tmdbRequest(path: string): Promise<unknown> {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) {
    throw new TmdbApiError(
      "TMDB_API_READ_ACCESS_TOKEN is not configured.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${TMDB_API_BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 3600 },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new TmdbApiError("Unable to reach TMDB.", 502);
    }
    throw error;
  }

  if (!response.ok) {
    const status = response.status === 404 ? 404 : 502;
    throw new TmdbApiError("TMDB request failed.", status);
  }

  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TmdbApiError("TMDB returned invalid JSON.", 502);
    }
    throw error;
  }
}

function tmdbImageUrl(path: string | null, size: "w500" | "original") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}

function getNullableNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TmdbApiError(`TMDB returned an invalid ${field}.`, 502);
  }
  return value;
}

function roundToTwoDecimals(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100) / 100;
}

function parseMovies(payload: unknown, limit: number): TmdbMovie[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new TmdbApiError("TMDB returned an invalid movie search response.", 502);
  }

  return payload.results.slice(0, limit).map((result): TmdbMovie => {
    if (
      !isRecord(result) ||
      typeof result.id !== "number" ||
      typeof result.title !== "string" ||
      typeof result.original_title !== "string" ||
      typeof result.overview !== "string"
    ) {
      throw new TmdbApiError("TMDB returned an invalid movie result.", 502);
    }

    return {
      id: result.id,
      title: result.title,
      originalTitle: result.original_title,
      releaseDate: getNullableString(result.release_date, "release date"),
      overview: result.overview,
      posterUrl: tmdbImageUrl(
        getNullableString(result.poster_path, "poster path"),
        "w500",
      ),
      backdropUrl: tmdbImageUrl(
        getNullableString(result.backdrop_path, "backdrop path"),
        "w500",
      ),
      rating: roundToTwoDecimals(
        getNullableNumber(result.vote_average, "rating"),
      ),
      genres: Array.isArray(result.genre_ids)
        ? result.genre_ids.flatMap((id) =>
            typeof id === "number" && MOVIE_GENRES_BY_ID[id]
              ? [MOVIE_GENRES_BY_ID[id]]
              : [],
          )
        : [],
    };
  });
}

export async function searchMovies(query: string): Promise<TmdbMovie[]> {
  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "en-US",
  });
  const payload = await tmdbRequest(`/search/movie?${params}`);

  return parseMovies(payload, 10);
}

type MovieCategory = "popular" | "upcoming";

type TmdbMoviePage = {
  movies: TmdbMovie[];
  totalPages: number;
  totalResults: number;
};

async function getMoviePage(
  category: MovieCategory,
  page: number,
): Promise<TmdbMoviePage> {
  const params = new URLSearchParams({
    language: "en-US",
    page: String(page),
  });
  const payload = await tmdbRequest(`/movie/${category}?${params}`);
  if (
    !isRecord(payload) ||
    typeof payload.total_pages !== "number" ||
    !Number.isInteger(payload.total_pages) ||
    typeof payload.total_results !== "number" ||
    !Number.isInteger(payload.total_results)
  ) {
    throw new TmdbApiError("TMDB returned invalid movie pagination data.", 502);
  }

  return {
    movies: parseMovies(payload, TMDB_MOVIES_PER_PAGE),
    totalPages: Math.min(payload.total_pages, 500),
    totalResults: payload.total_results,
  };
}

async function getMovieWindow(
  category: MovieCategory,
  offset: number,
  limit: number,
): Promise<{ movies: TmdbMovie[]; hasMore: boolean }> {
  const firstPageData = await getMoviePage(category, 1);
  const firstPage = Math.floor(offset / TMDB_MOVIES_PER_PAGE) + 1;
  if (offset >= firstPageData.totalResults || firstPage > firstPageData.totalPages) {
    return { movies: [], hasMore: false };
  }

  const offsetInFirstPage = offset % TMDB_MOVIES_PER_PAGE;
  const pagesToFetch = Math.ceil(
    (offsetInFirstPage + limit) / TMDB_MOVIES_PER_PAGE,
  );
  const pages = await Promise.all(
    Array.from(
      { length: Math.min(pagesToFetch, firstPageData.totalPages - firstPage + 1) },
      (_, index) => {
        const page = firstPage + index;
        return page === 1
          ? Promise.resolve(firstPageData)
          : getMoviePage(category, page);
      },
    ),
  );
  const movies = pages
    .flatMap((page) => page.movies)
    .slice(offsetInFirstPage, offsetInFirstPage + limit);

  return {
    movies,
    hasMore: offset + movies.length < firstPageData.totalResults,
  };
}

function mixMovies(
  popularMovies: TmdbMovie[],
  upcomingMovies: TmdbMovie[],
): TmdbMovie[] {
  const movies: TmdbMovie[] = [];
  const seenIds = new Set<number>();
  const maxLength = Math.max(popularMovies.length, upcomingMovies.length);

  for (let index = 0; index < maxLength && movies.length < POPULAR_MOVIES_BATCH_SIZE; index++) {
    for (const movie of [popularMovies[index], upcomingMovies[index]]) {
      if (movies.length >= POPULAR_MOVIES_BATCH_SIZE) break;
      if (!movie || seenIds.has(movie.id)) continue;
      seenIds.add(movie.id);
      movies.push(movie);
    }
  }

  return movies;
}

export async function getMovieFeedBatch(batch = 1): Promise<{
  movies: TmdbMovie[];
  hasMore: boolean;
}> {
  if (!Number.isSafeInteger(batch) || batch < 1) {
    throw new RangeError("Movie batch must be a positive integer.");
  }
  if (batch > MAX_POPULAR_MOVIE_BATCH) {
    return { movies: [], hasMore: false };
  }

  const offset = (batch - 1) * MOVIES_PER_SOURCE_BATCH;
  const [popular, upcoming] = await Promise.all([
    getMovieWindow("popular", offset, MOVIES_PER_SOURCE_BATCH),
    getMovieWindow("upcoming", offset, MOVIES_PER_SOURCE_BATCH),
  ]);
  const movies = mixMovies(popular.movies, upcoming.movies);

  return {
    movies,
    hasMore:
      batch < MAX_POPULAR_MOVIE_BATCH && (popular.hasMore || upcoming.hasMore),
  };
}

export async function getMovieDetails(
  movieId: number,
): Promise<TmdbMovieDetails> {
  const params = new URLSearchParams({
    language: "en-US",
    append_to_response: "credits,videos,release_dates",
  });
  const [payload, watchProvidersPayload] = await Promise.all([
    tmdbRequest(`/movie/${movieId}?${params}`),
    tmdbRequest(`/movie/${movieId}/watch/providers`),
  ]);
  const movie = parseMovies({ results: [payload] }, 1)[0];

  if (!movie || !isRecord(payload)) {
    throw new TmdbApiError("TMDB returned an invalid movie response.", 502);
  }

  if (
    !isRecord(watchProvidersPayload) ||
    !isRecord(watchProvidersPayload.results)
  ) {
    throw new TmdbApiError("TMDB returned an invalid watch providers response.", 502);
  }
  const usWatchProviders = watchProvidersPayload.results.US;
  const watchProvidersById = new Map<number, TmdbWatchProvider>();
  if (isRecord(usWatchProviders)) {
    for (const offerType of ["flatrate", "rent", "buy"] as const) {
      const providers = usWatchProviders[offerType];
      if (!Array.isArray(providers)) continue;

      for (const provider of providers) {
        if (
          !isRecord(provider) ||
          typeof provider.provider_id !== "number" ||
          typeof provider.provider_name !== "string"
        ) {
          throw new TmdbApiError(
            "TMDB returned an invalid watch provider.",
            502,
          );
        }

        const logoPath = getNullableString(provider.logo_path, "provider logo path");
        if (!logoPath) continue;

        watchProvidersById.set(provider.provider_id, {
          id: provider.provider_id,
          name: provider.provider_name,
          logoUrl: `${TMDB_IMAGE_BASE_URL}/w500${logoPath}`,
        });
      }
    }
  }

  const credits = isRecord(payload.credits) ? payload.credits : null;
  const crew = credits && Array.isArray(credits.crew) ? credits.crew : [];
  const cast = credits && Array.isArray(credits.cast) ? credits.cast : [];
  const director =
    crew.find(
      (member) =>
        isRecord(member) &&
        member.job === "Director" &&
        typeof member.name === "string",
    );

  const releaseDates = isRecord(payload.release_dates)
    ? payload.release_dates.results
    : null;
  const releaseCountries = Array.isArray(releaseDates) ? releaseDates : [];
  const usReleases = releaseCountries.find(
    (country) => isRecord(country) && country.iso_3166_1 === "US",
  );
  const releaseEntries =
    isRecord(usReleases) && Array.isArray(usReleases.release_dates)
      ? usReleases.release_dates
      : releaseCountries.flatMap((country) =>
          isRecord(country) && Array.isArray(country.release_dates)
            ? country.release_dates
            : [],
        );
  const certification = releaseEntries.find(
    (release) =>
      isRecord(release) &&
      typeof release.certification === "string" &&
      release.certification.length > 0,
  );

  const genres = Array.isArray(payload.genres) ? payload.genres : [];
  const videos = isRecord(payload.videos) ? payload.videos.results : null;
  const videoResults = Array.isArray(videos) ? videos : [];
  const youtubeVideos = videoResults.filter(
    (video): video is Record<string, unknown> =>
      isRecord(video) &&
      video.site === "YouTube" &&
      typeof video.key === "string",
  );
  const primaryVideo =
    youtubeVideos.find(
      (video) => video.type === "Trailer" && video.official === true,
    ) ??
    youtubeVideos.find((video) => video.type === "Trailer") ??
    youtubeVideos[0];
  const secondaryVideo =
    youtubeVideos.find(
      (video) =>
        video.key !== primaryVideo?.key &&
        ["Teaser", "Clip", "Featurette"].includes(
          typeof video.type === "string" ? video.type : "",
        ),
    ) ??
    youtubeVideos.find((video) => video.key !== primaryVideo?.key);

  return {
    ...movie,
    runtime:
      typeof payload.runtime === "number" && payload.runtime > 0
        ? payload.runtime
        : null,
    certification:
      isRecord(certification) && typeof certification.certification === "string"
        ? certification.certification
        : null,
    director:
      isRecord(director) && typeof director.name === "string"
        ? director.name
        : null,
    cast: cast
      .flatMap((member) =>
        isRecord(member) && typeof member.name === "string"
          ? [member.name]
          : [],
      )
      .slice(0, 4),
    genres: genres
      .flatMap((genre) =>
        isRecord(genre) && typeof genre.name === "string" ? [genre.name] : [],
      )
      .slice(0, 5),
    watchProviders: [...watchProvidersById.values()],
    youtubeTrailerKey:
      primaryVideo && typeof primaryVideo.key === "string"
        ? primaryVideo.key
        : null,
    youtubeSecondaryVideoKey:
      secondaryVideo && typeof secondaryVideo.key === "string"
        ? secondaryVideo.key
        : null,
  };
}

export async function getMovieLogos(movieId: number): Promise<TmdbLogo[]> {
  const params = new URLSearchParams({ include_image_language: "en,null" });
  const payload = await tmdbRequest(
    `/movie/${movieId}/images?${params.toString()}`,
  );

  if (!isRecord(payload) || !Array.isArray(payload.logos)) {
    throw new TmdbApiError("TMDB returned an invalid movie images response.", 502);
  }

  return payload.logos.map((logo): TmdbLogo => {
    if (
      !isRecord(logo) ||
      typeof logo.width !== "number" ||
      typeof logo.height !== "number" ||
      typeof logo.vote_average !== "number"
    ) {
      throw new TmdbApiError("TMDB returned an invalid logo result.", 502);
    }

    const filePath = getNullableString(logo.file_path, "logo path");
    if (!filePath) {
      throw new TmdbApiError("TMDB returned a logo without an image path.", 502);
    }

    return {
      language: getNullableString(logo.iso_639_1, "logo language"),
      filePath,
      url: `${TMDB_IMAGE_BASE_URL}/original${filePath}`,
      width: logo.width,
      height: logo.height,
      voteAverage: logo.vote_average,
    };
  });
}

export function tmdbErrorResponse(error: unknown): Response {
  if (error instanceof TmdbApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
