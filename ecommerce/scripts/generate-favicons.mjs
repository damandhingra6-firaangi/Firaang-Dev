import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const sourceIcon = path.join(publicDir, "icon_v001.svg");

const outputs = [
  { fileName: "favicon-16x16.png", size: 16 },
  { fileName: "favicon-32x32.png", size: 32 },
  { fileName: "favicon-48x48.png", size: 48 },
  { fileName: "apple-touch-icon.png", size: 180 },
  { fileName: "android-chrome-192x192.png", size: 192 },
  { fileName: "android-chrome-512x512.png", size: 512 },
];

async function renderPng(size) {
  return sharp(sourceIcon, { density: 1024 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  const renderedBuffers = await Promise.all(
    outputs.map(async ({ fileName, size }) => {
      const buffer = await renderPng(size);
      const targetPath = path.join(publicDir, fileName);
      await writeFile(targetPath, buffer);
      return { fileName, size, buffer };
    }),
  );

  const faviconIco = await toIco([
    renderedBuffers.find((entry) => entry.size === 16).buffer,
    renderedBuffers.find((entry) => entry.size === 32).buffer,
    renderedBuffers.find((entry) => entry.size === 48).buffer,
  ]);

  await writeFile(path.join(publicDir, "favicon.ico"), faviconIco);

  console.log(
    `Generated favicon assets: ${renderedBuffers.map((entry) => entry.fileName).join(", ")}, favicon.ico`,
  );
}

main().catch((error) => {
  console.error("Failed to generate favicons", error);
  process.exitCode = 1;
});
