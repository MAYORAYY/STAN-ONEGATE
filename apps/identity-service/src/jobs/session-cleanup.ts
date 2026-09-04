import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

const SESSION_TTL_MINUTES = Number(process.env.SESSION_TTL_MINUTES ?? 120);

export async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - SESSION_TTL_MINUTES * 60 * 1000);

  const result = await prisma.linked_accounts.updateMany({
    where: {
      updated_at: { lt: cutoff },
      OR: [
        { portal_session: { not: null } },
        { lms_session: { not: null } },
      ],
    },
    data: {
      portal_session: null,
      lms_session: null,
    },
  });

  if (result.count > 0) {
    console.log(`[session-cleanup] Membersihkan ${result.count} sesi kedaluwarsa - ${new Date().toISOString()}`);
  }

  return result.count;
}

export function startSessionCleanupJob() {
  cron.schedule("*/10 * * * *", cleanupExpiredSessions);
  console.log(`[session-cleanup] Job aktif, TTL sesi: ${SESSION_TTL_MINUTES} menit`);
}