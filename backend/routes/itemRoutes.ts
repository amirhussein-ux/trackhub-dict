import { Router } from "express";
import {
  createItem,
  deleteItem,
  getItemById,
  getItems,
  updateItem,
} from "../controllers/itemController";
import { validateRequest } from "../middleware/validateRequest";
import { createItemBodySchema, itemParamsSchema, updateItemBodySchema } from "../validation/itemSchemas";

const router = Router();

// CRUD routes for items.
router.post("/", validateRequest({ body: createItemBodySchema }), createItem);
router.get("/", getItems);
router.get("/:id", validateRequest({ params: itemParamsSchema }), getItemById);
router.put("/:id", validateRequest({ params: itemParamsSchema, body: updateItemBodySchema }), updateItem);
router.delete("/:id", validateRequest({ params: itemParamsSchema }), deleteItem);

export default router;
