import Busboy from "busboy";
import pdfParse from "pdf-parse";
import { randomUUID } from "crypto";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    message: "module-integrator alive",
    busboyType: typeof Busboy,
  });
}
