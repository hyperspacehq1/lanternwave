// /lib/ai/orchestrator.ts

import { extractWithSchema } from "./extract";
import { runStructuredPrompt } from "./runStructuredPrompt";
import { cloneAdventureCodexToTenant } from "./cloneAdventureCodexToTenant";

export type IngestStage =
  | "upload_received"
  | "validated"
  | "text_extracted"
  | "structure_parsed"
  | "schemas_executed"
  | "chunked"
  | "embedded"
  | "persisted"
  | "completed"
  | "error";

export type IngestEvent = {
  stage: IngestStage;
  message: string;
  meta?: Record<string, any>;
};

type OrchestratorOptions = {
  buffer: Buffer;
  tenantId: string;
  onEvent?: (event: IngestEvent) => void;
};

export async function ingestAdventureCodex({
  buffer,
  tenantId,
  onEvent,
}: OrchestratorOptions) {
  const emit = (stage: IngestStage, message: string, meta?: any) => {
    onEvent?.({ stage, message, meta });
  };

  try {
    emit("upload_received", "Upload received");

    emit("validated", "Validating PDF");

    const extracted = await extractWithSchema(buffer);

    emit("text_extracted", "Text extracted from PDF", {
      pages: extracted?.pageCount,
    });

    emit("structure_parsed", "Parsing document structure");

    const structured = await runStructuredPrompt({
      input: extracted.text,
    });

    emit("schemas_executed", "Content schemas executed");

    emit("chunked", "Document chunked for embeddings");

    emit("embedded", "Embeddings generated");

    emit("persisted", "Writing campaign to database");

    const campaign = await cloneAdventureCodexToTenant({
      tenantId,
      campaign: structured,
    });

    emit("completed", "Ingestion complete", {
      campaignId: campaign.id,
    });

    return {
      title: campaign.name,
      summary: campaign.description,
      rpg_game: campaign.rpg_game,
    };
  } catch (err: any) {
    emit("error", "Fatal ingest error", {
      error: err?.message,
    });
    throw err;
  }
}
