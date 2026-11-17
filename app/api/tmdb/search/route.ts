import { searchMovies, tmdbErrorResponse } from "@/lib/tmdb";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("query")?.trim();

  if (!query) {
    return Response.json(
      { error: "The query parameter is required." },
      { status: 400 },
    );
  }

  if (query.length > 100) {
    return Response.json(
      { error: "The query must be 100 characters or fewer." },
      { status: 400 },
    );
  }

  try {
    return Response.json({ results: await searchMovies(query) });
  } catch (error) {
    return tmdbErrorResponse(error);
  }
}
