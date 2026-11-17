import Navbar from "../components/Navbar";
import InfiniteMovieGrid from "../components/InfiniteMovieGrid";
import { getMovieFeedBatch } from "@/lib/tmdb";
import Script from "next/script";

const Page = async () => {
  const { movies, hasMore } = await getMovieFeedBatch();

  return (
    <div>
      <Script
        id="google-adsense"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8778681612531498"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <Navbar />
      <InfiniteMovieGrid initialMovies={movies} initialHasMore={hasMore} />
    </div>
  );
};

export default Page;
