import { Request, Response } from "express";

// Returns a 404 payload for unknown API routes.
const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ message: "Route not found." });
};

export default notFound;
