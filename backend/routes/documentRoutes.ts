import { Router } from "express";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  getDocuments,
  updateDocument,
} from "../controllers/documentController";
import { validateRequest } from "../middleware/validateRequest";
import { createDocumentBodySchema, documentParamsSchema, updateDocumentBodySchema } from "../validation/documentSchemas";

const router = Router();

// Document repository CRUD endpoints.
router.post("/", validateRequest({ body: createDocumentBodySchema }), createDocument);
router.get("/", getDocuments);
router.get("/:id", validateRequest({ params: documentParamsSchema }), getDocumentById);
router.put("/:id", validateRequest({ params: documentParamsSchema, body: updateDocumentBodySchema }), updateDocument);
router.delete("/:id", validateRequest({ params: documentParamsSchema }), deleteDocument);

export default router;
