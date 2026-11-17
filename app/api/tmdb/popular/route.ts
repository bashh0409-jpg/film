import {
  getMovieFeedBatch,
  tmdbErrorResponse,
} from "@/lib/tmdb";

export async function GET(request: Request) {
  const batchParam = new URL(request.url).searchParams.get("batch");

  if (!batchParam || !/^[1-9]\d*$/.test(batchParam)) {
    return Response.json(
      { error: "A positive numeric batch parameter is required." },
      { status: 400 },
    );
  }

  const batch = Number(batchParam);
  if (!Number.isSafeInteger(batch)) {
    return Response.json(
      { error: "batch must be a safe integer." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await getMovieFeedBatch(batch));
  } catch (error) {
    return tmdbErrorResponse(error);
  }
}
