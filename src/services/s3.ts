import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  // Don't add checksum to presigned URLs so browser PUT (without checksum) is accepted by S3
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export async function generatePresignedUploadUrl(
  fileName: string,
  expiresIn: number = 600,
  contentType: string = 'audio/mpeg'
): Promise<{ uploadUrl: string; s3Key: string }> {
  const safeFileName = (fileName || 'recording.webm')
    .replace(/^.*[\\/]/, '')
    .replace(/[^A-Za-z0-9._-]/g, '') || 'recording.webm';
  const s3Key = `recordings/${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { uploadUrl, s3Key };
}

export async function generatePresignedDownloadUrl(
  s3Key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return downloadUrl;
}

export async function getAudioFile(s3Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('No file content received from S3');
  }

  // Convert stream to buffer
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export async function uploadFile(
  s3Key: string,
  fileBuffer: Buffer,
  contentType: string = 'audio/mpeg'
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
}
