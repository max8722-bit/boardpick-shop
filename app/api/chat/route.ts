type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: string };
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

const PRODUCT_CONTEXT = `
보드픽 주요 상품:
- 달빛 정원: 2~4인, 40분, 난이도 쉬움, 가족·전략, 42,000원
- 코스믹 카페: 3~6인, 25분, 난이도 매우 쉬움, 파티, 29,500원
- 숲의 우편배달부: 1~4인, 35분, 난이도 쉬움, 가족·협력, 36,000원
- 시티 블록: 2~4인, 60분, 난이도 보통, 전략, 54,000원
- 피크닉 대소동: 2~5인, 20분, 난이도 매우 쉬움, 가족·파티, 23,800원
- 아틀라스 원정대: 1~4인, 90분, 난이도 어려움, 탐험·전략, 63,000원
- 모먼트: 2인 전용, 15분, 난이도 쉬움, 21,000원
- 미스터리 호텔: 2~5인, 50분, 난이도 보통, 추리, 38,500원
- 드래곤즈 킵: 2~4인, 30~60분, 전략 어드벤처
- 주사위: 다각면 세트, D6 세트, D20 단품과 레진·메탈·원목 소재
- 액세서리: 카드 슬리브, 원목 주사위 트레이, 컬러 미플 등
- 결제 테스트 상품: 1,000원, 실제 배송 없음

쇼핑몰 정책:
- 50,000원 이상 무료배송, 평일 오후 2시 이전 결제 시 당일 출고
- 상품 수령 후 7일 이내 교환·반품 신청 가능. 개봉·구성품 훼손 시 제한 가능
- 고객센터 운영: 평일 10:00~17:00, 점심 12:00~13:00
`;

const SYSTEM_PROMPT = `당신은 보드게임 전문 쇼핑몰 '보드픽'의 AI 상품 도우미입니다.
항상 친절하고 간결한 한국어로 답하세요. 고객의 인원, 플레이 시간, 난이도, 분위기를 확인해 최대 3개 상품을 추천하고 각 추천 이유를 짧게 설명하세요.
아래에 없는 재고, 가격, 할인, 배송일을 지어내지 마세요. 확실하지 않으면 상품 상세 페이지나 고객센터 확인을 안내하세요.
결제 정보, 비밀번호, 주민등록번호 등 민감정보를 요구하지 마세요. 의료·법률·금융 상담은 하지 마세요.
답변은 모바일에서도 읽기 쉽도록 5문장 안팎으로 작성하세요.
${PRODUCT_CONTEXT}`;

const json = (body: unknown, status = 200, origin?: string) => Response.json(body, {
  status,
  headers: {
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Cache-Control": "no-store",
  },
});

const allowedOrigin = (request: Request) => {
  const origin = request.headers.get("origin") ?? "";
  const configured = (process.env.CHAT_ALLOWED_ORIGINS ?? "http://localhost:3000,https://max8722-bit.github.io,https://boardpick-shop.max8722.chatgpt.site").split(",").map((value) => value.trim());
  return configured.includes(origin) ? origin : "";
};

export async function OPTIONS(request: Request) {
  const origin = allowedOrigin(request);
  if (!origin) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}

export async function POST(request: Request) {
  const origin = allowedOrigin(request);
  const requestOrigin = request.headers.get("origin");
  const sameOrigin = !requestOrigin || requestOrigin === new URL(request.url).origin;
  if (!origin && !sameOrigin) return json({ message: "허용되지 않은 요청입니다." }, 403);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return json({ message: "AI 상담 서비스가 아직 설정되지 않았습니다." }, 503, origin);

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || request.headers.get("cf-connecting-ip") || "local";
  const now = Date.now();
  const window = requestWindows.get(clientKey);
  if (!window || now >= window.resetAt) requestWindows.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
  else if (window.count >= MAX_REQUESTS_PER_WINDOW) return json({ message: "질문이 많아 잠시 쉬고 있어요. 1분 뒤 다시 이용해 주세요." }, 429, origin);
  else window.count += 1;

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json() as { messages?: ChatMessage[] };
  } catch {
    return json({ message: "메시지 형식이 올바르지 않습니다." }, 400, origin);
  }

  const messages = (body.messages ?? []).slice(-8).filter((message) =>
    (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim()
  ).map((message) => ({ role: message.role, content: message.content.trim().slice(0, 700) }));

  if (!messages.length || messages[messages.length - 1]?.role !== "user") {
    return json({ message: "질문을 입력해 주세요." }, 400, origin);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.35,
        max_completion_tokens: 700,
        reasoning_effort: "low",
        include_reasoning: false,
      }),
    });

    const result = await response.json() as GroqResponse;
    const answer = result.choices?.[0]?.message?.content?.trim();
    if (!response.ok || !answer) {
      console.error("Groq chat request failed", { status: response.status, code: result.error?.code, message: result.error?.message });
      const detail = response.status === 429 ? "무료 사용량이 잠시 소진되었습니다. 잠시 후 다시 이용해 주세요." : "AI 상담 답변을 불러오지 못했습니다.";
      return json({ message: detail }, response.status === 429 ? 429 : 502, origin);
    }
    return json({ answer, model: process.env.GROQ_MODEL || "openai/gpt-oss-20b" }, 200, origin);
  } catch {
    return json({ message: "AI 상담 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502, origin);
  }
}
