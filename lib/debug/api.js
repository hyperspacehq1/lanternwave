export function debugApi(label, req) {
  try {
    console.log("──────── API DEBUG ────────");
    console.log("LABEL:", label);
    console.log("METHOD:", req.method);
    console.log("URL:", req.url);

    if (req.headers) {
      console.log("HEADERS:", Object.fromEntries(req.headers.entries()));
    }

    console.log("───────────────────────────");
  } catch (e) {
    console.log("DEBUG FAILED:", e);
  }
}
