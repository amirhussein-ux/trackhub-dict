import { Router } from "express";
import { createActivity, getActivities } from "../controllers/activityController";

const router = Router();

// Activity log endpoints.
router.post("/", createActivity);
router.get("/", getActivities);

export default router;
