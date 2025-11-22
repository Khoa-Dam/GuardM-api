// src/cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import toStream = require('streamifier');
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    async uploadImage(
        file: Express.Multer.File,
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        return new Promise((resolve, reject) => {
            const upload = cloudinary.uploader.upload_stream(
                {
                    folder: 'crime_alert_evidence', // Tên folder trên Cloudinary
                    // Tự động tạo 2 phiên bản: 1 ảnh gốc, 1 ảnh nhỏ (preview) nếu cần
                    // transformation: [{ width: 1000, crop: "limit" }] 
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) {
                        return reject(new Error('Cloudinary upload returned undefined result'));
                    }
                    resolve(result);
                },
            );

            // Chuyển buffer thành stream và đẩy lên Cloudinary
            toStream.createReadStream(file.buffer).pipe(upload);
        });
    }
}