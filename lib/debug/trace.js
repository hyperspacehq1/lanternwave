import crypto from "crypto";

export function traceId() {
  return crypto.randomBytes(4).toString("hex");
}

export function log(tid, label, data) {
  try {
    if (data !== undefined) {
      console.log(`[${tid}] ${label}`, data);
    } else {
      console.log(`[${tid}] ${label}`);
    }
  } catch {
    console.log(`[${tid}] ${label}`);
  }
}
