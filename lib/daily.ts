const DAILY_API_BASE = "https://api.daily.co/v1";

function dailyHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
  };
}

export async function getDailyRoom(): Promise<{ url: string; name: string }> {
  const roomName = process.env.DAILY_ROOM_NAME ?? "unity-halls";

  // Try to fetch existing room first
  const getRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    headers: dailyHeaders(),
    cache: "no-store",
  });

  if (getRes.ok) {
    const room = await getRes.json();
    return { url: room.url as string, name: room.name as string };
  }

  // Create if not found
  const createRes = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: dailyHeaders(),
    body: JSON.stringify({
      name: roomName,
      properties: {
        enable_chat: false,
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
        max_participants: 6, // 5 players + 1 DM
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Daily room: ${err}`);
  }

  const room = await createRes.json();
  return { url: room.url as string, name: room.name as string };
}

export async function createDailyToken(
  roomName: string,
  userName: string,
  isOwner: boolean
): Promise<string> {
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: dailyHeaders(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 hours
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Daily token: ${err}`);
  }

  const data = await res.json();
  return data.token as string;
}
