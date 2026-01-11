import { query } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const ctx = await getTenantContext(req);
    const tenantId = ctx.tenantId;

    const { jobId } = req.query;
    if (!jobId) {
      res.status(400).json({ ok: false, error: "Missing jobId" });
      return;
    }

    const { rows } = await query(
      `
      SELECT
        id,
        status,
        progress,
        current_stage,
        updated_at
      FROM ingestion_jobs
      WHERE id = $1
        AND tenant_id = $2
      LIMIT 1
      `,
      [jobId, tenantId]
    );

    if (!rows.length) {
      res.status(404).json({
        ok: false,
        error: "Ingestion job not found",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      job: rows[0],
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "Failed to fetch ingestion job",
      detail: err.message,
    });
  }
}
