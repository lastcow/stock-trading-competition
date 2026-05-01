import { createRouter, publicQuery } from "./middleware";
import { participantRouter } from "./routers/participant";
import { capitalRouter } from "./routers/capital";
import { competitionRouter } from "./routers/competition";
import { adminRouter } from "./routers/admin";
import { marketIndexRouter } from "./routers/marketIndex";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  participant: participantRouter,
  capital: capitalRouter,
  competition: competitionRouter,
  admin: adminRouter,
  marketIndex: marketIndexRouter,
});

export type AppRouter = typeof appRouter;
