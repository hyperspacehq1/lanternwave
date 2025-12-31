export function withContext(record, context = {}) {
  return {
    ...record,
    campaign_id:
      record.campaign_id ??
      context.campaign_id ??
      null,

    session_id:
      record.session_id ??
      context.session_id ??
      null,
  };
}
