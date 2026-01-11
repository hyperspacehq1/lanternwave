import { db } from "@/lib/db"; // same helper used in module-integrator
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    // 🔒 Auth / tenant guard (cheap, safe)
    await getTenantContext(req);

    const { jobId } = req.query;

    if (!jobId) {
      res.status(400).json({
        ok: false,
        error: "Missing jobId",
      });
      return;
    }

    const { rows } = await db.query(
      `
      select
        id,
        status,
        progress,
        current_stage,
        updated_at
      from ingestion_jobs
      where id = $1
      limit 1
      `,
      [jobId]
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
      detail: err?.message,
    });
  }
}
