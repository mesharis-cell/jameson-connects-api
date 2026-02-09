import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  resendApiKey: process.env.RESEND_API_KEY || '',
  aws: {
    region: process.env.AWS_REGION || 'me-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'jam0036-jameson-recording',
  },
  fromEmail: process.env.FROM_EMAIL || 'noreply@jamesonconnects.com',
};

export function validateConfig() {
  const required = [
    'RESEND_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
  ];

  const missing = required.filter((key) => {
    const v = process.env[key];
    return v === undefined || v === null || String(v).trim() === '';
  });

  if (missing.length > 0) {
    console.error(`Missing or empty environment variables: ${missing.join(', ')}`);
    console.error('Create a .env file in the jameson-api folder (see .env.example).');
    console.error('Variable names must be exactly: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_REGION');
    process.exit(1);
  }
}
