export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  created_at: string;
  original_filename: string;
  duration?: number; // for video
}

export interface CloudinaryUploadOptions {
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: Array<Record<string, any>>;
  tags?: string[];
  context?: Record<string, string>;
  overwrite?: boolean;
  unique_filename?: boolean;
  use_filename?: boolean;
  folder?: string;
}

export interface CloudinaryDeleteResult {
  result: 'ok' | 'not found';
  public_id: string;
}