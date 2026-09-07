import { parseBlob } from "music-metadata";
import type { LibraryRecord } from "./store";

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "oga",
  "flac",
  "m4a",
  "aac",
  "opus",
  "webm",
]);

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) {
    return true;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.has(extension);
}

export interface ImportedMetadata {
  title: string;
  artist: string;
  album: string | null;
  duration: number;
  artwork: Blob | null;
}

const EMPTY_METADATA: ImportedMetadata = {
  title: "",
  artist: "",
  album: null,
  duration: 0,
  artwork: null,
};

async function extractMetadata(file: File): Promise<ImportedMetadata> {
  try {
    const meta = await parseBlob(file);
    const picture = meta.common.picture?.[0];
    return {
      title: meta.common.title ?? "",
      artist: meta.common.artist ?? meta.common.albumartist ?? "",
      album: meta.common.album ?? null,
      duration: meta.format.duration ?? 0,
      artwork: picture ? new Blob([new Uint8Array(picture.data)], { type: picture.format }) : null,
    };
  } catch {
    // exotic or broken container: import with filename-derived metadata
    return { ...EMPTY_METADATA };
  }
}

function metadataFromFileName(fileName: string): { title: string; artist: string } {
  const base = fileName.replace(/\.[^.]+$/u, "");
  const separator = base.lastIndexOf(" - ");
  if (separator > 0) {
    return { artist: base.slice(0, separator), title: base.slice(separator + 3) };
  }
  return { artist: "", title: base };
}

export async function importFile(file: File): Promise<LibraryRecord> {
  const meta = await extractMetadata(file);
  const fallback = metadataFromFileName(file.name);
  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    title: meta.title || fallback.title,
    artist: meta.artist || fallback.artist,
    album: meta.album,
    duration: meta.duration,
    addedAt: Date.now(),
    file,
    artwork: meta.artwork,
  };
}

export async function importFiles(files: Iterable<File>): Promise<LibraryRecord[]> {
  const records: LibraryRecord[] = [];
  for (const file of files) {
    if (isAudioFile(file)) {
      records.push(await importFile(file));
    }
  }
  return records;
}
