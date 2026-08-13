type GoogleTokenHeader = { alg?: string; kid?: string };
type GoogleTokenPayload = {
  sub?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type GoogleJwks = { keys?: JsonWebKey[] };
let cachedKeys: { keys: JsonWebKey[]; expiresAt: number } | null = null;

const allowedOrigin = (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const configured = (process.env.AUTH_ALLOWED_ORIGINS ?? process.env.CHAT_ALLOWED_ORIGINS ?? "http://localhost:3000,https://max8722-bit.github.io,https://boardpick-shop.max8722.chatgpt.site")
    .split(",")
    .map((value) => value.trim());
  return configured.includes(origin) ? origin : "";
};

const json = (body: unknown, status = 200, origin?: string) => Response.json(body, {
  status,
  headers: {
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Cache-Control": "no-store",
  },
});

const base64UrlBytes = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const decodePart = <T,>(value: string) => JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as T;

const getGoogleKeys = async () => {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) throw new Error("Google 공개 인증키를 불러오지 못했습니다.");
  const result = await response.json() as GoogleJwks;
  if (!result.keys?.length) throw new Error("Google 공개 인증키가 비어 있습니다.");
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 1800);
  cachedKeys = { keys: result.keys, expiresAt: Date.now() + Math.max(300, maxAge) * 1000 };
  return result.keys;
};

const verifyGoogleCredential = async (credential: string, clientId: string) => {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Google 인증 정보 형식이 올바르지 않습니다.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodePart<GoogleTokenHeader>(encodedHeader);
  const payload = decodePart<GoogleTokenPayload>(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) throw new Error("지원하지 않는 Google 인증 방식입니다.");
  const keys = await getGoogleKeys();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Google 인증키를 찾지 못했습니다.");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlBytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
  if (!verified) throw new Error("Google 서명을 확인하지 못했습니다.");
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(clientId)) throw new Error("Google 앱 인증 대상이 일치하지 않습니다.");
  if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") throw new Error("Google 인증 발급자를 확인하지 못했습니다.");
  if (!payload.exp || payload.exp <= now) throw new Error("Google 로그인 시간이 만료되었습니다.");
  if (payload.iat && payload.iat > now + 60) throw new Error("Google 인증 시간이 올바르지 않습니다.");
  if (!payload.sub || !payload.email || payload.email_verified !== true) throw new Error("확인된 Google 이메일 계정이 필요합니다.");
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    ...(payload.picture ? { picture: payload.picture } : {}),
  };
};

export async function OPTIONS(request: Request) {
  const origin = allowedOrigin(request);
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}

export async function GET(request: Request) {
  const origin = allowedOrigin(request);
  const requestOrigin = request.headers.get("origin");
  const sameOrigin = !requestOrigin || requestOrigin === new URL(request.url).origin;
  if (!origin && !sameOrigin) return json({ message: "허용되지 않은 요청입니다." }, 403);
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  return json({ configured: Boolean(clientId), ...(clientId ? { clientId } : {}) }, 200, origin);
}

export async function POST(request: Request) {
  const origin = allowedOrigin(request);
  const requestOrigin = request.headers.get("origin");
  const sameOrigin = !requestOrigin || requestOrigin === new URL(request.url).origin;
  if (!origin && !sameOrigin) return json({ message: "허용되지 않은 요청입니다." }, 403);
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return json({ message: "Google 로그인이 아직 설정되지 않았습니다." }, 503, origin);
  let credential = "";
  try {
    const body = await request.json() as { credential?: string };
    credential = typeof body.credential === "string" ? body.credential.trim() : "";
  } catch {
    return json({ message: "Google 인증 정보 형식이 올바르지 않습니다." }, 400, origin);
  }
  if (!credential || credential.length > 10000) return json({ message: "Google 인증 정보가 필요합니다." }, 400, origin);
  try {
    const profile = await verifyGoogleCredential(credential, clientId);
    return json({ profile }, 200, origin);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "Google 계정을 확인하지 못했습니다." }, 401, origin);
  }
}
