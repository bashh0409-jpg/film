"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type MovieResult = {
  id: number;
  title: string;
};

type MovieLogo = {
  language: string | null;
  url: string;
  width: number;
  height: number;
  voteAverage: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMovieResult(value: unknown): value is MovieResult {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.title === "string"
  );
}

function isMovieLogo(value: unknown): value is MovieLogo {
  return (
    isRecord(value) &&
    (typeof value.language === "string" || value.language === null) &&
    typeof value.url === "string" &&
    typeof value.width === "number" &&
    value.width > 0 &&
    typeof value.height === "number" &&
    value.height > 0 &&
    typeof value.voteAverage === "number"
  );
}

function getApiError(payload: unknown, fallback: string): string {
  return isRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

const TmdbLogoExample = ({ query }: { query: string }) => {
  const [logo, setLogo] = useState<MovieLogo | null>(null);
  const [message, setMessage] = useState("...");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadLogo = async () => {
      try {
        const searchResponse = await fetch(
          `/api/tmdb/search?query=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const searchPayload: unknown = await searchResponse.json();
        if (!searchResponse.ok) {
          throw new Error(getApiError(searchPayload, "TMDB search failed."));
        }
        if (
          !isRecord(searchPayload) ||
          !Array.isArray(searchPayload.results) ||
          !searchPayload.results.every(isMovieResult)
        ) {
          throw new Error("TMDB returned an invalid movie search response.");
        }

        const movies = searchPayload.results as MovieResult[];
        const movie =
          movies.find(
            (result) => result.title.toLowerCase() === query.toLowerCase(),
          ) ?? movies[0];
        if (!movie) {
          setMessage(`No TMDB movie found for "${query}".`);
          return;
        }

        const logosResponse = await fetch(
          `/api/tmdb/logos?movieId=${movie.id}`,
          { signal: controller.signal },
        );
        const logosPayload: unknown = await logosResponse.json();
        if (!logosResponse.ok) {
          throw new Error(getApiError(logosPayload, "TMDB logo lookup failed."));
        }
        if (
          !isRecord(logosPayload) ||
          !Array.isArray(logosPayload.logos) ||
          !logosPayload.logos.every(isMovieLogo)
        ) {
          throw new Error("TMDB returned an invalid logo response.");
        }

        const logos = logosPayload.logos as MovieLogo[];
        const rankedLogos = [...logos].sort(
          (first, second) => second.voteAverage - first.voteAverage,
        );
        const selectedLogo =
          rankedLogos.find((candidate) => candidate.language === "en") ??
          rankedLogos.find((candidate) => candidate.language === null) ??
          rankedLogos[0];

        if (!selectedLogo) {
          setMessage(`No TMDB logo found for "${movie.title}".`);
          return;
        }

        setLogo(selectedLogo);
        setImageFailed(false);
        setMessage("");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Unable to load the TMDB logo example.", error);
        setMessage(
          error instanceof Error ? error.message : "Unable to load the logo.",
        );
      }
    };

    void loadLogo();
    return () => controller.abort();
  }, [query]);

  if (!logo || imageFailed) {
    return (
      <p role="status" className="max-w-30  font-semibold text-[#999] mt-2 text-xs text-[#777]">
        {imageFailed ? "TMDB logo image failed to load." : message}
      </p>
    );
  }

  return (
    <div className="w-fit max-w-48  self-start bg-[#171717] px-3 py-2">
      <Image
        src={logo.url}
        alt={`${query} movie logo`}
        width={logo.width}
        height={logo.height}
        sizes="(min-width: 1024px) 15vw, 40vw"
        className="h-auto max-h-5 w-full object-contain object-left"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
};

export default TmdbLogoExample;
