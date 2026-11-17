"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TmdbMovie } from "@/lib/tmdb";

type MovieBatch = {
  movies: TmdbMovie[];
  hasMore: boolean;
};

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

type InfiniteMovieGridProps = {
  initialMovies: TmdbMovie[];
  initialHasMore: boolean;
};

function slugifyMovieTitle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const MOVIES_PER_LOAD = 50;
const MAX_BATCH_REQUESTS_PER_LOAD = 4;
const AD_INTERVAL = 20;

function AdSenseSlot() {
  const adRef = useRef<HTMLModElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!adRef.current || initializedRef.current) return;
    initializedRef.current = true;
    (window.adsbygoogle = window.adsbygoogle ?? []).push({});
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-8778681612531498"
      data-ad-slot="3565661630"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTmdbMovie(value: unknown): value is TmdbMovie {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.title === "string" &&
    typeof value.originalTitle === "string" &&
    (value.releaseDate === null || typeof value.releaseDate === "string") &&
    typeof value.overview === "string" &&
    (value.posterUrl === null || typeof value.posterUrl === "string") &&
    (value.backdropUrl === null || typeof value.backdropUrl === "string") &&
    Array.isArray(value.genres) &&
    value.genres.every((genre) => typeof genre === "string")
  );
}

function parseMovieBatch(payload: unknown): MovieBatch {
  if (!isRecord(payload) || !Array.isArray(payload.movies)) {
    throw new Error("The movie list response was invalid.");
  }

  const movies = payload.movies.filter(isTmdbMovie);
  if (
    movies.length !== payload.movies.length ||
    typeof payload.hasMore !== "boolean"
  ) {
    throw new Error("The movie list response was invalid.");
  }

  return { movies, hasMore: payload.hasMore };
}

export default function InfiniteMovieGrid({
  initialMovies,
  initialHasMore,
}: InfiniteMovieGridProps) {
  const [movies, setMovies] = useState(initialMovies);
  const [nextBatch, setNextBatch] = useState(2);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);

    let batchNumber = nextBatch;
    let moreAvailable: boolean = hasMore;
    let batchesFetched = 0;
    const seenIds = new Set(movies.map((movie) => movie.id));
    const moviesToAdd: TmdbMovie[] = [];

    try {
      while (
        moviesToAdd.length < MOVIES_PER_LOAD &&
        moreAvailable &&
        batchesFetched < MAX_BATCH_REQUESTS_PER_LOAD
      ) {
        const response = await fetch(
          `/api/tmdb/popular?batch=${batchNumber}`,
        );
        if (!response.ok) {
          throw new Error(
            `Movie request failed with status ${response.status}.`,
          );
        }

        const batch = parseMovieBatch(await response.json());
        for (const movie of batch.movies) {
          if (seenIds.has(movie.id)) continue;
          seenIds.add(movie.id);
          moviesToAdd.push(movie);
          if (moviesToAdd.length === MOVIES_PER_LOAD) break;
        }

        batchNumber += 1;
        moreAvailable = batch.hasMore;
        batchesFetched += 1;
      }

    } catch (error) {
      console.error("Unable to load more popular movies.", error);
      setLoadError("Could not load more movies.");
    } finally {
      if (moviesToAdd.length > 0) {
        setMovies((currentMovies) => {
          const currentIds = new Set(currentMovies.map((movie) => movie.id));
          return [
            ...currentMovies,
            ...moviesToAdd.filter((movie) => {
              if (currentIds.has(movie.id)) return false;
              currentIds.add(movie.id);
              return true;
            }),
          ];
        });
      }
      setNextBatch(batchNumber);
      setHasMore(moreAvailable);
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, movies, nextBatch]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading || loadError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadError, loadMore]);

  return (
    <div className="grid min-h-screen grid-cols-5 gap-2 bg-white p-2">
      {movies.map((movie, index) => (
        <Fragment key={movie.id}>
          <Link
            href={`/film/${slugifyMovieTitle(movie.title)}`}
            className="block"
          >
            <article>
              <div className="relative  aspect-[4/5] bg-gray-200">
                {movie.posterUrl && (
                  <Image
                    src={movie.posterUrl}
                    alt={`${movie.title} poster`}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover "
                  />
                )}
              </div>
              <div className="flex w-full gap-2 justify-between py-2  tracking-">
                <p
                  role="status"
                  className="truncate  font-semibold text-[#999] text-xs "
                >
                  {movie.title}
                </p>
                <div className="flex gap-2 items-center">
                  <p
                    role="status"
                    className=" truncate font-semibold text-[#999] text-xs "
                  >
                    {movie.genres.length > 0 ? movie.genres[0] : "unknown"}
                  </p>

                  <p
                    role="status"
                    className="  font-semibold  text-[#999] text-xs "
                  >
                    {movie.releaseDate?.slice(0, 4) ?? "TBA"}
                  </p>
                </div>
              </div>
            </article>
          </Link>
          {(index + 1) % AD_INTERVAL === 0 && (
            <aside
              aria-label="Advertisement"
              data-after-movies={index + 1}
              className="col-span-2 block md:col-span-1"
            >
              <div className="relative aspect-[4/5] bg-gray-200 overflow-hidden">
            <AdSenseSlot /></div>
              <p className="truncate py-2 text-xs font-semibold text-[#999]">
                Advertisement
              </p>
            </aside>
          )}
        </Fragment>
      ))}

      {loadError && (
        <div className="flex flex-col py-4 text-center" role="alert">
          <p className="text-xs max-w-md font-semibold text-red-700">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="mt-2 max-w-md cursor-pointer font-semibold p-1 text-xs bg-black rounded text-white"
          >
            Try again
          </button>
        </div>
      )}
      {isLoading && (
        <div
          className="col-span-full flex justify-center gap-2 py-4"
          role="status"
          aria-label="Loading more movies"
        >
          <span className="sr-only">Loading more movies...</span>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              aria-hidden="true"
              className="h-2 w-2 animate-bounce rounded-full bg-[#171717]"
              style={{ animationDelay: `${index * 150}ms` }}
            />
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="col-span-full h-1" aria-hidden="true" />
    </div>
  );
}
