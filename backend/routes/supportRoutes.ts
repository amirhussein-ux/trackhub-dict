import { Router } from "express";
import multer from "multer";
import path from "path";
import { submitSupportTicket } from "../controllers/supportController";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

const allowedExtensions = new Set([".pdf", ".docx", ".png", ".jpg", ".jpeg"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeTypeAllowed = allowedMimeTypes.has(file.mimetype);
    const extensionAllowed = allowedExtensions.has(extension);

    if (!mimeTypeAllowed || !extensionAllowed) {
      callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "attachment"));
      return;
    }

    callback(null, true);
  },
});

const router = Router();

router.post("/", upload.single("attachment"), submitSupportTicket);

export default router;
