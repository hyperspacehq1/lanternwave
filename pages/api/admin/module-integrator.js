import Busboy from "busboy";

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
