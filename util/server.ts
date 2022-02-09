import path from "path";

// https://github.com/Ovyerus/prisma-sdk-vercel-repro/pull/1/commits/a01508e8980426b18be690d386c9ffddaaa472e6
// TODO: see if we can have an automated check in the Vercel build which ensures the presence of these
export const fixPrisma = () => {
  path.join(
    process.cwd(),
    "node_modules/@prisma/engines/libquery_engine-rhel-openssl-1.0.x.so.node"
  );
  path.join(
    process.cwd(),
    "node_modules/@prisma/engines/prisma-fmt-rhel-openssl-1.0.x"
  );
  path.join(
    process.cwd(),
    "node_modules/@prisma/sdk/libquery_engine-rhel-openssl-1.0.x.so.node"
  );
  path.join(
    process.cwd(),
    "node_modules/@prisma/sdk/prisma-fmt-rhel-openssl-1.0.x"
  );
};
