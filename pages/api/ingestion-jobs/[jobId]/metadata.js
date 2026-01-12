import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { query } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false });
  }

  try {
    await getTenantContext(req);
  } catch {
    return res.status(401).json({ ok: false });
  }

  const { jobId } = req.query;

  const result = await query(
    `
    SELECT metadata
    FROM ingestion_jobs
    WHERE id = $1
    `,
    [jobId]
  );

  if (!result.rows.length) {
    return res.status(404).json({ ok: false });
  }

  return res.json({
    ok: true,
    metadata: result.rows[0].metadata ?? {},
  });
}
