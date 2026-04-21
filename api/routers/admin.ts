import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { adminUsers } from "@db/schema";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.APP_SECRET || "default-secret-change-me"
);

export const adminRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.email, input.email),
      });

      if (!user || !compareSync(input.password, user.passwordHash)) {
        throw new Error("Invalid email or password");
      }

      // Create JWT token
      const token = await new SignJWT({
        email: user.email,
        name: user.name,
        role: "admin",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      // Also create a simple base64 token for x-admin-token header
      const simpleToken = Buffer.from(
        JSON.stringify({ email: user.email, role: "admin", exp: Date.now() + 7 * 24 * 3600 * 1000 })
      ).toString("base64");

      return {
        token,
        simpleToken,
        user: {
          email: user.email,
          name: user.name,
        },
      };
    }),

  verify: publicQuery.query(async ({ ctx }) => {
    const authHeader = ctx.req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { isAdmin: false };
    }

    const token = authHeader.slice(7);
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
      return {
        isAdmin: true,
        user: {
          email: payload.email as string,
          name: payload.name as string,
        },
      };
    } catch {
      return { isAdmin: false };
    }
  }),

  changePassword: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        oldPassword: z.string().min(1),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const user = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.email, input.email),
      });

      if (!user || !compareSync(input.oldPassword, user.passwordHash)) {
        throw new Error("Invalid credentials");
      }

      const { hashSync } = await import("bcryptjs");
      await db
        .update(adminUsers)
        .set({ passwordHash: hashSync(input.newPassword, 10) })
        .where(eq(adminUsers.id, user.id));

      return { success: true };
    }),
});
