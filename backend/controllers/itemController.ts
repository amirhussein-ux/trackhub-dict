import { NextFunction, Request, Response } from "express";
import Item from "../models/Item";
import { canAccessItem, getAuthenticatedUser, isPrivilegedUser } from "../utils/ownership";

// Create a new item.
export const createItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const { owner, ...itemData } = req.body as Record<string, unknown>;
    const item = await Item.create({
      ...itemData,
      owner: currentUser.identifier,
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

// Get all items.
export const getItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const items = isPrivilegedUser(currentUser)
      ? await Item.find().sort({ createdAt: -1 })
      : await Item.find({ owner: currentUser.identifier }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

// Get a single item by id.
export const getItemById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const item = await Item.findById(req.params.id);

    if (!item || !canAccessItem(currentUser, item)) {
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
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const existingItem = await Item.findById(req.params.id);
    if (!existingItem || !canAccessItem(currentUser, existingItem)) {
      res.status(404).json({ message: "Item not found." });
      return;
    }

    const { owner, ...updateData } = req.body as Record<string, unknown>;
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData, {
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
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const existingItem = await Item.findById(req.params.id);
    if (!existingItem || !canAccessItem(currentUser, existingItem)) {
      res.status(404).json({ message: "Item not found." });
      return;
    }

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
