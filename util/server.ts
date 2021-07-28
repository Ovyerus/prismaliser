import path from "path";

// https://github.com/Ovyerus/prisma-sdk-vercel-repro/pull/1/commits/a01508e8980426b18be690d386c9ffddaaa472e6
export const fixPrisma = () => {
  path.join(
    process.cwd(),
    "node_modules/@prisma/engines/query-engine-rhel-openssl-1.0.x"
  );
  path.join(
    process.cwd(),
    "node_modules/@prisma/engines/query-engine-windows.exe"
  );
};
