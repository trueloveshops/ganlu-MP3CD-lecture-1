import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "tracks.json");

const audioExts = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"]);
const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const excludedDirs = new Set([
  ".git",
  ".github",
  "scripts",
  "node_modules"
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const results = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isDirectory() && excludedDirs.has(item.name)) {
      continue;
    }

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

function getCategory(relativePath) {
  const parts = relativePath.split("/");

  // 放在 music 資料夾，播放器顯示 music
  if (parts[0] === "music") {
    return "music";
  }

  // 放在 MP3 資料夾，播放器顯示 講經
  if (parts[0] === "MP3") {
    return "講經";
  }

  // 其他資料夾，先顯示第一層資料夾名稱，避免空白
  return parts[0] || "其他";
}

const allFiles = walk(ROOT);

const imageFiles = allFiles
  .filter(file => imageExts.has(path.extname(file).toLowerCase()))
  .map(file => ({
    fullPath: file,
    relativePath: toPosix(path.relative(ROOT, file)),
    baseName: path.parse(file).name
  }));

function findCover(audioFile) {
  const audioParsed = path.parse(audioFile);
  const audioBaseName = audioParsed.name;
  const audioDir = audioParsed.dir;

  // 1. 優先找音樂同資料夾的同名圖片
  for (const img of imageFiles) {
    if (
      img.baseName === audioBaseName &&
      path.dirname(img.fullPath) === audioDir
    ) {
      return img.relativePath;
    }
  }

  // 2. 再找 images 資料夾裡的同名圖片
  for (const img of imageFiles) {
    const parts = img.relativePath.split("/");
    if (
      img.baseName === audioBaseName &&
      parts.includes("images")
    ) {
      return img.relativePath;
    }
  }

  // 3. 最後找整個 repo 裡任意位置的同名圖片
  for (const img of imageFiles) {
    if (img.baseName === audioBaseName) {
      return img.relativePath;
    }
  }

  return "";
}

const audioFiles = allFiles
  .filter(file => audioExts.has(path.extname(file).toLowerCase()))
  .sort((a, b) => {
    const ar = toPosix(path.relative(ROOT, a));
    const br = toPosix(path.relative(ROOT, b));
    return ar.localeCompare(br, "zh-Hant");
  });

const tracks = audioFiles.map(file => {
  const relativePath = toPosix(path.relative(ROOT, file));
  const filename = path.basename(file);
  const display = cleanTitle(filename);

  return {
    title: filename,
    display: display,
    category: getCategory(relativePath),
    file: relativePath,
    src: relativePath,
    cover: findCover(file)
  };
});

fs.writeFileSync(OUTPUT, JSON.stringify(tracks, null, 2), "utf8");

console.log(`Generated tracks.json with ${tracks.length} tracks.`);
