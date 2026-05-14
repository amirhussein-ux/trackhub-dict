import { Document, Schema, model } from "mongoose";

// TypeScript interface for an Item document.
export interface IItem extends Document {
  title: string;
  description: string;
  status: string;
  owner: string;
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
  owner: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

itemSchema.index({ owner: 1, createdAt: -1 });

const Item = model<IItem>("Item", itemSchema);

export default Item;
