import { Router } from "express";
import {
  createPolicy,
  deletePolicy,
  getPolicies,
  getPolicyById,
  updatePolicy,
} from "../controllers/policyController";

const router = Router();

// Policy CRUD endpoints.
router.post("/", createPolicy);
router.get("/", getPolicies);
router.get("/:id", getPolicyById);
router.put("/:id", updatePolicy);
router.delete("/:id", deletePolicy);

export default router;
