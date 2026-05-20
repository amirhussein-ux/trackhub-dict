/**
 * File upload validation utilities
 * Ensures secure file handling across the application
 */

const ALLOWED_MIME_TYPES = {
  documents: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  images: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  spreadsheets: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  all: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ],
};

const DISALLOWED_EXTENSIONS = [
  // Executable files
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".pif",
  ".scr",
  ".vbs",
  ".js",
  ".jar",
  ".zip",
  ".rar",
  ".7z",
  // Scripts
  ".sh",
  ".bash",
  ".zsh",
  ".ksh",
  // Macro-enabled documents
  ".xlsm",
  ".docm",
  ".pptm",
];

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * Validate file size
 * @param fileSizeBytes - File size in bytes
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 50MB)
 * @throws Error if file exceeds maximum size
 */
export function validateFileSize(fileSizeBytes: number, maxSizeBytes: number = 50 * 1024 * 1024): void {
  if (fileSizeBytes === 0) {
    throw new Error("File cannot be empty");
  }

  if (fileSizeBytes > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
    throw new Error(`File size exceeds maximum limit of ${maxSizeMB}MB`);
  }
}

/**
 * Validate MIME type
 * @param mimeType - MIME type to validate
 * @param allowedTypes - Array of allowed MIME types
 * @throws Error if MIME type is not allowed
 */
export function validateMimeType(mimeType: string, allowedTypes: string[] = ALLOWED_MIME_TYPES.all): void {
  if (!mimeType || !allowedTypes.includes(mimeType.toLowerCase())) {
    throw new Error(`File type "${mimeType}" is not allowed`);
  }
}

/**
 * Validate file extension
 * @param filename - Original filename
 * @throws Error if file extension is not allowed
 */
export function validateFileExtension(filename: string): void {
  if (!filename) {
    throw new Error("Filename is required");
  }

  const extension = filename.toLowerCase().substring(filename.lastIndexOf("."));

  if (DISALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error(`File extension "${extension}" is not allowed for security reasons`);
  }
}

/**
 * Validate file has expected magic bytes (partial verification)
 * Helps prevent executable files renamed as documents
 * @param buffer - File buffer
 * @param expectedMimeType - Expected MIME type
 * @throws Error if magic bytes don't match expected type
 */
export function validateMagicBytes(buffer: Buffer, expectedMimeType: string): void {
  if (!buffer || buffer.length < 4) {
    throw new Error("Cannot verify file type: insufficient data");
  }

  // Get first few bytes as hex
  const magicBytes = buffer.slice(0, 8).toString("hex");

  // Common file signatures (magic numbers)
  const signatures: Record<string, string[]> = {
    "application/pdf": ["25504446"], // %PDF
    "image/jpeg": ["ffd8ff"],
    "image/png": ["89504e47"], // PNG
    "image/webp": ["52494646"], // RIFF (WebP uses RIFF container)
    "image/gif": ["474946"],     // GIF87a or GIF89a
    "application/zip": ["504b0304", "504b0506"], // PK ZIP
  };

  const expectedSignatures = signatures[expectedMimeType.toLowerCase()];

  if (expectedSignatures && !expectedSignatures.some((sig) => magicBytes.startsWith(sig))) {
    throw new Error(`File content does not match declared type: ${expectedMimeType}`);
  }
}

/**
 * Comprehensive file validation
 * @param filename - Original filename
 * @param mimeType - MIME type from upload
 * @param fileSizeBytes - File size in bytes
 * @param buffer - Optional file buffer for magic byte validation
 * @param options - Additional validation options
 * @throws Error if validation fails
 */
export function validateUploadedFile(
  filename: string,
  mimeType: string,
  fileSizeBytes: number,
  buffer?: Buffer,
  options: FileValidationOptions = {}
): void {
  const {
    maxSizeBytes = 50 * 1024 * 1024,
    allowedMimeTypes = ALLOWED_MIME_TYPES.all,
    allowedExtensions = [],
  } = options;

  try {
    validateFileExtension(filename);
    validateFileSize(fileSizeBytes, maxSizeBytes);
    validateMimeType(mimeType, allowedMimeTypes);

    // If buffer is provided, validate magic bytes
    if (buffer) {
      validateMagicBytes(buffer, mimeType);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("File validation failed");
  }
}

/**
 * Get allowed MIME types for a category
 * @param category - Category name ('documents', 'images', 'spreadsheets', 'all')
 * @returns Array of allowed MIME types
 */
export function getAllowedMimeTypesForCategory(
  category: keyof typeof ALLOWED_MIME_TYPES
): string[] {
  return ALLOWED_MIME_TYPES[category] || ALLOWED_MIME_TYPES.all;
}

export default {
  validateFileSize,
  validateMimeType,
  validateFileExtension,
  validateMagicBytes,
  validateUploadedFile,
  getAllowedMimeTypesForCategory,
};
