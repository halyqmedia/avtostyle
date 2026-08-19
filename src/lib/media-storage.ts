import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.AWS_S3_BUCKET_NAME;

function client() {
  return new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL,
    region: process.env.AWS_DEFAULT_REGION || "auto",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: false,
  });
}

/** Uploads a file to the bucket and returns its object key (not a public URL — the bucket is private). */
export async function uploadMedia(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!bucket) throw new Error("Object storage бапталмаған (AWS_S3_BUCKET_NAME жоқ)");

  await client().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
  return key;
}

/** Reads a stored file back into memory — used when we need to re-upload it elsewhere (e.g. to Meta). */
export async function downloadMedia(key: string): Promise<Buffer> {
  if (!bucket) throw new Error("Object storage бапталмаған (AWS_S3_BUCKET_NAME жоқ)");

  const res = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = res.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Short-lived signed URL for displaying/downloading a stored media file. */
export async function getMediaUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (!bucket) throw new Error("Object storage бапталмаған (AWS_S3_BUCKET_NAME жоқ)");

  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
