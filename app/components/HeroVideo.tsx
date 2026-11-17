"use client";

import { useEffect, useRef, useState } from "react";
import { getYouTubeEmbedUrl } from "./youtube";
import { Expand, BoomBox, AudioLinesOff } from "lucide-react";

type TrailerVideoProps = {
  src?: string;
  youtubeTrailerKey?: string | null;
};

const TrailerVideo = ({
  src = "/film/chase.mp4",
  youtubeTrailerKey,
}: TrailerVideoProps) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const mediaLayerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(Boolean(youtubeTrailerKey));
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateParallax = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hero = heroRef.current;
        const mediaLayer = mediaLayerRef.current;
        if (!hero || !mediaLayer) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          mediaLayer.style.transform = "none";
          return;
        }

        const progress = Math.min(
          1,
          Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight),
        );
        const offset = progress * 48;
        mediaLayer.style.transform = `translate3d(0, ${offset}px, 0) scale(1.08)`;
      });
    };

    window.addEventListener("scroll", updateParallax, { passive: true });
    window.addEventListener("resize", updateParallax);
    updateParallax();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateParallax);
      window.removeEventListener("resize", updateParallax);
    };
  }, []);

  const toggleMute = () => {
    const nextIsMuted = !isMuted;

    if (youtubeTrailerKey) {
      const player = iframeRef.current?.contentWindow;
      if (!player) {
        setPlaybackError("The featured video is unavailable.");
        return;
      }

      player.postMessage(
        JSON.stringify({
          event: "command",
          func: nextIsMuted ? "mute" : "unMute",
          args: [],
        }),
        "https://www.youtube-nocookie.com",
      );
    } else {
      const video = videoRef.current;
      if (!video) {
        setPlaybackError("The featured video is unavailable.");
        return;
      }
      video.muted = nextIsMuted;
    }

    setIsMuted(nextIsMuted);
    setPlaybackError(null);
  };

  const toggleFullscreen = async () => {
    const target = iframeRef.current ?? videoRef.current;
    if (!target) {
      setPlaybackError("The featured video is unavailable.");
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullScreen(false);
        return;
      }

      await target.requestFullscreen();
      setIsFullScreen(true);
    } catch (error) {
      console.error("Unable to toggle fullscreen.", error);
      setPlaybackError("Unable to toggle fullscreen.");
    }
  };

  const togglePlayback = async () => {
    if (youtubeTrailerKey) {
      const player = iframeRef.current?.contentWindow;
      if (!player) {
        setPlaybackError("The featured video is unavailable.");
        return;
      }

      player.postMessage(
        JSON.stringify({
          event: "command",
          func: isPlaying ? "pauseVideo" : "playVideo",
          args: [],
        }),
        "https://www.youtube-nocookie.com",
      );
      setIsPlaying(!isPlaying);
      setPlaybackError(null);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setPlaybackError("The featured video is unavailable.");
      return;
    }

    if (video.paused) {
      try {
        await video.play();
        setPlaybackError(null);
      } catch (error) {
        console.error("Unable to play the featured video.", error);
        setPlaybackError("Unable to play the featured video.");
      }
    } else {
      video.pause();
    }
  };

  return (
    <div ref={heroRef} className="absolute inset-0 overflow-hidden">
      <div
        ref={mediaLayerRef}
        className="absolute inset-0 will-change-transform"
      >
      {youtubeTrailerKey ? (
        <iframe
          ref={iframeRef}
          src={getYouTubeEmbedUrl(youtubeTrailerKey)}
          title="Featured movie trailer"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          tabIndex={-1}
          className="pointer-events-none absolute left-1/2 top-1/2 max-h-none max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "max(100vw, 124.444vh, 746.667px)",
            height: "max(70vh, 56.25vw, 420px)",
          }}
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute left-0 top-0 h-full w-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(event) => {
            console.error(
              "Unable to load the featured video.",
              event.currentTarget.error,
            );
            setIsPlaying(false);
            setPlaybackError("Unable to load the featured video.");
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
      </div>
      {youtubeTrailerKey && (
        <div aria-hidden="true" className="absolute inset-0 z-10" />
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-end gap-2 p-2">
        <button
          type="button"
          onClick={toggleMute}
          className="z-100  cursor-pointer hover:bg-[#878787] bg-white p-1 flex  text-black"
          aria-label={isMuted ? "Unmute featured video" : "Mute featured video"}
          aria-pressed={!isMuted}
        >
          {isMuted ? <AudioLinesOff size={14} /> : <BoomBox size={14} />}
        </button>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="z-100  cursor-pointer hover:bg-[#878787] bg-white p-1 flex  text-black"
          aria-label={
            isFullScreen ? "Exit fullscreen" : "Expand featured video"
          }
        >
          <Expand className="" size={14} />
        </button>
      </div>
      <button
        type="button"
        className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-white"
        aria-label={isPlaying ? "Pause featured video" : "Play featured video"}
        aria-pressed={isPlaying}
        onClick={() => void togglePlayback()}
      >
        {isPlaying ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 32 48"
            className="h-14 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <path d="M8 4v40M24 4v40" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 32 48"
            className="h-14 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <path d="M4 3v42l25-21L4 3Z" />
          </svg>
        )}
      </button>
      {playbackError && (
        <p
          role="alert"
          className="absolute left-1/2 top-[calc(50%+3.5rem)] z-20 -translate-x-1/2 text-center text-sm text-white"
        >
          {playbackError}
        </p>
      )}
    </div>
  );
};

export default TrailerVideo;
