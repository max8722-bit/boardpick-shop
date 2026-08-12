type NaverPayApplyResponse = {
  code?: string;
  message?: string;
  body?: { detail?: { merchantPayKey?: string; totalPayAmount?: number; admissionState?: string } };
};

export async function POST(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID;
  const clientSecret = process.env.NAVER_PAY_CLIENT_SECRET;
  const chainId = process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID;
  if (!clientId || !clientSecret || !chainId) return Response.json({ ok: false, message: "네이버페이 테스트 인증값이 설정되지 않았습니다." }, { status: 503 });

  const { paymentId, expectedAmount } = await request.json() as { paymentId?: string; expectedAmount?: number };
  if (!paymentId || !Number.isFinite(expectedAmount) || Number(expectedAmount) < 10) return Response.json({ ok: false, message: "결제 승인 정보가 올바르지 않습니다." }, { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("https://dev-pay.paygate.naver.com/naverpay-partner/naverpay/payments/v2.2/apply/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        "X-NaverPay-Chain-Id": chainId,
        "X-NaverPay-Idempotency-Key": `boardpick-${paymentId}`,
      },
      body: new URLSearchParams({ paymentId }),
      signal: controller.signal,
    });
    const result = await response.json() as NaverPayApplyResponse;
    const detail = result.body?.detail;
    if (!response.ok || result.code !== "Success" || detail?.admissionState !== "SUCCESS") return Response.json({ ok: false, message: result.message || "네이버페이 결제 승인에 실패했습니다." }, { status: 400 });
    if (Number(detail.totalPayAmount) !== Number(expectedAmount)) return Response.json({ ok: false, message: "결제 승인 금액이 주문 금액과 일치하지 않습니다." }, { status: 409 });
    return Response.json({ ok: true, merchantPayKey: detail.merchantPayKey });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error && error.name === "AbortError" ? "네이버페이 승인 응답 시간이 초과되었습니다." : "네이버페이 승인 서버에 연결하지 못했습니다." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
