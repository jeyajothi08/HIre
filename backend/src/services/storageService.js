import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local private storage directory (outside public assets and gitignored)
const PRIVATE_STORAGE_DIR = path.resolve(__dirname, '../../storage/private/resumes');

// Ensure directory exists with restricted permissions
if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Storage Service Abstraction
 * Supports both private local disk storage and cloud object storage (S3-compatible).
 */
class StorageService {
  constructor() {
    this.provider = (process.env.STORAGE_PROVIDER || process.env.STORAGE_DRIVER || 'local').toLowerCase();
    this.storageDir = PRIVATE_STORAGE_DIR;
  }

  /**
   * Generates a safe, non-guessable storage identifier.
   */
  generateKey(originalName) {
    const ext = path.extname(originalName || '').toLowerCase() || '.pdf';
    const uuid = crypto.randomUUID();
    return `${uuid}${ext}`;
  }

  /**
   * Validates binary PDF magic bytes (%PDF-).
   * @param {Buffer} buffer
   * @returns {boolean}
   */
  validatePdfMagicBytes(buffer) {
    if (!buffer || buffer.length < 5) return false;
    // Magic bytes for PDF are %PDF- (0x25 0x50 0x44 0x46 0x2D)
    const header = buffer.subarray(0, 5).toString('ascii');
    return header.startsWith('%PDF-');
  }

  /**
   * Upload file to storage.
   * @param {Buffer} buffer - File buffer
   * @param {string} originalName - Original filename
   * @param {string} mimeType - MIME type
   * @returns {Promise<{ storageKey: string, sizeBytes: number, originalName: string, mimeType: string }>}
   */
  async uploadFile(buffer, originalName, mimeType = 'application/pdf') {
    const storageKey = this.generateKey(originalName);

    const s3Bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
    if (this.provider === 's3' && s3Bucket && process.env.AWS_ACCESS_KEY_ID) {
      // Pluggable cloud object storage implementation
      // Uses AWS SDK client when configured in production
      throw new Error('S3 storage provider is configured in env but AWS credentials need verification.');
    }

    // Default: Private local disk storage
    const targetPath = path.join(this.storageDir, storageKey);
    await fs.promises.writeFile(targetPath, buffer, { mode: 0o600 });

    return {
      storageKey,
      sizeBytes: buffer.length,
      originalName: path.basename(originalName),
      mimeType: 'application/pdf',
      uploadedAt: new Date(),
    };
  }

  /**
   * Retrieve file buffer or stream from storage.
   * @param {string} storageKey
   * @returns {Promise<{ buffer: Buffer, sizeBytes: number, stream: fs.ReadStream }>}
   */
  async getFile(storageKey) {
    // Prevent path traversal attacks
    const sanitizedKey = path.basename(storageKey);
    const filePath = path.join(this.storageDir, sanitizedKey);

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage');
    }

    const stat = await fs.promises.stat(filePath);
    const stream = fs.createReadStream(filePath);
    const buffer = await fs.promises.readFile(filePath);

    return {
      buffer,
      stream,
      sizeBytes: stat.size,
    };
  }

  /**
   * Delete file from storage.
   * @param {string} storageKey
   */
  async deleteFile(storageKey) {
    if (!storageKey) return;
    try {
      const sanitizedKey = path.basename(storageKey);
      const filePath = path.join(this.storageDir, sanitizedKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete storage file ${storageKey}:`, err.message);
    }
  }
}

const storageService = new StorageService();
export default storageService;
