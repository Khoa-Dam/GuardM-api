// src/cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import toStream = require('streamifier');
import { UploadApiResponse, UploadApiErrorResponse, UploadApiOptions } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    async uploadImage(
        file: Express.Multer.File,
        options?: UploadApiOptions,
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                {
                    folder: 'crime_alert_evidence',
                    ...options,
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) {
                        return reject(new Error('Cloudinary upload returned undefined result'));
                    }
                    resolve(result);
                },
            );

            toStream.createReadStream(file.buffer).pipe(upload);
        });
    }

    async deleteImage(publicId: string) {
        if (!publicId) {
            return;
        }

        await cloudinary.uploader.destroy(publicId, { invalidate: true });
    }

    extractPublicIdFromUrl(url: string): string | null {
        if (!url) return null;

        const cleanUrl = url.split('?')[0];
        const match = cleanUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)$/);

        return match ? match[1] : null;
    }

    async deleteImageByUrl(url: string) {
        const publicId = this.extractPublicIdFromUrl(url);
        if (!publicId) {
            return;
        }
        await this.deleteImage(publicId);
    }

    /**
     * Upload image/video from base64 string
     */
    async uploadFromBase64(base64String: string, options?: UploadApiOptions): Promise<UploadApiResponse | UploadApiErrorResponse> {
        // Extract mime type and data from base64 string
        // Format: data:image/png;base64,iVBORw0KGgo...
        const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid base64 string format. Expected format: data:image/png;base64,...');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        // Determine resource_type from mime type
        let resourceType: 'image' | 'video' | 'auto' = 'auto';
        if (mimeType.startsWith('image/')) {
            resourceType = 'image';
        } else if (mimeType.startsWith('video/')) {
            resourceType = 'video';
        }

        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
                `data:${mimeType};base64,${base64Data}`,
                {
                    folder: 'crime_alert_evidence',
                    resource_type: resourceType,
                    ...options,
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) {
                        return reject(new Error('Cloudinary upload returned undefined result'));
                    }
                    resolve(result);
                },
            );
        });
    }

    /**
     * Check if a string is a base64 data URL
     */
    isBase64DataUrl(str: string): boolean {
        return /^data:([^;]+);base64,/.test(str);
    }
}