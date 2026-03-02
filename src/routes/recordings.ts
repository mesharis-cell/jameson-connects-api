import { Router, Request, Response } from 'express';
import { generatePresignedUploadUrl, generatePresignedDownloadUrl, uploadFile, getAudioFile } from '../services/s3';
import { sendRecordingEmail } from '../services/email';
import {
  PresignUploadRequest,
  PresignUploadResponse,
  SendEmailRequest,
  SendEmailResponse,
  GetDownloadResponse,
  UploadRecordingResponse,
} from '../types';

const router = Router();

/** Proxy upload handler (mounted in index.ts with express.raw() before json). */
export async function uploadRecordingHandler(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body;
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: 'Request body must be the raw audio file' });
      return;
    }

    const contentType = (req.headers['content-type'] as string) || 'audio/webm';
    const fileNameHeader = req.headers['x-file-name'] as string;
    const rawFileName =
      fileNameHeader && String(fileNameHeader).trim()
        ? String(fileNameHeader).trim()
        : 'recording.webm';
    const fileName = rawFileName
      .replace(/^.*[\\/]/, '')
      .replace(/[^A-Za-z0-9._-]/g, '');
    const safeFileName = fileName || 'recording.webm';
    const s3Key = `recordings/${safeFileName}`;

    await uploadFile(s3Key, body, contentType);

    res.status(201).json({ s3Key } as UploadRecordingResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('[sessions/upload] Error:', message);
    if (stack) console.error(stack);
    res.status(500).json({
      error: 'Failed to upload recording',
      detail: message,
    });
  }
}

// Generate presigned upload URL (legacy; prefer /sessions/upload proxy)
router.post('/sessions/presign-upload', async (req: Request<Record<string, never>, Record<string, never>, PresignUploadRequest>, res: Response) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const { uploadUrl, s3Key } = await generatePresignedUploadUrl(
      fileName,
      600,
      contentType || 'audio/mpeg'
    );

    const response: PresignUploadResponse = {
      uploadUrl,
      s3Key,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// Send email with MP3 attachment (no DB; uses s3Key + user data from body)
router.post('/send-email', async (req: Request<Record<string, never>, Record<string, never>, SendEmailRequest>, res: Response) => {
  try {
    const { s3Key, email: emailRaw, firstName: firstNameRaw, lastName: lastNameRaw } = req.body;

    if (!s3Key || !emailRaw || !firstNameRaw || !lastNameRaw) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: s3Key, email, firstName, lastName',
      });
    }

    const email = String(emailRaw).trim().toLowerCase();
    const firstName = String(firstNameRaw).trim();
    const lastName = String(lastNameRaw).trim();

    console.log(`[send-email] Sending recording to ${email} (s3Key: ${s3Key})`);

    const { messageId } = await sendRecordingEmail({
      to: email,
      firstName,
      lastName,
      s3Key,
    });

    console.log(`[send-email] Sent successfully to ${email}, messageId: ${messageId}`);

    const response: SendEmailResponse = {
      success: true,
      messageId,
    };

    return res.json(response);
  } catch (error) {
    console.error('[send-email] Error:', error);

    const response: SendEmailResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };

    return res.status(500).json(response);
  }
});

// Get presigned download URL by S3 key (for QR code / download app; no DB)
router.get('/download', async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;

    if (!key) {
      return res.status(400).json({ error: 'Query parameter "key" (s3Key) is required' });
    }

    const audioUrl = await generatePresignedDownloadUrl(key, 3600);

    const response: GetDownloadResponse = {
      audioUrl,
    };

    return res.json(response);
  } catch (error) {
    console.error('Error generating download URL:', error);
    return res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Download raw audio file via API proxy (keeps downloader simple and avoids CORS issues)
router.get('/download/file', async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.query.key as string;
    if (!key) {
      res.status(400).json({ error: 'Query parameter "key" (s3Key) is required' });
      return;
    }

    const audioBuffer = await getAudioFile(key);
    const fileName = key.split('/').pop() || 'recording.wav';
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
    const contentTypeByExt: Record<string, string> = {
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.mp4': 'audio/mp4',
    };
    const contentType = contentTypeByExt[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(audioBuffer);
    return;
  } catch (error) {
    console.error('Error downloading audio file:', error);
    res.status(500).json({ error: 'Failed to download audio file' });
    return;
  }
});

export default router;
