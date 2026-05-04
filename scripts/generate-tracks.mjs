import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const MP3_DIR = path.join(ROOT, "MP3");
const IMAGES_DIR = path.join(ROOT, "images");
const OUTPUT = path.join(ROOT, "tracks.json");

const audioExts = new Set([".mp3", ".m4a", ".wav", ".ogg"]);
const imageExts = [".jpg", ".jpeg", ".png", ".webp"];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const results = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      results.push(...walk(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function cleanTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findCover(audioRelativePath) {
  const audioParsed = path.parse(audioRelativePath);
  const audioBaseName = audioParsed.name;

  const possibleCovers = [];

  // 方案 1：images 資料夾裡有同名圖片
  for (const ext of imageExts) {
    possibleCovers.push(path.join("images", `${audioBaseName}${ext}`));
  }

  // 方案 2：images 裡有相同子資料夾 + 同名圖片
  const audioSubDir = audioParsed.dir.replace(/^MP3[\\/]?/, "");
  if (audioSubDir) {
    for (const ext of imageExts) {
      possibleCovers.push(path.join("images", audioSubDir, `${audioBaseName}${ext}`));
    }
  }

  // 方案 3：MP3 同資料夾裡放同名圖片
  for (const ext of imageExts) {
    possibleCovers.push(path.join(audioParsed.dir, `${audioBaseName}${ext}`));
  }

  for (const cover of possibleCovers) {
    const fullCoverPath = path.join(ROOT, cover);
    if (fs.existsSync(fullCoverPath)) {
      return toPosix(cover);
    }
  }

  return "";
}

const audioFiles = walk(MP3_DIR)
  .filter(file => audioExts.has(path.extname(file).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "zh-Hant"));

const tracks = audioFiles.map(file => {
  const relativePath = toPosix(path.relative(ROOT, file));
  const filename = path.basename(file);

  return {
    title: cleanTitle(filename),
    src: relativePath,
    cover: findCover(relativePath)
  };
});

fs.writeFileSync(OUTPUT, JSON.stringify(tracks, null, 2), "utf8");

console.log(`Generated tracks.json with ${tracks.length} tracks.`);
