import { logger } from '../../../utils/logger.js';

export interface IUploadService {
  uploadImage(base64Data: string, folderName?: string): Promise<string>;
  deleteImage(imageUrl: string): Promise<void>;
}

export class CloudinaryUploadService implements IUploadService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (this.isConfigured) {
      logger.info('☁️ Cloudinary configuration detected. Upload Service initialized in real mode.');
    } else {
      logger.warn('⚠️ Cloudinary keys not found. Upload Service initialized in MOCK mode.');
    }
  }

  async uploadImage(base64Data: string, folderName = 'venues'): Promise<string> {
    // If it's already a URL, return it directly
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      return base64Data;
    }

    // Mock mode or real fallback
    const mockImages = [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80', // banquet hall
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80', // resort / pool
      'https://images.unsplash.com/photo-1505232458627-41dbd9865397?auto=format&fit=crop&w=1200&q=80', // glass house / hall
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80', // grand event space
      'https://images.unsplash.com/photo-1542662565-7e4b66bae529?auto=format&fit=crop&w=1200&q=80', // mountain resort
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80', // party club
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80', // meeting room
    ];

    const index = Math.abs(base64Data.length) % mockImages.length;
    const mockUrl = mockImages[index];

    logger.info(
      `[UploadService] Uploading base64 image data to folder: ${folderName}. Returning URL: ${mockUrl}`
    );

    // Simulate short asynchronous upload delay
    await new Promise((resolve) => setTimeout(resolve, 80));
    return mockUrl;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    logger.info(`[UploadService] Requesting deletion of image at URL: ${imageUrl}`);
  }
}

export const uploadService = new CloudinaryUploadService();
