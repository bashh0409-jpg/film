import {
  Hourglass,
  Astroid,
  Lock,
  Play,
  Share,
  Megaphone,
  
  MonitorSpeaker,
  MonitorCog,
} from "lucide-react";
import Image from "next/image";
import { FaAmazon } from "react-icons/fa";
import {
  SiAppletv,
  SiFandango,
  SiGoogleplay,
  SiPlex,
  SiVerizon,
  SiYoutube,
  SiNetflix,
} from "react-icons/si";
import type { IconType } from "react-icons";
import HeroVideo from "./HeroVideo";
import TmdbLogoExample from "./TmdbLogoExample";
import { getYouTubeEmbedUrl } from "./youtube";
import type { TmdbMovieDetails } from "@/lib/tmdb";

type FilmDetailTemplateProps = {
  movie: TmdbMovieDetails;
  heroVideoSrc?: string;
  trailerVideoSrc?: string;
};

function getProviderIcon(name: string): IconType | null {
  const providerName = name.toLowerCase();
  if (providerName.includes("amazon")) return FaAmazon;
  if (providerName.includes("netflix")) return SiNetflix;
  if (providerName.includes("apple")) return SiAppletv;
  if (providerName.includes("fandango")) return SiFandango;
  if (providerName.includes("google play")) return SiGoogleplay;
  if (providerName.includes("plex")) return SiPlex;
  if (providerName.includes("verizon")) return SiVerizon;
  if (providerName.includes("youtube")) return SiYoutube;
  return null;
}

function getProviderBrandKey(name: string): string {
  const providerName = name.toLowerCase();
  if (providerName.includes("amazon")) return "amazon";
  if (providerName.includes("apple")) return "apple";
  if (providerName.includes("fandango")) return "fandango";
  if (providerName.includes("google play")) return "google-play";
  if (providerName.includes("netflix")) return "netflix";
  if (providerName.includes("plex")) return "plex";
  if (providerName.includes("starz")) return "starz";
  if (providerName.includes("verizon")) return "verizon";
  if (providerName.includes("youtube")) return "youtube";
  return providerName.replace(/[^a-z0-9]/g, "");
}

function getUniqueWatchProviders(
  providers: TmdbMovieDetails["watchProviders"],
) {
  const seenBrands = new Set<string>();
  return providers.filter((provider) => {
    const brandKey = getProviderBrandKey(provider.name);
    if (seenBrands.has(brandKey)) return false;
    seenBrands.add(brandKey);
    return true;
  });
}

function getProviderSearchUrl(movieTitle: string, providerName: string): string {
  const params = new URLSearchParams({
    q: `${movieTitle} ${providerName}`,
  });
  return `https://www.google.com/search?${params}`;
}

function formatRuntime(runtime: number | null): string {
  if (runtime === null) return "Runtime unavailable";

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatReleaseDate(releaseDate: string | null): string {
  if (!releaseDate) return "To be announced";

  const date = new Date(`${releaseDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "To be announced";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const FilmDetailTemplate = ({
  movie,
  heroVideoSrc = "/film/",
  trailerVideoSrc = "/film/",
}: FilmDetailTemplateProps) => {
  const secondaryVideoSrc = movie.youtubeSecondaryVideoKey
    ? getYouTubeEmbedUrl(movie.youtubeSecondaryVideoKey)
    : null;
  const watchProviders = getUniqueWatchProviders(movie.watchProviders);
  const providerGridColumns =
    watchProviders.length === 1
      ? "grid-cols-1"
      : watchProviders.length === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className="min-h-screen bg-white">
      <main className="p-1">
        <section
          aria-label={`Featured video for ${movie.title}`}
          className="relative isolate h-[70vh] min-h-[420px] overflow-hidden bg-[#bca]"
        >
          <HeroVideo
            key={movie.id}
            src={heroVideoSrc}
            youtubeTrailerKey={movie.youtubeTrailerKey}
          />
        </section>
        <section className="grid min-h-[30vh] gap-8 bg-white px-6 py-8 text-[#171717] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex min-w-0 flex-col justify-end">
            <TmdbLogoExample query={movie.title} />
            <h1 className="mt-2 text-[clamp(3rem,8vw,4rem)] font-semibold leading-[0.86] tracking-tighter">
              {movie.title}
            </h1>
          </div>

          <div className="grid min-w-0 gap-8 border-t border-[#e5e5e5] pt-6 sm:grid-cols-[1.4fr_1fr_1fr] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div className="flex min-w-0 flex-col">
              <p className="mb-2 text-[10px] uppercase tracking-wide">Info</p>

              <p role="status" className="  font-semibold text-[#999] text-xs ">
                {movie.overview || "No synopsis is available for this film."}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-5 uppercase pt-4 text-[10px] tracking-tight">
                <span className="flex hover:text-[#999] cursor-pointer  items-center gap-2 font-semibold  ">
                  <Play size={13} />
                  Trailer
                </span>

                <span className="flex hover:text-[#999] cursor-pointer  items-center gap-2 font-semibold border-l border-[#eeeeee] pl-5">
                  <Share size={13} />
                  Share
                </span>
                <span className="flex hover:text-[#999] cursor-pointer  items-center gap-2 font-semibold border-l border-[#eeeeee] pl-5">
                  <Megaphone size={13} />
                  Updates
                </span>
              </div>
            </div>

            <div className="border-t border-[#e5e5e5] pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="mb-1 text-[10px] uppercase tracking-wide">
                Category
              </p>
              <p role="status" className="  font-semibold text-[#999] text-xs ">
                {movie.genres.length > 0 ? movie.genres.join(", ") : "unknown"}
              </p>{" "}
              <p className="mb-1 mt-5 text-[10px] uppercase tracking-wide">
                Directed by
              </p>
              <p role="status" className="  font-semibold text-[#999] text-xs ">
                {movie.director ?? "Not listed"}
              </p>
              <p className="mb-1 mt-5 text-[10px] uppercase tracking-wide">
                Release date
              </p>
              <p role="status" className="  font-semibold text-[#999] text-xs ">
                {formatReleaseDate(movie.releaseDate)}
              </p>
            </div>

            <div className="border-t border-[#e5e5e5] pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="mb-1 text-[10px] uppercase tracking-wide">Cast</p>
              <p role="status" className="  font-semibold text-[#999] text-xs ">
                {movie.cast.length > 0
                  ? movie.cast.map((name, index) => (
                      <span key={`${name}-${index}`}>
                        {name}
                        {index < movie.cast.length - 1 && <br />}
                      </span>
                    ))
                  : "Cast information unavailable"}
              </p>
            </div>
          </div>
        </section>
        <section className="grid min-h-[30vh] gap-8 bg-white px-6 text-[#171717] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex min-w-0 flex-col justify-end" />

          <section className="h-fit font-semibold w-full">
            <div className="flex items-center gap-2 pl-6">
              <p className="mb-1 flex items-center gap-1 border-r border-[#eeeeee] pr-3 text-[10px] uppercas tracking-tight text-[#999]">
                <Hourglass size={10} /> {formatRuntime(movie.runtime)}
              </p>
              <p className="mb-1 flex items-center gap-1 border-r border-[#eeeeee] pr-3 text-[10px] text-[#999] tracking-tight">
                <Lock size={10} />
                <span>{movie.certification ?? "NR"}</span>
              </p>
              <p className="mb-1 flex items-center gap-1 border-r border-[#eeeeee] pr-3 text-[10px] text-[#999] tracking-tight">
                <MonitorCog size={10} /> 4K
              </p>
              <p className="mb-1 flex items-center gap-1 border-r border-[#eeeeee] pr-3 text-[10px] text-[#999] tracking-tight">
                <MonitorSpeaker size={10} /> Dolby Vision
              </p>
              <p className="mb-1 flex items-center gap-1 border-r border-[#eeeeee] pr-3 text-[10px] text-[#999] tracking-tight">
                <Astroid size={10} /> {movie.rating ?? "Not rated"}
              </p>
            </div>

            <div className="relative mt-2 aspect-video w-full overflow-hidden ">
              {secondaryVideoSrc ? (
                <>
                  <iframe
                    src={secondaryVideoSrc}
                    title={`${movie.title} additional video`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen={false}
                    tabIndex={-1}
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  />
                  <div aria-hidden="true" className="absolute inset-0 z-10" />
                </>
              ) : (
                <video
                  playsInline
                  autoPlay
                  muted
                  preload="metadata"
                  loop
                  aria-label={`${movie.title} trailer`}
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  <source src={trailerVideoSrc} type="video/mp4" />
                  Your browser does not support HTML video.
                </video>
              )}
            </div>
            <section
              aria-labelledby="streaming-providers-heading"
              className="bg-white px-5 py-5 text-[#171717]"
            >
              <h2
                id="streaming-providers-heading"
                className="text-[#999] capitalize font-semibold text-xs tracking-tight"
              >
                Rent or buy via... 
              </h2>
              <ul
                className={`mt-4 grid ${providerGridColumns} divide-x divide-[#eee]`}
              >
                {watchProviders.map((provider) => {
                  const ProviderIcon = getProviderIcon(provider.name);
                  return (
                    <li
                      key={provider.id}
                      className="min-h-32 bg-white"
                    >
                      <a
                        href={getProviderSearchUrl(movie.title, provider.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Search for ${movie.title} on ${provider.name}`}
                        className="flex h-full min-h-32 items-center justify-center px-3 outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#171717]"
                      >
                        {ProviderIcon ? (
                          <>
                            <ProviderIcon
                              aria-hidden="true"
                              size={52}
                              className="text-[#aaa] transition-colors hover:text-black"
                            />
                            <span className="sr-only">{provider.name}</span>
                          </>
                        ) : (
                          <Image
                            src={provider.logoUrl}
                            alt={provider.name}
                            width={240}
                            height={120}
                            sizes="(min-width: 640px) 25vw, 50vw"
                            className="h-auto max-h-14 max-w-[150px] object-contain grayscale opacity-60 transition-opacity hover:opacity-100"
                          />
                        )}
                      </a>
                    </li>
                  );
                })}
                {watchProviders.length === 0 && (
                  <li className="col-span-full py-10 text-center text-xs text-[#999]">
                    No streaming providers provided.
                  </li>
                )}
              </ul>
            </section>
          </section>
        </section>{" "}
        <section className="h-screen w-full" />
      </main>
    </div>
  );
};

export default FilmDetailTemplate;
