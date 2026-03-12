import { Document, Schema, model } from "mongoose";

// TypeScript interface for an Item document.
export interface IItem extends Document {
  title: string;
  description: string;
  status: string;
  createdAt: Date;
}

// Mongoose schema for items used by the REST API.
const itemSchema = new Schema<IItem>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Item = model<IItem>("Item", itemSchema);

export default Item;
