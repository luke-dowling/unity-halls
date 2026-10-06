import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

// 5 players + 1 DM — same cap the Daily.co rooms used.
const MAX_PARTICIPANTS = 6;
// Seconds an empty LiveKit room lingers before the server closes it.
const EMPTY_TIMEOUT_SECONDS = 5 * 60;
// Matches the old Daily meeting-token lifetime.
const TOKEN_TTL = "8h";

function getConfig() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    throw new Error("LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }
  return { url, apiKey, apiSecret };
}

/** Public WebSocket URL the browser connects to (e.g. wss://livekit.example.com). */
export function getLiveKitUrl(): string {
  return getConfig().url;
}

/** One LiveKit room per Unity Halls Room, so data messages never cross rooms. */
export function liveKitRoomName(roomId: string): string {
  return `unity-halls-${roomId}`;
}

/**
 * Get-or-create the LiveKit room with the participant cap applied.
 * LiveKit's CreateRoom is idempotent: if the room is already running it is
 * returned unchanged.
 */
export async function ensureLiveKitRoom(roomId: string): Promise<string> {
  const { url, apiKey, apiSecret } = getConfig();
  // The server API speaks HTTP(S) on the same host/port as the WebSocket URL.
  const httpUrl = url.replace(/^ws(s?):\/\//, "http$1://");
  const client = new RoomServiceClient(httpUrl, apiKey, apiSecret);
  const name = liveKitRoomName(roomId);
  await client.createRoom({
    name,
    maxParticipants: MAX_PARTICIPANTS,
    emptyTimeout: EMPTY_TIMEOUT_SECONDS,
  });
  return name;
}

export async function createLiveKitToken(opts: {
  roomName: string;
  identity: string;
  name: string;
  isOwner: boolean;
}): Promise<string> {
  const { apiKey, apiSecret } = getConfig();
  const at = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: TOKEN_TTL,
  });
  at.addGrant({
    room: opts.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Equivalent of Daily's `is_owner`.
    roomAdmin: opts.isOwner,
  });
  return at.toJwt();
}
