const fs = require("fs/promises");

async function copyFiles() {
  try {
    await fs.cp("public", ".next/standalone", { recursive: true });
    await fs.cp(".next/static", ".next/standalone/.next/static", {
      recursive: true,
    });
  } catch (err) {
    console.error("Error copying files:", err);
    return;
  }
  console.log("Files copied successfully.");
}

copyFiles();
