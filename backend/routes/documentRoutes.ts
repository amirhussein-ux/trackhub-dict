import { Router } from "express";
import {
  createDocument,
  deleteDocument,
  getDocuments,
  updateDocument,
} from "../controllers/documentController";

const router = Router();

// Document repository CRUD endpoints.
router.post("/", createDocument);
router.get("/", getDocuments);
router.put("/:id", updateDocument);
router.delete("/:id", deleteDocument);

export default router;
