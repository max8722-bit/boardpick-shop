import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "보드픽 | 오늘의 즐거움을 골라보세요",
    description: "보드게임부터 슬리브, 주사위, 정리용품까지. 인원과 시간, 취향에 맞는 게임을 쉽게 고르는 보드게임 전문 쇼핑몰입니다.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "보드픽 | 오늘의 즐거움을 골라보세요",
      description: "인원과 시간, 취향에 맞는 보드게임을 쉽게 골라보세요.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "보드픽 보드게임 쇼핑몰" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "보드픽 | 오늘의 즐거움을 골라보세요",
      description: "인원과 시간, 취향에 맞는 보드게임을 쉽게 골라보세요.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
