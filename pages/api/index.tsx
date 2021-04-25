import { getDMMF } from "@prisma/sdk";
import { NextApiRequest, NextApiResponse } from "next";

import util from "util";

export default async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const schema = req.body.schema as string;
    const dmmf = await getDMMF({ datamodel: schema });

    res.json(dmmf.datamodel);
  } catch (err) {
    res.status(400).json({ message: "todo" });
  }
}
