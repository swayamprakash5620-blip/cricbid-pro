import { NextRequest } from "next/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import {
  getRoomState,
  roomEmitter,
  tickRoomAutomation,
} from "@/lib/auction-engine";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const normalizedCode = code.toUpperCase();
  const token =
    new URL(req.url).searchParams.get("token") ||
    req.headers.get("x-participant-token");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastSentVersion = -1;
      let pushing = false;

      const sendState = async (force = false) => {
        if (closed || pushing) return;
        pushing = true;
        try {
          await tickRoomAutomation(normalizedCode);
          const [vRow] = await db
            .select({ version: rooms.version })
            .from(rooms)
            .where(eq(rooms.code, normalizedCode));

          if (!vRow) {
            controller.enqueue(
              encoder.encode(`event: error_msg\ndata: ${JSON.stringify({ error: "Room not found" })}\n\n`)
            );
            return;
          }

          if (!force && vRow.version === lastSentVersion) {
            // Send lightweight clock sync ping
            controller.enqueue(
              encoder.encode(
                `event: ping\ndata: ${JSON.stringify({ serverNow: new Date().toISOString() })}\n\n`
              )
            );
            return;
          }

          const state = await getRoomState(normalizedCode, token);
          if (state && !closed) {
            lastSentVersion = state.version;
            controller.enqueue(
              encoder.encode(`event: state\ndata: ${JSON.stringify(state)}\n\n`)
            );
          }
        } catch {
          // Ignore transient stream errors after close
        } finally {
          pushing = false;
        }
      };

      await sendState(true);

      const onNotify = () => {
        void sendState(true);
      };

      const eventKey = `room:${normalizedCode}`;
      roomEmitter.on(eventKey, onNotify);

      const intervalId = setInterval(() => {
        void sendState(false);
      }, 1200);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(intervalId);
        roomEmitter.off(eventKey, onNotify);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
