export function getYouTubeEmbedUrl(videoKey: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    loop: "1",
    playlist: videoKey,
    playsinline: "1",
    disablekb: "1",
    enablejsapi: "1",
    rel: "0",
    fs: "0",
    iv_load_policy: "3",
  });

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?${params}`;
}
