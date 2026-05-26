import { Router } from "express";
import { requireAuth } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import { getAdvocacy, listAdvocacy, upsertAdvocacy } from "../controllers/advocacyController";
import { upsertAdvocacySchema } from "../validation/advocacySchemas";
import { objectIdParamSchema } from "../validation/common";

const router = Router();

router.get("/advocacy", requireAuth, listAdvocacy);
router.get("/policies/:id/advocacy", requireAuth, validateRequest({ params: objectIdParamSchema }), getAdvocacy);
router.put(
  "/policies/:id/advocacy",
  requireAuth,
  validateRequest({ params: objectIdParamSchema, body: upsertAdvocacySchema }),
  upsertAdvocacy
);

export default router;
