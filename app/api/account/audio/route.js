export async function PUT(req) {
  try {
    const body = await req.json();
    const { key, value } = body || {};

    if (typeof key !== "string") {
      return NextResponse.json(
        { ok: false, error: "invalid key" },
        { status: 400 }
      );
    }

    const ALLOWED_KEYS = ["player_enabled"];
    if (!ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { ok: false, error: "unsupported audio setting" },
        { status: 400 }
      );
    }

    const ctx = await getTenantContext(req);
    if (!ctx?.tenantId) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    await query(
      `
      UPDATE account_preferences
         SET audio =
           COALESCE(audio, '{}'::jsonb)
           || jsonb_build_object($1::text, $2),
             updated_at = NOW()
       WHERE tenant_id = $3
      `,
      [key, !!value, ctx.tenantId]
    );

    return NextResponse.json({
      ok: true,
      audio: { [key]: !!value },
    });
  } catch (err) {
    console.error("[account-audio][PUT] ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal server error" },
      { status: 500 }
    );
  }
}
