import { NextFunction, Request, Response } from "express";
import Item from "../models/Item";

// Create a new item.
export const createItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// Get all items.
export const getItems = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

// Get a single item by id.
export const getItemById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      res.status(404).json({ message: "Item not found." });
      return;
    }

    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
};

// Update an item by id.
export const updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      res.status(404).json({ message: "Item not found." });
      return;
    }

    res.status(200).json(updatedItem);
  } catch (error) {
    next(error);
  }
};

// Delete an item by id.
export const deleteItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      res.status(404).json({ message: "Item not found." });
      return;
    }

    res.status(200).json({ message: "Item deleted successfully." });
  } catch (error) {
    next(error);
  }
};
