import "server-only";
import { spawn } from "node:child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

/**
 * Browsers record voice notes as Opus-in-WebM, which Meta's media upload
 * rejects outright (it isn't in Meta's accepted mime list for any message
 * type, audio or document). Opus itself is fine — Meta wants it in an Ogg
 * container — so this just re-muxes the existing Opus stream (`-c:a copy`,
 * no re-encode, no quality loss), it doesn't transcode audio.
 */
export async function remuxWebmOpusToOgg(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegInstaller.path, ["-i", "pipe:0", "-c:a", "copy", "-f", "ogg", "pipe:1"]);

    const chunks: Buffer[] = [];
    let stderr = "";
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    proc.on("error", reject);
    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Дауыс файлы түрлендірілмеді (ffmpeg ${code}): ${stderr.slice(-400)}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}
