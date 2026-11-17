import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import FilmDetailTemplate from "@/app/components/FilmDetailTemplate";
import { getMovieDetails, searchMovies, TmdbApiError } from "@/lib/tmdb";

function slugifyTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type FilmPageProps = {
  params: Promise<{ id: string }>;
};

async function loadMovie(id: string) {
  if (/^[1-9]\d*$/.test(id)) {
    const movieId = Number(id);
    if (!Number.isSafeInteger(movieId)) notFound();

    try {
      return await getMovieDetails(movieId);
    } catch (error) {
      if (error instanceof TmdbApiError && error.status === 404) notFound();
      throw error;
    }
  }

  const normalizedSlug = slugifyTitle(id);
  if (!normalizedSlug) notFound();

  const searchResults = await searchMovies(id.replace(/_/g, " "));
  const movieMatch = searchResults.find(
    (movie) =>
      slugifyTitle(movie.title) === normalizedSlug ||
      slugifyTitle(movie.originalTitle) === normalizedSlug,
  );

  if (!movieMatch) notFound();

  try {
    return await getMovieDetails(movieMatch.id);
  } catch (error) {
    if (error instanceof TmdbApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: FilmPageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await loadMovie(id);

  return {
    title: `${movie.title} | Film`,
    description: movie.overview || `Details, cast, and trailer for ${movie.title}.`,
  };
}

async function FilmPageContent({ params }: FilmPageProps) {
  const { id } = await params;
  const movie = await loadMovie(id);
  return <FilmDetailTemplate movie={movie} />;
}

function FilmDetailFallback() {
  return (
    <main className="min-h-screen bg-white p-1" aria-busy="true">
      <div className="h-[70vh] min-h-[420px] animate-pulse bg-[#f5f5f5]" />
      <div className="grid min-h-[30vh] gap-8 px-6 py-8 lg:grid-cols-2">
        <div className="h-20 w-2/3 animate-pulse bg-[#f5f5f5]" />
        <div className="h-40 animate-pulse bg-[#f5f5f5]" />
      </div>
      <div className="ml-auto aspect-video w-full animate-pulse bg-[#f5f5f5] lg:w-[55%]" />
    </main>
  );
}

export default function FilmPage({ params }: FilmPageProps) {
  return (
    <Suspense fallback={<FilmDetailFallback />}>
      <FilmPageContent params={params} />
    </Suspense>
  );
}
