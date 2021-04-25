import { getDMMF } from "@prisma/sdk";
import { NextApiRequest, NextApiResponse } from "next";

export default async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method Not Allowed" });

  const schema = req.body.schema as string;
  const dmmf = await getDMMF({ datamodel: schema });

  // TODO: handle errors
  res.json(dmmf.datamodel);
}
