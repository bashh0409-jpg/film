import { getMovieLogos, tmdbErrorResponse } from "@/lib/tmdb";

export async function GET(request: Request) {
  const movieId = new URL(request.url).searchParams.get("movieId");

  if (!movieId || !/^[1-9]\d*$/.test(movieId)) {
    return Response.json(
      { error: "A positive numeric movieId parameter is required." },
      { status: 400 },
    );
  }

  const parsedMovieId = Number(movieId);
  if (!Number.isSafeInteger(parsedMovieId)) {
    return Response.json(
      { error: "movieId must be a safe integer." },
      { status: 400 },
    );
  }

  try {
    return Response.json({
      movieId: parsedMovieId,
      logos: await getMovieLogos(parsedMovieId),
    });
  } catch (error) {
    return tmdbErrorResponse(error);
  }
}
