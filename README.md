# Jameson Recording Booth - API Service

Express/TypeScript API for managing recording sessions and email delivery.

## Features

- Session storage (MongoDB)
- S3 presigned URL generation
- Email delivery with MP3 attachments (Resend)
- Session retrieval for track downloader

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (see `.env.example`)

3. Start MongoDB locally or use MongoDB Atlas

4. Run development server:
```bash
npm run dev
```

## API Endpoints

### POST /sessions/presign-upload
Generate presigned URL for S3 upload

### POST /sessions
Create new recording session

### GET /sessions/:id
Retrieve session details (for downloader)

### POST /sessions/:id/send-email
Send recording via email

## Deployment

Deploy to AWS Elastic Beanstalk:

```bash
npm run build
# Upload dist/ folder to EB
```
