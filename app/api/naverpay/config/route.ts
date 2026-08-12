export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID;
  const chainId = process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID;
  return Response.json({
    configured: Boolean(clientId && chainId && process.env.NAVER_PAY_CLIENT_SECRET),
    clientId,
    chainId,
    mode: (process.env.NAVER_PAY_MODE === "production" ? "production" : "development"),
  });
}
