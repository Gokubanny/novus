import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeRequest {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface GeocodeResponse {
  latitude: number | null;
  longitude: number | null;
  display_name: string | null;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { street, city, state, zip }: GeocodeRequest = await req.json();

    if (!street || !city || !state) {
      return new Response(
        JSON.stringify({ latitude: null, longitude: null, error: "Missing required address fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the address string for geocoding
    const addressQuery = encodeURIComponent(`${street}, ${city}, ${state} ${zip}`);
    
    // Use OpenStreetMap Nominatim (free, no API key required)
    // Rate limit: 1 request per second, must include User-Agent
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${addressQuery}&format=json&limit=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "NovusGuard-AddressVerification/1.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Nominatim API error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ latitude: null, longitude: null, error: "Geocoding service unavailable" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({ 
          latitude: null, 
          longitude: null, 
          display_name: null,
          error: "Address not found" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = results[0];
    const geocodeResponse: GeocodeResponse = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      display_name: result.display_name,
    };

    console.log(`Geocoded "${street}, ${city}, ${state}" to:`, geocodeResponse);

    return new Response(
      JSON.stringify(geocodeResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Geocoding error:", error);
    return new Response(
      JSON.stringify({ latitude: null, longitude: null, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
