import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "missing key" },
        { status: 400 }
      );
    }

    let ctx;
    try {
      ctx = await getTenantContext(req);
    } catch {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = ctx.tenantId;

    await query("BEGIN");

    try {
      const { rowCount } = await query(
        `
        update clips
        set deleted_at = now()
        where tenant_id = $1
          and object_key = $2
          and deleted_at is null
        `,
        [tenantId, key]
      );

      if (rowCount === 0) {
        await query("COMMIT");
        return NextResponse.json({
          ok: true,
          deleted: key,
          alreadyDeleted: true,
        });
      }

      const clipIdResult = await query(
        `
        select id from clips
        where tenant_id = $1
          and object_key = $2
        `,
        [tenantId, key]
      );

      const clipId = clipIdResult.rows[0]?.id;

      if (clipId) {
        await query(
          `
          update npc_clips
          set deleted_at = now()
          where clip_id = $1
            and deleted_at is null
          `,
          [clipId]
        );

        await query(
          `
          update item_clips
          set deleted_at = now()
          where clip_id = $1
            and deleted_at is null
          `,
          [clipId]
        );

        await query(
          `
          update location_clips
          set deleted_at = now()
          where clip_id = $1
            and deleted_at is null
          `,
          [clipId]
        );
      }

      await query("COMMIT");

      const client = getR2Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        })
      );

      return NextResponse.json({ ok: true, deleted: key });
    } catch (err) {
      await query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("[r2 delete] real error", err);
    return NextResponse.json(
      { ok: false, error: "delete failed" },
      { status: 500 }
    );
  }
}
