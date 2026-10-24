import React, { Suspense } from "react";
import type { Metadata } from "next";
import { AuctionRoomClient } from "@/components/AuctionRoomClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  return {
    title: `Join Auction Room ${upperCode} — CRICBID PRO Live Cricket Auction`,
    description: `Click to join live cricket auction room ${upperCode}! Claim a franchise, track custom purse & overseas limits, and bid in real time.`,
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center text-white font-display text-2xl uppercase tracking-wider">
          Loading Broadcast Arena...
        </div>
      }
    >
      <AuctionRoomClient roomCode={code} />
    </Suspense>
  );
}
