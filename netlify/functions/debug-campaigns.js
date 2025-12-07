// netlify/functions/debug-campaigns.js

import { NetlifyRequest, NetlifyResponse } from "@netlify/functions";

export default async function handler(request /*: NetlifyRequest */) {
  try {
    // Sanity: prove that this file is running + import works
    const info = {
      ok: true,
      message: "debug-campaigns is alive",
      method: request.method,
      // request.query is a URLSearchParams in the new API
      query: Array.from(request.query.keys()),
      hasBody: !!request.body,
    };

    return NetlifyResponse.json(info);
  } catch (err) {
    return NetlifyResponse.json(
      {
        ok: false,
        error: err.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
