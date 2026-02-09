export interface PresignUploadRequest {
  fileName: string;
  contentType?: string;
}

export interface PresignUploadResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface UploadRecordingResponse {
  s3Key: string;
}

export interface SendEmailRequest {
  s3Key: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface GetDownloadResponse {
  audioUrl: string;
}
