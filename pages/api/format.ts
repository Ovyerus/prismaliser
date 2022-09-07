import { formatSchema } from "@prisma/internals";
import { NextApiRequest, NextApiResponse } from "next";

export default async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const schema = req.body.schema as string;
  const formatted = await formatSchema({ schema });

  res.json({ formatted });
}
