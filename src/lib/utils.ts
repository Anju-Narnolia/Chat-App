import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Serializes MongoDB documents for client consumption
 * Converts ObjectIds to strings and handles other MongoDB-specific types
 */
export function serializeMongoDocument<T>(doc: T): T {
  if (doc === null || doc === undefined) {
    return doc;
  }

  if (Array.isArray(doc)) {
    return doc.map(item => serializeMongoDocument(item)) as unknown as T;
  }

  if (typeof doc === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(doc)) {
      if (value && typeof value === 'object' && value._bsontype === 'ObjectID') {
        // Convert ObjectId to string
        serialized[key] = value.toString();
      } else if (value && typeof value === 'object' && value.toJSON) {
        // Handle objects with toJSON method (like ObjectId)
        serialized[key] = value.toString();
      } else if (Array.isArray(value)) {
        serialized[key] = serializeMongoDocument(value);
      } else if (typeof value === 'object') {
        serialized[key] = serializeMongoDocument(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  return doc;
}
