import { Resend } from 'resend';
import { config } from '../config';
import { getAudioFile } from './s3';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!config.resendApiKey) {
    throw new Error(
      'Resend API key is not configured. Set RESEND_API_KEY in your .env file. The API can run without it; only the send-email endpoint will fail.'
    );
  }
  if (!resendClient) {
    resendClient = new Resend(config.resendApiKey);
  }
  return resendClient;
}

interface SendRecordingEmailParams {
  to: string;
  firstName: string;
  lastName: string;
  s3Key: string;
}

export async function sendRecordingEmail(
  params: SendRecordingEmailParams
): Promise<{ messageId: string }> {
  const { to, firstName, lastName, s3Key } = params;

  try {
    if (!config.resendApiKey) {
      throw new Error('RESEND_API_KEY is not set. Add it to your .env file.');
    }
    if (!config.fromEmail) {
      throw new Error('FROM_EMAIL is not set. Add it to your .env file.');
    }

    // Get audio file from S3
    const audioBuffer = await getAudioFile(s3Key);

    const ext = s3Key.includes('.') ? s3Key.slice(s3Key.lastIndexOf('.')) : '.mp3';
    const attachmentFilename = `jameson-recording-${Date.now()}${ext}`;

    // Send email with attachment via Resend
    const resend = getResend();
    const response = await resend.emails.send({
      from: config.fromEmail,
      to: [to],
      subject: 'Your Jameson Connects Recording',
      html: generateEmailTemplate(firstName, lastName),
      attachments: [
        {
          filename: attachmentFilename,
          content: audioBuffer,
        },
      ],
    });

    if (response.error) {
      console.error('[Resend] API error:', response.error);
      throw new Error(response.error.message || 'Resend API error');
    }
    if (!response.data?.id) {
      throw new Error('No message ID received from Resend');
    }

    return { messageId: response.data.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

function generateEmailTemplate(firstName: string, lastName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Jameson Connects Recording</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f1e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f1e8; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0d5c3f; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 32px; margin: 0; font-weight: bold;">JAMESON</h1>
              <p style="color: #d4af37; font-size: 14px; margin: 10px 0 0 0; letter-spacing: 2px;">CONNECTS</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #0d5c3f; font-size: 24px; margin: 0 0 20px 0;">Dear ${firstName} ${lastName},</h2>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for creating your special recording at Jameson Connects.
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your recording is attached to this email. You can download it and share it with your friends and family.
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We hope you enjoy listening to your message and that it brings back wonderful memories.
              </p>
              
              <div style="background-color: #f5f1e8; border-left: 4px solid #d4af37; padding: 20px; margin: 30px 0;">
                <p style="color: #0d5c3f; font-size: 14px; margin: 0; font-weight: bold;">
                  🎵 Your recording is attached as an MP3 file
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: #0d5c3f;">The Jameson Connects Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0d5c3f; padding: 30px; text-align: center;">
              <p style="color: #d4af37; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Jameson Connects. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
