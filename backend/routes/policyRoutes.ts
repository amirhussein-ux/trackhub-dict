import { Router } from "express";
import {
  approvePolicy,
  archivePolicyAction,
  createPolicy,
  deletePolicy,
  documentUploaded,
  grantPolicyAccess,
  getPolicies,
  getPolicyById,
  markReviewReady,
  publishPolicyAction,
  rejectPolicy,
  updatePolicy,
} from "../controllers/policyController";
import { validateRequest } from "../middleware/validateRequest";
import {
  approvePolicyBodySchema,
  archivePolicyBodySchema,
  createPolicyBodySchema,
  documentUploadedBodySchema,
  grantAccessBodySchema,
  policyParamsSchema,
  publishPolicyBodySchema,
  rejectPolicyBodySchema,
  reviewReadyBodySchema,
  updatePolicyBodySchema,
} from "../validation/policySchemas";

const router = Router();

// Policy CRUD endpoints.
router.post("/", validateRequest({ body: createPolicyBodySchema }), createPolicy);
router.get("/", getPolicies);
router.get("/:id", validateRequest({ params: policyParamsSchema }), getPolicyById);
router.put("/:id", validateRequest({ params: policyParamsSchema, body: updatePolicyBodySchema }), updatePolicy);
router.delete("/:id", validateRequest({ params: policyParamsSchema }), deletePolicy);

// Workflow automation actions.
router.post(
  "/:id/actions/grant-access",
  validateRequest({ params: policyParamsSchema, body: grantAccessBodySchema }),
  grantPolicyAccess
);
router.post(
  "/:id/actions/review-ready",
  validateRequest({ params: policyParamsSchema, body: reviewReadyBodySchema }),
  markReviewReady
);
router.post(
  "/:id/actions/approve",
  validateRequest({ params: policyParamsSchema, body: approvePolicyBodySchema }),
  approvePolicy
);
router.post(
  "/:id/actions/reject",
  validateRequest({ params: policyParamsSchema, body: rejectPolicyBodySchema }),
  rejectPolicy
);
router.post(
  "/:id/actions/document-uploaded",
  validateRequest({ params: policyParamsSchema, body: documentUploadedBodySchema }),
  documentUploaded
);
router.post(
  "/:id/actions/publish",
  validateRequest({ params: policyParamsSchema, body: publishPolicyBodySchema }),
  publishPolicyAction
);
router.post(
  "/:id/actions/archive",
  validateRequest({ params: policyParamsSchema, body: archivePolicyBodySchema }),
  archivePolicyAction
);

export default router;
