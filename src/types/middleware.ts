// Type for middleware that can be attached to Express at a specific path
export type MiddlewareAttacher = (path: string) => void;

// Configuration for a single middleware
export type MiddlewareConfig = {
  name: string;
  required?: boolean;  // Can't be omitted
  priority?: number;   // Higher priority = loads first, default 0
  enabled?: boolean;   // Allow disabling without removing from list
};

// Configuration mapping paths to their middlewares
export type MiddlewarePathConfig = {
  [path: string]: MiddlewareConfig[];
};