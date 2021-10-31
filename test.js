const path = require("path");
const fs = require("fs");

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

async function main() {
  for await (const file of walk("node_modules/@prisma/engines")) {
    console.log(file);
  }
}

main()
  .then(() => {
    console.log("done");
  })
  .catch((e) => {
    console.error(e);
  });
