import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// Admin middleware - checks admin token in x-admin-token header
export const adminQuery = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.req.headers.get("x-admin-token");
  if (!token) {
    throw new Error("Unauthorized: Admin token required");
  }
  // Verify token is valid (simple check - token contains admin email)
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    if (!payload.email || payload.role !== "admin") {
      throw new Error("Invalid admin token");
    }
  } catch {
    throw new Error("Invalid admin token format");
  }
  return next();
});
