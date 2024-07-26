import { formatSchema } from "@prisma/internals";
import { NextApiRequest, NextApiResponse } from "next";

export default async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const schema = req.body.schema as string;
  const output = await formatSchema({
    schemas: [["schema.prisma", schema]],
  });

  res.json({ formatted: output[0]![1] });
}
