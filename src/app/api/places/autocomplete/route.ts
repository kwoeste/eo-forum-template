import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface PlacesNewResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
    };
  }>;
  error?: { message: string; status: string };
}

interface PlacesLegacyResponse {
  status: string;
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text: string;
      secondary_text: string;
    };
  }>;
  error_message?: string;
}

async function fetchPlacesNew(
  query: string,
  apiKey: string
): Promise<PlacePrediction[]> {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: query,
        includedPrimaryTypes: ["street_address", "subpremise", "premise", "establishment", "geocode"],
        includedRegionCodes: ["us"],
        languageCode: "en",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Places API (New) failed: ${response.status}`);
  }

  const data = (await response.json()) as PlacesNewResponse;

  if (data.error) {
    throw new Error(data.error.message || "Places API (New) error");
  }

  return (data.suggestions || [])
    .filter((s) => s.placePrediction)
    .map((s) => {
      const p = s.placePrediction!;
      return {
        placeId: p.placeId,
        description: p.text?.text || "",
        mainText: p.structuredFormat?.mainText?.text || "",
        secondaryText: p.structuredFormat?.secondaryText?.text || "",
      };
    });
}

async function fetchPlacesLegacy(
  query: string,
  apiKey: string
): Promise<PlacePrediction[]> {
  const params = new URLSearchParams({
    input: query,
    key: apiKey,
    types: "geocode|establishment",
    components: "country:us",
    language: "en",
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Places API (Legacy) failed: ${response.status}`);
  }

  const data = (await response.json()) as PlacesLegacyResponse;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(data.error_message || `Places API status: ${data.status}`);
  }

  return (data.predictions || []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
    mainText: p.structured_formatting?.main_text || p.description,
    secondaryText: p.structured_formatting?.secondary_text || "",
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!API_KEY) {
      return NextResponse.json(
        { error: "Places API not configured", predictions: [] },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ predictions: [] });
    }

    let predictions: PlacePrediction[];

    try {
      predictions = await fetchPlacesNew(query, API_KEY);
    } catch {
      predictions = await fetchPlacesLegacy(query, API_KEY);
    }

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch predictions",
        predictions: [],
      },
      { status: 200 }
    );
  }
}
