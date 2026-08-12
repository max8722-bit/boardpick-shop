"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type SupportView = "delivery" | "returns" | "faq";
type View = "home" | "shop" | "new" | "featured" | "detail" | "cart" | "checkout" | "complete" | "admin" | SupportView;

type Product = {
  id: number;
  name: string;
  label: string;
  image: string;
  imageMode?: "case" | "photo";
  category: "보드게임" | "주사위" | "액세서리";
  genre: string;
  diceTags?: string[];
  price: number;
  originalPrice?: number;
  players: string;
  time: string;
  level: string;
  received: string;
  badge?: "NEW" | "재입고" | "BEST" | "TEST";
  paymentTest?: boolean;
  featured?: boolean;
  featureCopy?: string;
  art: [string, string, string];
  rating: number;
  reviews: number;
  description: string;
  stock?: number;
  age?: string;
  language?: string;
};

type CartItem = { product: Product; quantity: number; selected: boolean };
type ChatMessage = { role: "user" | "assistant"; content: string };

type DaumPostcodeData = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  addressType: "R" | "J";
  bname: string;
  buildingName: string;
};

type DaumPostcodeInstance = {
  embed: (element: HTMLElement, options?: { autoClose?: boolean }) => void;
};

declare global {
  interface Window {
    Naver?: {
      Pay: {
        create: (options: {
          mode: "development" | "production";
          payType: "normal";
          openType?: "page" | "popup";
          clientId: string;
          chainId: string;
        }) => {
          open: (options: Record<string, unknown>) => void;
        };
      };
    };
    daum?: {
      Postcode: new (options: {
        width?: string;
        height?: string;
        oncomplete: (data: DaumPostcodeData) => void;
        onclose?: () => void;
      }) => DaumPostcodeInstance;
    };
  }
}

const DAUM_POSTCODE_SCRIPT_ID = "daum-postcode-script";
const DAUM_POSTCODE_SCRIPT_URL = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let daumPostcodePromise: Promise<void> | null = null;
const NAVER_PAY_SCRIPT_ID = "naver-pay-sdk";
const NAVER_PAY_SCRIPT_URL = "https://nsp.pay.naver.com/sdk/js/naverpay.min.js";
let naverPayPromise: Promise<void> | null = null;

const loadNaverPay = () => {
  if (window.Naver?.Pay) return Promise.resolve();
  if (naverPayPromise) return naverPayPromise;
  naverPayPromise = new Promise<void>((resolve, reject) => {
    const handleLoad = () => window.Naver?.Pay ? resolve() : reject(new Error("네이버페이 SDK를 초기화하지 못했습니다."));
    const handleError = () => reject(new Error("네이버페이 SDK를 불러오지 못했습니다."));
    const existing = document.getElementById(NAVER_PAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", handleLoad, { once: true });
      existing.addEventListener("error", handleError, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = NAVER_PAY_SCRIPT_ID;
    script.src = NAVER_PAY_SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    naverPayPromise = null;
    throw error;
  });
  return naverPayPromise;
};

const loadDaumPostcode = () => {
  if (window.daum?.Postcode) return Promise.resolve();
  if (daumPostcodePromise) return daumPostcodePromise;

  daumPostcodePromise = new Promise<void>((resolve, reject) => {
    const handleLoad = () => window.daum?.Postcode ? resolve() : reject(new Error("다음 우편번호 서비스를 초기화하지 못했습니다."));
    const handleError = () => reject(new Error("다음 우편번호 서비스를 불러오지 못했습니다."));
    const existing = document.getElementById(DAUM_POSTCODE_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", handleLoad, { once: true });
      existing.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = DAUM_POSTCODE_SCRIPT_ID;
    script.src = DAUM_POSTCODE_SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    daumPostcodePromise = null;
    throw error;
  });

  return daumPostcodePromise;
};

const siteAsset = (path: string) => {
  if (/^(?:data:|https?:\/\/)/.test(path)) return path;
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

const transparentProductAsset = (path: string) => {
  if (/^(?:data:|https?:\/\/)/.test(path)) return path;
  const normalized = path.replace(/^\//, "");
  return normalized.startsWith("product-art/") ? siteAsset(`/product-art-transparent/${normalized.slice("product-art/".length)}`) : siteAsset(path);
};

const localNaverPayConfig = () => {
  const clientId = import.meta.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID;
  const chainId = import.meta.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID;
  return { configured: Boolean(clientId && chainId), clientId, chainId, mode: import.meta.env.NAVER_PAY_MODE === "production" ? "production" as const : "development" as const };
};

function CutoutImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const resolvedSrc = transparentProductAsset(src);

  useEffect(() => {
    if (resolvedSrc.includes("/product-art-transparent/")) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    if (/^https?:\/\//.test(resolvedSrc)) image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);

      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;
        const total = width * height;
        const visited = new Uint8Array(total);
        const queue = new Int32Array(total);
        let head = 0;
        let tail = 0;

        const isBackground = (pixel: number) => {
          const offset = pixel * 4;
          const red = data[offset];
          const green = data[offset + 1];
          const blue = data[offset + 2];
          const lightest = Math.max(red, green, blue);
          const darkest = Math.min(red, green, blue);
          return darkest >= 194 && lightest - darkest <= 30;
        };
        const enqueue = (pixel: number) => {
          if (pixel < 0 || pixel >= total || visited[pixel] || !isBackground(pixel)) return;
          visited[pixel] = 1;
          queue[tail++] = pixel;
        };

        for (let x = 0; x < width; x += 1) {
          enqueue(x);
          enqueue((height - 1) * width + x);
        }
        for (let y = 1; y < height - 1; y += 1) {
          enqueue(y * width);
          enqueue(y * width + width - 1);
        }

        while (head < tail) {
          const pixel = queue[head++];
          const x = pixel % width;
          const offset = pixel * 4;
          const darkest = Math.min(data[offset], data[offset + 1], data[offset + 2]);
          const matteAlpha = darkest >= 248 ? 0 : Math.round(((248 - darkest) / 54) * 255);
          data[offset + 3] = Math.min(data[offset + 3], Math.max(0, Math.min(255, matteAlpha)));
          if (x > 0) enqueue(pixel - 1);
          if (x < width - 1) enqueue(pixel + 1);
          if (pixel >= width) enqueue(pixel - width);
          if (pixel < total - width) enqueue(pixel + width);
        }

        context.putImageData(imageData, 0, 0);
        setReady(true);
      } catch {
        setReady(false);
      }
    };
    image.onerror = () => setReady(false);
    image.src = resolvedSrc;
    return () => { cancelled = true; };
  }, [resolvedSrc]);

  return (
    <span className={`cutout-image ${className}`.trim()} role={alt ? "img" : undefined} aria-label={alt || undefined}>
      <img className="cutout-fallback" src={resolvedSrc} alt={alt} />
      {!resolvedSrc.includes("/product-art-transparent/") && <canvas ref={canvasRef} className={ready ? "cutout-canvas is-ready" : "cutout-canvas"} aria-hidden="true" />}
    </span>
  );
}

const products: Product[] = [
  {
    id: 1,
    name: "달빛 정원",
    label: "MOON GARDEN",
    image: "/product-art/moon-garden-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "가족·전략",
    price: 42000,
    originalPrice: 48000,
    players: "2–4인",
    time: "40분",
    level: "쉬움",
    received: "08.09 입고",
    badge: "NEW",
    featured: true,
    featureCopy: "처음 만나는 전략 게임으로 가장 좋은 선택",
    art: ["#164f3b", "#f2c96d", "#c7eadc"],
    rating: 4.9,
    reviews: 128,
    description: "달빛 아래 꽃을 심고 가장 아름다운 정원을 완성하는 타일 배치 게임입니다.",
  },
  {
    id: 2,
    name: "코스믹 카페",
    label: "COSMIC CAFE",
    image: "/product-art/cosmic-cafe-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "파티",
    price: 29500,
    players: "3–6인",
    time: "25분",
    level: "매우 쉬움",
    received: "08.08 입고",
    badge: "NEW",
    featured: true,
    featureCopy: "짧고 유쾌해서 모임의 첫 게임으로 추천",
    art: ["#7058a8", "#f5a95f", "#d9d0f1"],
    rating: 4.8,
    reviews: 84,
    description: "우주 카페의 주문을 빠르게 완성하는 가볍고 활기찬 파티 카드게임입니다.",
  },
  {
    id: 3,
    name: "숲의 우편배달부",
    label: "FOREST POST",
    image: "/product-art/forest-post-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "가족·협력",
    price: 36000,
    players: "1–4인",
    time: "35분",
    level: "쉬움",
    received: "08.07 입고",
    badge: "NEW",
    featured: true,
    featureCopy: "아이와 어른이 함께 머리를 맞대는 협력 게임",
    art: ["#e56c4d", "#f4df9d", "#326b55"],
    rating: 4.9,
    reviews: 67,
    description: "숲속 친구들의 편지를 시간 안에 전달하는 따뜻한 분위기의 협력 게임입니다.",
  },
  {
    id: 4,
    name: "시티 블록",
    label: "CITY BLOCK",
    image: "/product-art/city-block-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "전략",
    price: 54000,
    players: "2–4인",
    time: "60분",
    level: "보통",
    received: "08.05 입고",
    badge: "NEW",
    featured: true,
    featureCopy: "한 수 앞을 생각하는 정교한 도시 건설",
    art: ["#235f88", "#efb44f", "#d6edf6"],
    rating: 4.8,
    reviews: 156,
    description: "제한된 블록을 연결해 효율적인 도시를 설계하는 전략 보드게임입니다.",
  },
  {
    id: 5,
    name: "피크닉 대소동",
    label: "PICNIC PANIC",
    image: "/product-art/picnic-panic-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "가족·파티",
    price: 23800,
    originalPrice: 28000,
    players: "2–5인",
    time: "20분",
    level: "매우 쉬움",
    received: "08.03 입고",
    badge: "재입고",
    art: ["#e96c76", "#f6d76f", "#99c969"],
    rating: 4.7,
    reviews: 203,
    description: "피크닉 바구니에 필요한 음식을 누구보다 빠르게 모으는 순발력 게임입니다.",
  },
  {
    id: 6,
    name: "아틀라스 원정대",
    label: "ATLAS",
    image: "/product-art/atlas-expedition-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "탐험·전략",
    price: 63000,
    players: "1–4인",
    time: "90분",
    level: "어려움",
    received: "08.02 입고",
    badge: "NEW",
    art: ["#173d56", "#c8894b", "#95bcc2"],
    rating: 4.9,
    reviews: 91,
    description: "미지의 대륙을 탐험하며 지도를 완성하는 깊이 있는 전략 게임입니다.",
  },
  {
    id: 7,
    name: "모먼트",
    label: "MOMENT",
    image: "/product-art/moment-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "2인 전용",
    price: 21000,
    players: "2인",
    time: "15분",
    level: "쉬움",
    received: "07.29 입고",
    badge: "BEST",
    art: ["#d95c58", "#f3b65c", "#f8e5cf"],
    rating: 4.8,
    reviews: 312,
    description: "서로의 선택을 읽으며 완성하는 감각적인 2인 전용 카드게임입니다.",
  },
  {
    id: 8,
    name: "미스터리 호텔",
    label: "MYSTERY HOTEL",
    image: "/product-art/mystery-hotel-box-v2.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "추리",
    price: 38500,
    players: "2–5인",
    time: "50분",
    level: "보통",
    received: "07.26 입고",
    badge: "BEST",
    art: ["#2c2a49", "#d7aa54", "#c8c4dc"],
    rating: 4.7,
    reviews: 189,
    description: "호텔에 남은 단서를 조합해 사건의 진실을 밝혀내는 추리 게임입니다.",
  },
  {
    id: 9,
    name: "프리미엄 카드 슬리브",
    label: "CARD SLEEVES",
    image: "/product-art/card-sleeves-v2.png",
    category: "액세서리",
    genre: "카드 보호",
    price: 6800,
    players: "63.5×88mm",
    time: "100매",
    level: "투명",
    received: "08.10 입고",
    badge: "NEW",
    art: ["#5b7d90", "#d9e5ea", "#f4f7f8"],
    rating: 4.9,
    reviews: 441,
    description: "선명도와 내구성을 모두 잡은 보드게임용 무광 카드 슬리브입니다.",
  },
  {
    id: 10,
    name: "원목 주사위 트레이",
    label: "DICE TRAY",
    image: "/product-art/dice-tray-v2.png",
    category: "액세서리",
    genre: "주사위·트레이",
    diceTags: ["트레이"],
    price: 19000,
    players: "20×20cm",
    time: "원목",
    level: "저소음",
    received: "08.06 입고",
    badge: "NEW",
    art: ["#815d42", "#d7b58e", "#efe2d0"],
    rating: 4.8,
    reviews: 73,
    description: "주사위가 테이블 밖으로 나가지 않도록 잡아주는 천연 원목 트레이입니다.",
  },
  {
    id: 11,
    name: "컬러 미플 24종",
    label: "MEEPLE SET",
    image: "/product-art/meeple-set-v2.png",
    category: "액세서리",
    genre: "토큰·마커",
    price: 12500,
    players: "24개",
    time: "6색",
    level: "원목",
    received: "08.01 입고",
    badge: "재입고",
    art: ["#e45c4f", "#5b91c8", "#f1c74f"],
    rating: 4.7,
    reviews: 118,
    description: "다양한 게임에 활용할 수 있는 선명한 여섯 색상의 원목 미플 세트입니다.",
  },
  {
    id: 12,
    name: "모듈형 게임 정리함",
    label: "GAME ORGANIZER",
    image: "/product-art/game-organizer-v2.png",
    category: "액세서리",
    genre: "보관·정리",
    price: 27000,
    players: "6모듈",
    time: "조립형",
    level: "다용도",
    received: "07.28 입고",
    badge: "BEST",
    art: ["#546e5d", "#caa36b", "#dbe5dc"],
    rating: 4.8,
    reviews: 95,
    description: "구성물 크기에 맞춰 자유롭게 조합하는 모듈형 게임 정리함입니다.",
  },
  {
    id: 13,
    name: "오로라 주사위 세트",
    label: "AURORA DICE",
    image: "/product-art/aurora-d20-v3.png",
    category: "주사위",
    genre: "주사위",
    diceTags: ["다각면 세트", "레진"],
    price: 14800,
    players: "7개 세트",
    time: "다각면",
    level: "레진",
    received: "08.11 입고",
    badge: "NEW",
    art: ["#294c67", "#80c9c0", "#dcc9f2"],
    rating: 4.9,
    reviews: 42,
    description: "빛에 따라 색이 은은하게 달라지는 일곱 개 구성의 다각면 레진 주사위 세트입니다.",
  },
  {
    id: 14,
    name: "클래식 컬러 주사위 12개",
    label: "COLOR DICE",
    image: "/product-art/classic-color-dice-v2.png",
    category: "주사위",
    genre: "주사위·클래식",
    diceTags: ["D6 세트", "클래식"],
    price: 6800,
    players: "12개 세트",
    time: "D6",
    level: "아크릴",
    received: "08.10 입고",
    badge: "NEW",
    art: ["#3769a8", "#f2c84b", "#e5574f"],
    rating: 4.7,
    reviews: 88,
    description: "빨강부터 보라까지 여섯 가지 색상을 고르게 구성한 활용도 높은 클래식 육면체 주사위입니다.",
  },
  {
    id: 15,
    name: "드래곤 메탈 주사위 세트",
    label: "DRAGON METAL",
    image: "/product-art/metal-dragon-d20-v3.png",
    category: "주사위",
    genre: "주사위·메탈",
    diceTags: ["다각면 세트", "메탈"],
    price: 42900,
    players: "7개 세트",
    time: "다각면",
    level: "아연 합금",
    received: "08.08 입고",
    badge: "BEST",
    art: ["#3d4143", "#a9adaf", "#d2c5a3"],
    rating: 4.9,
    reviews: 126,
    description: "고풍스러운 실버 마감과 용 비늘 문양을 새긴 묵직한 금속 다각면 주사위 세트입니다.",
  },
  {
    id: 16,
    name: "갤럭시 레진 주사위 세트",
    label: "GALAXY DICE",
    image: "/product-art/galaxy-d20-v3.png",
    category: "주사위",
    genre: "주사위·레진",
    diceTags: ["다각면 세트", "레진"],
    price: 18900,
    players: "7개 세트",
    time: "다각면",
    level: "레진",
    received: "08.07 입고",
    badge: "NEW",
    art: ["#20245d", "#6d55b5", "#e1b74f"],
    rating: 4.8,
    reviews: 64,
    description: "짙은 남색 레진 속에 보라색과 은빛 입자가 은하수처럼 반짝이는 다각면 주사위 세트입니다.",
  },
  {
    id: 17,
    name: "핸드메이드 원목 주사위 6개",
    label: "WOOD DICE",
    image: "/product-art/wooden-dice-v2.png",
    category: "주사위",
    genre: "주사위·원목",
    diceTags: ["D6 세트", "원목"],
    price: 16200,
    players: "6개 세트",
    time: "D6",
    level: "천연 원목",
    received: "08.04 입고",
    badge: "재입고",
    art: ["#805037", "#c38b58", "#eee2d1"],
    rating: 4.8,
    reviews: 57,
    description: "월넛·메이플·체리 원목의 결을 살리고 모서리를 부드럽게 다듬은 수제 육면체 주사위입니다.",
  },
  {
    id: 18,
    name: "드래곤즈 킵",
    label: "DRAGON'S KEEP",
    image: "/product-art/dragons-keep-box.png",
    imageMode: "photo",
    category: "보드게임",
    genre: "전략·모험",
    price: 49800,
    originalPrice: 56000,
    players: "2–4인",
    time: "30–60분",
    level: "보통",
    received: "08.11 입고",
    badge: "NEW",
    featured: true,
    featureCopy: "영웅을 성장시키고 용이 잠든 성을 되찾는 판타지 전략 모험",
    art: ["#0e2749", "#78b8eb", "#d2a33f"],
    rating: 4.9,
    reviews: 36,
    description: "서로 다른 능력을 가진 영웅을 이끌고 장비와 마법을 모아 용이 지키는 성을 공략하는 판타지 전략 보드게임입니다.",
  },
  {
    id: 19,
    name: "결제 테스트 상품",
    label: "PAYMENT TEST",
    image: "/brand/boardpick-logo.png",
    imageMode: "photo",
    category: "액세서리",
    genre: "결제 테스트 전용",
    price: 1000,
    players: "1개",
    time: "즉시 확인",
    level: "무료배송",
    received: "08.12 등록",
    badge: "TEST",
    paymentTest: true,
    art: ["#002038", "#1068b8", "#ffb808"],
    rating: 0,
    reviews: 0,
    description: "네이버페이 개발환경과 주문·결제 화면을 확인하기 위한 1,000원 테스트 전용 상품입니다. 실제 배송은 진행되지 않습니다.",
    stock: 999,
  },
];

const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

const boardGameFilters = [
  { label: "전체", value: "보드게임" },
  { label: "가족", value: "가족" },
  { label: "전략", value: "전략" },
  { label: "파티", value: "파티" },
  { label: "협력", value: "협력" },
  { label: "탐험", value: "탐험" },
  { label: "추리", value: "추리" },
  { label: "2인", value: "2인" },
];

const diceTypeFilters = [
  { label: "전체 주사위", value: "주사위" },
  { label: "다각면 세트", value: "다각면 세트" },
  { label: "D6 세트", value: "D6 세트" },
  { label: "트레이", value: "트레이" },
];

const diceMaterialFilters = ["레진", "메탈", "원목"];

const boardPlayerFilters = ["전체", "2인", "3–4인", "5인+"];
const boardTimeFilters = ["전체", "30분 이하", "60분 이하", "60분+"];
const boardLevelFilters = ["전체", "매우 쉬움", "쉬움", "보통", "어려움"];

const numericRange = (value: string) => value.match(/\d+/g)?.map(Number) ?? [];

const productFacts = (product: Product) => {
  if (product.category === "보드게임") {
    return [product.players, product.time, `난이도 ${product.level}`, product.age || (product.id === 6 || product.id === 18 ? "12세+" : "8세+"), product.language || "한글판"];
  }
  if (product.category === "주사위") {
    return [product.time, product.players, product.level, product.time === "D6" ? "16mm" : "정밀 각인"];
  }
  return [product.players, product.time, product.level];
};

const editorNote = (product: Product) => product.featureCopy
  || (product.category === "보드게임"
    ? `${product.players}에서 즐기기 좋은 ${product.genre} 입문 추천`
    : product.category === "주사위"
      ? `${product.level}의 질감과 숫자 가독성을 함께 고른 다이스`
      : "플레이와 보관을 더 편하게 만드는 실용적인 선택");

const emptyAdminForm = {
  name: "",
  label: "",
  category: "보드게임" as Product["category"],
  genre: "",
  price: "",
  originalPrice: "",
  stock: "10",
  players: "2–4인",
  time: "30분",
  level: "쉬움",
  age: "8세+",
  language: "한글판",
  received: "2026-08-11",
  badge: "NEW" as "" | NonNullable<Product["badge"]>,
  description: "",
  image: "",
  diceType: "다각면 세트",
  material: "레진",
};

const heroSlides = [
  {
    id: "curation",
    tone: "hero-tone-green",
    eyebrow: "BOARD GAMES & DICE CURATION",
    titleTop: "보드게임과 다이스,",
    titleBottom: "테이블 위에 펼쳐지는 취향",
    description: "게임을 잘 몰라도 인원, 시간, 분위기만 고르면 실패 없는 한 판을 보드픽이 골라드릴게요.",
    primary: "보드게임 고르기",
    secondary: "이번 주 추천",
    tab: "게임 큐레이션",
    visual: "boards",
  },
  {
    id: "dice",
    tone: "hero-tone-blue",
    eyebrow: "DICE COLLECTION · NEW RESTOCK",
    titleTop: "굴리는 순간 빛나는,",
    titleBottom: "나만의 다이스 컬렉션",
    description: "레진의 투명함부터 메탈의 묵직함까지, 재질과 형태를 비교하고 내 플레이에 맞는 다이스를 만나보세요.",
    primary: "다이스 컬렉션 보기",
    secondary: "다각면 세트 보기",
    tab: "다이스 컬렉션",
    visual: "dice",
  },
  {
    id: "dragons-keep",
    tone: "hero-tone-gold",
    eyebrow: "NEW ARRIVAL · EDITOR'S PICK",
    titleTop: "용이 잠든 성을 향한,",
    titleBottom: "드래곤즈 킵의 모험",
    description: "서로 다른 영웅을 성장시키고 장비와 마법을 모아 성을 되찾는 이번 주의 판타지 전략 추천작입니다.",
    primary: "드래곤즈 킵 보기",
    secondary: "전략 게임 둘러보기",
    tab: "주력 신상품",
    visual: "dragon",
  },
] as const;

const supportBoards: Record<SupportView, { title: string; eyebrow: string; description: string; posts: { id: number; title: string; date: string; views: number; content: string }[] }> = {
  delivery: {
    title: "배송 안내",
    eyebrow: "DELIVERY BOARD",
    description: "주문부터 출고, 수령까지 필요한 배송 정보를 확인하세요.",
    posts: [
      { id: 4, title: "배송비 및 무료배송 기준 안내", date: "2026.08.01", views: 328, content: "기본 배송비는 3,000원이며 상품 결제 금액이 50,000원 이상이면 무료배송이 적용됩니다. 도서·산간 지역은 지역에 따라 추가 배송비가 발생할 수 있습니다." },
      { id: 3, title: "주문 상품 출고 일정 안내", date: "2026.07.28", views: 512, content: "평일 오후 2시 이전 결제 완료 주문은 재고가 있는 경우 당일 출고됩니다. 오후 2시 이후와 주말·공휴일 주문은 다음 영업일부터 순차적으로 출고합니다." },
      { id: 2, title: "배송 조회 및 송장 확인 방법", date: "2026.07.19", views: 271, content: "상품이 출고되면 주문 시 입력한 연락처로 송장번호가 안내됩니다. 택배사 전산 반영까지 출고 후 약 3~6시간이 걸릴 수 있습니다." },
      { id: 1, title: "합배송과 부분 배송 안내", date: "2026.07.10", views: 184, content: "같은 주문번호의 상품은 합배송이 원칙입니다. 예약·입고 지연 상품이 포함된 경우 빠른 수령을 위해 준비된 상품부터 부분 배송될 수 있으며 추가 배송비는 보드픽이 부담합니다." },
    ],
  },
  returns: {
    title: "교환·반품",
    eyebrow: "EXCHANGE & RETURN",
    description: "교환과 반품 신청 전에 필요한 기준과 절차를 확인하세요.",
    posts: [
      { id: 4, title: "교환·반품 신청 절차 안내", date: "2026.08.01", views: 405, content: "상품 수령 후 7일 이내 고객센터로 주문번호와 신청 사유를 알려주세요. 접수 완료 후 안내받은 방법으로 상품과 모든 구성품을 다시 포장해 보내주시면 됩니다." },
      { id: 3, title: "상품 파손 및 구성품 누락 접수 방법", date: "2026.07.24", views: 362, content: "박스 파손이나 구성품 누락이 확인되면 수령일로부터 7일 이내에 상품 전체와 문제 부분을 촬영해 고객센터로 보내주세요. 확인 후 교환 또는 누락 구성품 재발송을 안내합니다." },
      { id: 2, title: "교환·반품 배송비 기준", date: "2026.07.16", views: 298, content: "단순 변심에 따른 왕복 배송비는 고객 부담입니다. 오배송, 초기 불량, 배송 중 파손처럼 보드픽 또는 배송 과정의 책임이 확인되는 경우 배송비는 부과되지 않습니다." },
      { id: 1, title: "교환·반품이 제한되는 경우", date: "2026.07.08", views: 477, content: "밀봉 비닐을 개봉했거나 구성품이 사용·훼손된 경우, 상품 가치가 현저히 감소한 경우에는 교환과 반품이 제한될 수 있습니다. 구성품 확인 전에는 카드와 토큰을 분리하지 말아주세요." },
    ],
  },
  faq: {
    title: "자주 묻는 질문",
    eyebrow: "FREQUENTLY ASKED QUESTIONS",
    description: "보드픽 이용 중 자주 궁금해하시는 내용을 모았습니다.",
    posts: [
      { id: 5, title: "비회원도 주문할 수 있나요?", date: "2026.08.05", views: 215, content: "네, 회원가입 없이도 주문할 수 있습니다. 주문 완료 후 표시되는 주문번호와 주문자 연락처를 보관해 주세요." },
      { id: 4, title: "품절 상품의 재입고 알림을 받을 수 있나요?", date: "2026.07.30", views: 391, content: "재입고 일정이 확정된 상품은 상품 목록에 재입고 표시와 입고일을 안내합니다. 현재 데모 사이트에서는 별도의 문자 알림 신청 기능을 제공하지 않습니다." },
      { id: 3, title: "보드게임 난이도는 어떤 기준인가요?", date: "2026.07.22", views: 344, content: "규칙 설명 시간, 선택의 복잡도, 한 판의 진행 시간을 함께 고려해 매우 쉬움·쉬움·보통·어려움으로 표시합니다. 상세 페이지의 인원과 플레이 시간도 함께 참고해 주세요." },
      { id: 2, title: "결제 수단을 변경하고 싶어요", date: "2026.07.15", views: 186, content: "결제 완료 후에는 결제 수단만 변경할 수 없습니다. 출고 전 주문을 취소한 다음 원하는 결제 수단으로 다시 주문해 주세요." },
      { id: 1, title: "선물 포장이 가능한가요?", date: "2026.07.05", views: 263, content: "현재 별도의 선물 포장 서비스는 제공하지 않지만 모든 상품은 배송 중 모서리 손상을 줄이도록 완충재와 전용 박스를 사용해 안전하게 포장합니다." },
    ],
  },
};

const productDetailCopy: Record<number, {
  title: string;
  intro: string;
  highlights: [string, string, string];
  guide: [string, string, string];
  recommended: string[];
  contents: string;
}> = {
  1: { title: "달빛 아래 완성하는 나만의 정원", intro: "꽃 타일을 이어 빛의 흐름을 만들고, 제한된 공간 안에서 가장 조화로운 정원을 설계합니다. 규칙은 단순하지만 매 차례의 배치가 다음 선택을 바꾸는 가족 전략 게임입니다.", highlights: ["배울수록 보이는 타일 배치 전략", "플레이마다 달라지는 정원 구성", "초보자와 숙련자가 함께 즐기는 난이도"], guide: ["공용 보드에서 꽃 타일 하나를 선택합니다.", "내 정원에 연결해 달빛 길과 색 조합을 만듭니다.", "목표 카드와 완성된 구역의 점수를 합산합니다."], recommended: ["첫 전략 게임", "가족 모임", "2–4인 플레이"], contents: "정원 보드 4개, 꽃 타일 84개, 달빛 토큰 32개, 목표 카드 24장, 점수 마커, 규칙서" },
  2: { title: "우주에서 가장 분주한 카페", intro: "손님이 원하는 음료와 디저트를 빠르게 조합해 주문을 완성하세요. 짧은 라운드와 유쾌한 상황 카드 덕분에 처음 만난 모임도 금세 웃게 되는 파티 게임입니다.", highlights: ["5분 안에 끝나는 규칙 설명", "모두가 동시에 참여하는 빠른 진행", "매 라운드 달라지는 특별 주문"], guide: ["손님 카드와 재료 카드를 공개합니다.", "필요한 조합을 찾아 주문 벨을 누릅니다.", "가장 많은 별을 모은 바리스타가 승리합니다."], recommended: ["친구 모임", "가벼운 파티", "3–6인 플레이"], contents: "주문 카드 72장, 재료 카드 96장, 카페 보드, 주문 벨, 별 토큰 40개, 규칙서" },
  3: { title: "숲속 편지를 함께 배달해요", intro: "서로의 손패를 완전히 알 수 없는 상황에서 단서를 나누고 배달 경로를 완성합니다. 경쟁보다 대화를 좋아하는 가족에게 잘 맞는 따뜻한 협력 게임입니다.", highlights: ["모두가 함께 이기거나 지는 협력 구조", "아이도 이해하기 쉬운 아이콘 규칙", "난이도를 조절하는 계절 카드"], guide: ["오늘 배달할 편지와 목적지를 확인합니다.", "차례마다 길 타일을 놓거나 도움 행동을 합니다.", "해가 지기 전 모든 편지를 전달하면 성공합니다."], recommended: ["협력 게임 입문", "아이와 함께", "1–4인 플레이"], contents: "숲 지도 보드, 길 타일 54개, 편지 토큰 20개, 동물 말 4개, 계절 카드 12장, 규칙서" },
  4: { title: "한 칸씩 성장하는 나만의 도시", intro: "주거·상업·공원 블록을 연결하고 교통망을 확장해 효율적인 도시를 만듭니다. 같은 블록을 사용해도 완성되는 풍경과 점수 전략은 매번 달라집니다.", highlights: ["맞물리는 도시 블록의 공간 퍼즐", "교통과 환경 사이의 균형 전략", "높은 리플레이성과 다양한 목표"], guide: ["시장에 공개된 도시 블록을 가져옵니다.", "도로가 이어지도록 개인 도시에 배치합니다.", "구역 보너스와 시민 목표로 점수를 계산합니다."], recommended: ["중급 전략", "도시 건설 테마", "2–4인 플레이"], contents: "도시 블록 96개, 개인 보드 4개, 시민 카드 40장, 교통 토큰 48개, 점수표, 규칙서" },
  5: { title: "바구니를 지켜라, 피크닉 대소동", intro: "다람쥐가 가져가기 전에 필요한 음식을 빠르게 찾아 바구니를 채우는 순발력 게임입니다. 짧은 시간 안에 여러 번 즐기기 좋고 아이부터 어른까지 바로 참여할 수 있습니다.", highlights: ["20분 안에 끝나는 경쾌한 플레이", "관찰력과 순발력을 쓰는 동시 진행", "가족 모두에게 친근한 일러스트"], guide: ["음식 카드를 테이블 중앙에 펼칩니다.", "공개된 바구니 카드와 맞는 음식을 찾습니다.", "다람쥐 카드가 나오기 전 바구니를 완성합니다."], recommended: ["가족 게임", "어린이와 함께", "짧은 플레이"], contents: "음식 카드 90장, 바구니 카드 24장, 다람쥐 말 5개, 피크닉 매트, 규칙서" },
  6: { title: "지도 밖의 세계를 발견하는 원정", intro: "탐험대를 운영하며 미지의 대륙을 조사하고 지도를 완성합니다. 자원 관리와 위험 선택이 촘촘하게 맞물리는, 긴 호흡의 본격 탐험 전략 게임입니다.", highlights: ["경로 개척과 자원 관리의 깊은 선택", "시나리오마다 바뀌는 미지의 대륙", "혼자서도 즐길 수 있는 원정 모드"], guide: ["대원을 배치해 식량과 장비를 준비합니다.", "지형 타일을 공개하며 원정 경로를 넓힙니다.", "발견 기록과 완성한 지도로 명성을 얻습니다."], recommended: ["전략 게임 애호가", "탐험 테마", "1–4인 플레이"], contents: "대륙 타일 72개, 탐험대 말 20개, 장비 카드 80장, 자원 토큰 120개, 시나리오 북, 규칙서" },
  7: { title: "서로의 선택을 읽는 15분", intro: "두 사람이 같은 순간을 바라보며 비밀리에 선택한 기호를 맞춰갑니다. 말보다 눈치와 흐름이 중요한, 작지만 오래 기억되는 2인 전용 게임입니다.", highlights: ["두 사람만을 위한 간결한 규칙", "상대의 선택을 추리하는 심리전", "휴대하기 좋은 작은 구성"], guide: ["각자 세 개의 순간 타일을 받습니다.", "하나를 비밀리에 선택하고 단서를 놓습니다.", "서로 같은 순간을 고르면 연결 점수를 얻습니다."], recommended: ["커플·친구", "2인 전용", "카페 게임"], contents: "순간 타일 36개, 단서 토큰 24개, 연결 보드 2개, 점수 마커, 규칙서" },
  8: { title: "닫힌 호텔, 사라진 열쇠", intro: "호텔 곳곳에 남겨진 단서와 투숙객의 증언을 조합해 사건의 진실을 밝혀냅니다. 공포보다는 논리적 추리에 집중한 미스터리 게임입니다.", highlights: ["단서가 연결되는 정통 추리의 재미", "결말이 다른 다중 시나리오", "토론과 개별 추리를 모두 지원"], guide: ["사건 파일과 호텔 지도를 펼칩니다.", "장소를 조사해 단서와 증언을 모읍니다.", "제한 시간 안에 범인·동기·장소를 지목합니다."], recommended: ["추리 게임 팬", "몰입형 테마", "2–5인 플레이"], contents: "호텔 지도, 사건 파일 8개, 단서 카드 144장, 투숙객 카드 30장, 조사 토큰, 해답 봉투, 규칙서" },
  9: { title: "카드를 오래, 선명하게", intro: "무광 표면이 반사를 줄이고 단단한 용접 마감이 잦은 셔플에도 카드를 안전하게 보호합니다.", highlights: ["선명도를 유지하는 고투명 소재", "달라붙지 않는 부드러운 셔플", "표준 카드에 맞춘 안정적인 규격"], guide: ["카드 크기가 63.5×88mm인지 확인합니다.", "슬리브 입구로 카드를 천천히 넣습니다.", "직사광선과 높은 습기를 피해 보관합니다."], recommended: ["카드 보호", "덱빌딩 게임", "잦은 플레이"], contents: "프리미엄 무광 카드 슬리브 100매" },
  10: { title: "조용하고 안정적인 주사위 굴림", intro: "묵직한 원목 프레임과 부드러운 펠트 바닥이 소음을 줄이고 주사위가 테이블 밖으로 튀는 것을 막아줍니다.", highlights: ["천연 원목의 따뜻한 촉감", "충격과 소음을 줄이는 펠트", "테이블에 놓기 좋은 20cm 규격"], guide: ["평평한 테이블 중앙에 놓습니다.", "트레이 안쪽으로 주사위를 굴립니다.", "마른 천으로 닦아 습기 없이 보관합니다."], recommended: ["TRPG", "주사위 게임", "테이블 보호"], contents: "원목 주사위 트레이 1개, 미끄럼 방지 패드 4개" },
  11: { title: "게임에 색을 더하는 원목 미플", intro: "선명한 여섯 색상과 부드럽게 다듬은 원목 표면으로 다양한 게임의 말과 점수 마커를 손쉽게 교체할 수 있습니다.", highlights: ["6색으로 구분하기 쉬운 구성", "모서리를 부드럽게 다듬은 원목", "여러 보드게임에 활용 가능한 규격"], guide: ["게임 인원에 맞춰 색상을 고릅니다.", "기존 플레이어 말이나 점수 마커와 교체합니다.", "플레이 후 색상별로 나누어 보관합니다."], recommended: ["구성품 업그레이드", "프로토타이핑", "컬러 마커"], contents: "원목 미플 24개: 빨강·주황·노랑·초록·파랑·보라 각 4개" },
  12: { title: "준비와 정리를 더 빠르게", intro: "카드·토큰·타일 크기에 맞춰 여섯 모듈을 자유롭게 조합하는 게임 정리함입니다. 박스를 열면 바로 플레이할 수 있습니다.", highlights: ["게임마다 바꾸는 모듈형 구조", "테이블 트레이로 바로 활용", "작은 토큰도 섞이지 않는 칸막이"], guide: ["보관할 구성물의 크기와 수량을 나눕니다.", "여섯 모듈을 박스 안에 맞게 배치합니다.", "플레이할 때 모듈째 꺼내 트레이로 사용합니다."], recommended: ["구성품 정리", "세팅 시간 단축", "다양한 게임"], contents: "대형 모듈 2개, 중형 모듈 2개, 소형 모듈 2개, 분리형 칸막이 12개" },
  13: { title: "빛에 따라 달라지는 오로라 컬러", intro: "투명 레진 안에서 청록·보라·장밋빛이 은은하게 바뀌는 다각면 주사위 세트입니다. 숫자는 선명하고 모서리는 정교하게 마감했습니다.", highlights: ["각도마다 달라지는 오로라 색감", "TRPG에 필요한 7종 완전 구성", "균형과 가독성을 고려한 마감"], guide: ["플레이 전 주사위 종류를 확인합니다.", "평평한 트레이에서 충분히 굴립니다.", "부드러운 파우치에 넣어 스크래치를 방지합니다."], recommended: ["TRPG 입문", "주사위 수집", "선물용"], contents: "D4, D6, D8, D10, D%, D12, D20 각 1개 · 보관 파우치" },
  14: { title: "어디에나 잘 어울리는 클래식 컬러", intro: "여섯 가지 색상의 선명한 육면체 주사위를 두 개씩 담았습니다. 보드게임의 부족한 주사위를 보충하거나 수업·점수 표시용으로 활용하기 좋습니다.", highlights: ["한눈에 구분되는 6가지 색상", "굴림이 부드러운 둥근 모서리", "여러 게임에 나눠 쓰는 12개 구성"], guide: ["게임에 필요한 색상과 수량을 고릅니다.", "평평한 트레이나 테이블에서 굴립니다.", "사용 후 색상별로 나누어 보관합니다."], recommended: ["가족 보드게임", "교육·수업", "여분 주사위"], contents: "컬러 D6 주사위 12개: 빨강·파랑·노랑·초록·주황·보라 각 2개" },
  15: { title: "손끝에서 느껴지는 메탈의 무게", intro: "용 비늘을 모티프로 한 섬세한 각인과 묵직한 금속 촉감이 특징입니다. 중요한 판정의 순간을 더욱 특별하게 만들어주는 프리미엄 세트입니다.", highlights: ["앤티크 실버 금속 마감", "면마다 이어지는 비늘 문양", "안정적인 굴림을 만드는 묵직한 무게"], guide: ["테이블 보호를 위해 주사위 트레이를 준비합니다.", "필요한 다각면 주사위를 골라 굴립니다.", "마른 천으로 닦아 전용 케이스에 보관합니다."], recommended: ["TRPG 애호가", "메탈 주사위", "프리미엄 선물"], contents: "메탈 D4, D6, D8, D10, D%, D12, D20 각 1개 · 하드 케이스" },
  16: { title: "손안에 담긴 작은 은하수", intro: "짙은 남색 투명 레진 안에 보라색과 은빛 입자를 층층이 담았습니다. 금색 숫자가 선명하게 대비되어 분위기와 실용성을 함께 갖췄습니다.", highlights: ["깊이감 있는 갤럭시 플레이크", "어두운 곳에서도 읽기 쉬운 금색 숫자", "TRPG에 필요한 7종 완전 구성"], guide: ["빛 아래에서 표면과 숫자를 확인합니다.", "트레이 중앙을 향해 충분히 굴립니다.", "부드러운 파우치로 마찰과 흠집을 줄입니다."], recommended: ["판타지 TRPG", "레진 주사위", "주사위 수집"], contents: "갤럭시 레진 D4, D6, D8, D10, D%, D12, D20 각 1개 · 벨벳 파우치" },
  17: { title: "나뭇결마다 다른 따뜻한 주사위", intro: "월넛·메이플·체리 원목을 손으로 다듬어 모든 주사위의 결이 조금씩 다릅니다. 가볍고 부드러운 굴림이 목재 게임 구성품과 자연스럽게 어울립니다.", highlights: ["서로 다른 세 가지 천연 나뭇결", "손으로 다듬은 부드러운 모서리", "소음이 적은 가벼운 굴림"], guide: ["원목 종류와 표면 상태를 확인합니다.", "마른 테이블이나 펠트 트레이에서 굴립니다.", "물기를 피하고 마른 천으로 관리합니다."], recommended: ["원목 보드게임", "내추럴 소품", "조용한 플레이"], contents: "천연 원목 D6 주사위 6개: 월넛 2개, 메이플 2개, 체리 2개 · 면 파우치" },
  18: { title: "용이 잠든 성을 되찾아라", intro: "기사·궁수·마법사·전사로 원정대를 꾸리고, 성으로 이어지는 길에서 장비와 마법을 모으세요. 다른 플레이어보다 먼저 성의 방어선을 돌파하고 용의 보물을 차지해야 합니다.", highlights: ["서로 다른 능력을 가진 네 영웅", "탐험과 장비 조합이 만드는 성장 전략", "매번 달라지는 성과 용의 방어 패턴"], guide: ["영웅 하나를 선택하고 시작 장비를 준비합니다.", "지역을 탐험해 장비·마법·동료 카드를 모읍니다.", "성의 수호자를 물리치고 용의 방에 먼저 도달합니다."], recommended: ["판타지 테마", "중급 전략", "2–4인 플레이"], contents: "게임 보드 1개, 영웅 미니어처 4개, 용 미니어처 1개, 지역 타일 48개, 장비·마법 카드 120장, 전투 주사위 8개, 토큰 96개, 규칙서" },
  19: { title: "1,000원으로 결제 흐름을 확인하세요", intro: "네이버페이 개발환경의 결제창 호출과 주문 완료 흐름을 안전하게 점검하기 위한 테스트 전용 상품입니다. 배송비가 붙지 않아 최종 결제 금액도 1,000원으로 유지됩니다.", highlights: ["최종 결제 금액 1,000원", "테스트 전용 무료배송", "실물 배송이 없는 결제 확인용 상품"], guide: ["바로 구매 버튼을 눌러 주문·결제 화면으로 이동합니다.", "배송지와 필수 정보를 입력하고 네이버페이를 선택합니다.", "1,000원 테스트 결제 버튼을 눌러 개발환경 결제창을 확인합니다."], recommended: ["네이버페이 테스트", "주문 흐름 점검", "무료배송"], contents: "결제 기능 확인용 가상 상품 1개 · 실제 배송 없음" },
};

function ProductArt({ product, large = false }: { product: Product; large?: boolean; cutout?: boolean }) {
  const style = {
    "--art-one": product.art[0],
    "--art-two": product.art[1],
    "--art-three": product.art[2],
  } as React.CSSProperties;

  if (product.category !== "보드게임" || product.imageMode === "photo") {
    return (
      <div className={`product-art product-photo-art product-art-cutout ${large ? "product-art-large" : ""}`.trim()} role="img" aria-label={`${product.name} 상품 이미지`}>
        <div className="product-photo-surface"><CutoutImage className="product-photo" src={product.image} /></div>
      </div>
    );
  }

  return (
    <div className={`product-art product-art-cutout ${large ? "product-art-large" : ""}`.trim()} style={style} role="img" aria-label={`${product.name} 보드게임 케이스 이미지`}>
      <div className="case-shadow" />
      <div className="case-spine" aria-hidden="true"><span>{product.label}</span></div>
      <div className="case-top" aria-hidden="true" />
      <div className="case-front">
        <CutoutImage className="case-cover" src={product.image} />
        <div className="case-print-texture" />
        <span className="art-label">BOARDPICK GAMES</span>
        <div className="case-title">
          <strong>{product.label}</strong>
          <small>{product.genre.toUpperCase()}</small>
        </div>
        <div className="case-specs" aria-hidden="true">
          <span>8+</span><span>{product.players}</span><span>{product.time}</span>
        </div>
      </div>
    </div>
  );
}

function FavoriteIcon({ className = "" }: { className?: string }) {
  return <span className={`favorite-icon ${className}`.trim()} aria-hidden="true">♥</span>;
}

function EmptyIcon({ type }: { type: "heart" | "bag" | "search" | "user" }) {
  if (type === "heart") return <FavoriteIcon className="header-icon header-icon-heart" />;
  return <span className={`header-icon header-icon-${type}`} aria-hidden="true" />;
}

function ServiceIcon({ type }: { type: "package" | "shipping" | "support" | "return" }) {
  return (
    <span className={`service-icon service-icon-${type}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("보드게임");
  const [diceMaterial, setDiceMaterial] = useState("전체");
  const [playerFilter, setPlayerFilter] = useState("전체");
  const [timeFilter, setTimeFilter] = useState("전체");
  const [levelFilter, setLevelFilter] = useState("전체");
  const [finderPlayers, setFinderPlayers] = useState("2인");
  const [finderTime, setFinderTime] = useState("30분 이하");
  const [finderMood, setFinderMood] = useState("가볍게");
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroInteracting, setHeroInteracting] = useState(false);
  const [sort, setSort] = useState("추천순");
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [diceMenuOpen, setDiceMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", receiver: "", receiverPhone: "", postcode: "", address: "", detailAddress: "", request: "" });
  const [payment, setPayment] = useState("네이버페이");
  const [terms, setTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [naverPayConfig, setNaverPayConfig] = useState<{ configured: boolean; clientId?: string; chainId?: string; mode?: "development" | "production" }>({ configured: false });
  const [paymentError, setPaymentError] = useState("");
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [postcodeStatus, setPostcodeStatus] = useState<"idle" | "loading" | "error">("idle");
  const [supportSearch, setSupportSearch] = useState("");
  const [selectedSupportPost, setSelectedSupportPost] = useState<number | null>(null);
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [customerLoginOpen, setCustomerLoginOpen] = useState(false);
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [customerCredentials, setCustomerCredentials] = useState({ email: "", password: "" });
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ id: "admin", password: "boardpick" });
  const [adminLoginError, setAdminLoginError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "안녕하세요! 보드픽 AI 도우미예요. 인원, 플레이 시간, 원하는 분위기를 알려주시면 게임을 골라드릴게요." }]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const completeNaverPayOrder = (approvedOrderNumber: string) => {
    setPayment("네이버페이");
    setOrderNumber(approvedOrderNumber);
    setCart([]);
    setView("complete");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    try {
      setAdminAuthenticated(window.sessionStorage.getItem("boardpick-admin-auth") === "true");
    } catch {
      setAdminAuthenticated(false);
    }
    try {
      const saved = window.localStorage.getItem("boardpick-admin-products");
      if (saved) setCustomProducts(JSON.parse(saved) as Product[]);
    } catch {
      window.localStorage.removeItem("boardpick-admin-products");
    }
  }, []);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatOpen, chatMessages, chatLoading]);

  const sendChatMessage = async (event?: FormEvent, suggestedQuestion?: string) => {
    event?.preventDefault();
    const content = (suggestedQuestion ?? chatInput).trim();
    if (!content || chatLoading) return;
    const nextMessages = [...chatMessages, { role: "user" as const, content }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatError("");
    setChatLoading(true);
    try {
      const endpoint = import.meta.env.VITE_CHAT_API_URL || `${window.location.origin}${window.location.pathname.replace(/\/?$/, "/")}api/chat`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-8) }),
      });
      const result = await response.json() as { answer?: string; message?: string };
      if (!response.ok || !result.answer) throw new Error(result.message || "답변을 불러오지 못했습니다.");
      setChatMessages((current) => [...current, { role: "assistant", content: result.answer as string }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "AI 상담에 연결하지 못했습니다.");
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${window.location.origin}${window.location.pathname.replace(/\/?$/, "/")}api/naverpay/config`).then((response) => response.json()).then((config) => setNaverPayConfig(config)).catch(() => setNaverPayConfig(localNaverPayConfig()));
    const params = new URLSearchParams(window.location.search);
    const resultCode = params.get("resultCode");
    const paymentId = params.get("paymentId");
    if (!resultCode) return;
    if (resultCode !== "Success" || !paymentId) {
      setPaymentError(params.get("resultMessage") || "네이버페이 결제가 취소되었거나 완료되지 않았습니다.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    setProcessing(true);
    fetch(`${window.location.origin}${window.location.pathname.replace(/\/?$/, "/")}api/naverpay/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, expectedAmount: Number(window.sessionStorage.getItem("boardpick-naverpay-amount") || 0) }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "네이버페이 결제 승인에 실패했습니다.");
      completeNaverPayOrder(result.merchantPayKey || `BP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
    }).catch((error) => setPaymentError(error instanceof Error ? error.message : "네이버페이 결제 승인에 실패했습니다.")).finally(() => {
      setProcessing(false);
      window.sessionStorage.removeItem("boardpick-naverpay-amount");
      window.history.replaceState({}, "", window.location.pathname);
    });
  }, []);

  useEffect(() => {
    if (view !== "home" || heroPaused || heroInteracting) return;
    const timer = window.setTimeout(() => setHeroSlide((current) => (current + 1) % heroSlides.length), 5500);
    return () => window.clearTimeout(timer);
  }, [view, heroPaused, heroInteracting, heroSlide]);

  useEffect(() => {
    if (!postcodeOpen) return;
    let cancelled = false;
    const container = document.getElementById("daum-postcode-embed");
    if (!container) return;

    setPostcodeStatus("loading");
    loadDaumPostcode().then(() => {
      if (cancelled || !window.daum?.Postcode) return;
      container.replaceChildren();
      const postcode = new window.daum.Postcode({
        width: "100%",
        height: "100%",
        oncomplete: (data) => {
          const baseAddress = data.roadAddress || data.address || data.jibunAddress;
          const extraAddress = data.addressType === "R"
            ? [data.bname, data.buildingName].filter(Boolean).join(", ")
            : "";
          const fullAddress = `${baseAddress}${extraAddress ? ` (${extraAddress})` : ""}`;
          setForm((current) => ({ ...current, postcode: data.zonecode, address: fullAddress, detailAddress: "" }));
          setPostcodeStatus("idle");
          setPostcodeOpen(false);
          window.setTimeout(() => document.getElementById("checkout-detail-address")?.focus(), 0);
        },
        onclose: () => {
          setPostcodeStatus("idle");
          setPostcodeOpen(false);
        },
      });
      postcode.embed(container, { autoClose: true });
      setPostcodeStatus("idle");
    }).catch(() => {
      if (!cancelled) setPostcodeStatus("error");
    });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [postcodeOpen]);

  const catalogProducts = useMemo(() => [...customProducts, ...products], [customProducts]);
  const activeHero = heroSlides[heroSlide];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCart = cart.filter((item) => item.selected);
  const subtotal = selectedCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const paymentTestOnly = selectedCart.length > 0 && selectedCart.every((item) => item.product.paymentTest);
  const shipping = subtotal === 0 || subtotal >= 50000 || paymentTestOnly ? 0 : 3000;
  const total = subtotal + shipping;
  const selectedDetail = productDetailCopy[selectedProduct.id] ?? {
    title: selectedProduct.name,
    intro: selectedProduct.description,
    highlights: ["상품 정보가 명확하게 정리된 보드픽 등록 상품", `${selectedProduct.players} · ${selectedProduct.time}`, `${selectedProduct.genre} 카테고리 추천`] as [string, string, string],
    guide: ["상품 이미지와 기본 정보를 확인합니다.", "구성과 규격이 플레이 환경에 맞는지 살펴봅니다.", "수량을 선택해 장바구니 또는 바로 구매를 진행합니다."] as [string, string, string],
    recommended: [selectedProduct.genre, selectedProduct.players, selectedProduct.level],
    contents: selectedProduct.description,
  };
  const isDiceCategory = diceTypeFilters.some((item) => item.value === category);
  const showDiceMaterialFilters = category === "다각면 세트" || category === "D6 세트";
  const supportView = (["delivery", "returns", "faq"] as SupportView[]).includes(view as SupportView) ? view as SupportView : null;
  const supportBoard = supportView ? supportBoards[supportView] : null;
  const visibleSupportPosts = supportBoard?.posts.filter((post) => post.title.includes(supportSearch.trim())) ?? [];
  const customerReviews = useMemo(() => {
    const isBoardGame = selectedProduct.category === "보드게임";
    return [
      {
        id: 1,
        author: "김**",
        rating: 5,
        date: "2026.08.10",
        title: `${selectedProduct.name}, 기대 이상이에요`,
        body: isBoardGame
          ? "주말에 가족과 바로 플레이해 봤는데 규칙을 익히기 어렵지 않았고, 구성품과 아트워크도 기대 이상이었어요. 포장 상태도 깔끔했습니다."
          : "사진에서 본 색감과 실제 제품이 거의 같고 마감도 깔끔해요. 게임할 때 바로 사용해 봤는데 손에 닿는 느낌도 좋았습니다.",
      },
      {
        id: 2,
        author: "박**",
        rating: 5,
        date: "2026.08.07",
        title: isBoardGame ? "모임의 분위기를 확실히 살려줘요" : "테이블 위에서 더 예쁜 제품",
        body: isBoardGame
          ? `${selectedProduct.players} 모임에 가져갔는데 모두 재미있게 즐겼습니다. 한 판이 끝난 뒤 자연스럽게 다시 하자는 이야기가 나올 만큼 반응이 좋았어요.`
          : "보관과 사용이 편하고 다른 게임 구성품과도 잘 어울립니다. 작은 디테일까지 신경 쓴 제품이라 만족스러워요.",
      },
      {
        id: 3,
        author: "이**",
        rating: 4,
        date: "2026.08.03",
        title: "선물용으로도 만족스러워요",
        body: `보드게임을 좋아하는 친구에게 ${selectedProduct.name}을 선물했어요. 배송이 빠르고 박스 손상 없이 도착해서 안심했습니다.`,
      },
    ];
  }, [selectedProduct]);

  const visibleProducts = useMemo(() => {
    let list = catalogProducts.filter((p) => {
      const text = `${p.name} ${p.genre} ${p.category}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesCategory = p.paymentTest && view === "new" ? true : category === "전체" ? p.category === "보드게임" : p.category === category || p.genre.includes(category) || Boolean(p.diceTags?.includes(category));
      const matchesDiceMaterial = !isDiceCategory || diceMaterial === "전체" || Boolean(p.diceTags?.includes(diceMaterial));
      const playerRange = numericRange(p.players);
      const playerMin = playerRange[0] ?? 0;
      const playerMax = playerRange[playerRange.length - 1] ?? 0;
      const matchesPlayers = p.category !== "보드게임" || playerFilter === "전체"
        || (playerFilter === "2인" && playerMin <= 2 && playerMax >= 2)
        || (playerFilter === "3–4인" && playerMax >= 4)
        || (playerFilter === "5인+" && playerMax >= 5);
      const playMinutes = numericRange(p.time);
      const maxMinutes = playMinutes[playMinutes.length - 1] ?? 0;
      const matchesTime = p.category !== "보드게임" || timeFilter === "전체"
        || (timeFilter === "30분 이하" && maxMinutes <= 30)
        || (timeFilter === "60분 이하" && maxMinutes > 30 && maxMinutes <= 60)
        || (timeFilter === "60분+" && maxMinutes > 60);
      const matchesLevel = p.category !== "보드게임" || levelFilter === "전체" || p.level === levelFilter;
      const matchesView = view === "new" ? p.badge === "NEW" || p.badge === "재입고" || p.paymentTest : view === "featured" ? p.featured : true;
      return matchesSearch && matchesCategory && matchesDiceMaterial && matchesPlayers && matchesTime && matchesLevel && matchesView;
    });
    if (sort === "추천순") list = [...list].sort((a, b) => Number(b.id > 18) - Number(a.id > 18) || Number(b.id === 18) - Number(a.id === 18));
    if (sort === "낮은 가격순") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "높은 가격순") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "평점순") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [catalogProducts, search, category, diceMaterial, playerFilter, timeFilter, levelFilter, isDiceCategory, sort, view]);

  const navigate = (next: View) => {
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateFromTop = (next: View) => {
    setBoardMenuOpen(false);
    setDiceMenuOpen(false);
    navigate(next);
  };

  const moveHero = (direction: number) => setHeroSlide((current) => (current + direction + heroSlides.length) % heroSlides.length);

  const openHeroPrimary = () => {
    if (activeHero.id === "curation") {
      setCategory("보드게임");
      navigate("shop");
    } else if (activeHero.id === "dice") {
      setCategory("주사위");
      setDiceMaterial("전체");
      navigate("shop");
    } else {
      openProduct(products[17]);
    }
  };

  const openHeroSecondary = () => {
    if (activeHero.id === "curation") navigate("featured");
    else if (activeHero.id === "dice") {
      setCategory("다각면 세트");
      setDiceMaterial("전체");
      navigate("shop");
    } else {
      setCategory("전략");
      navigate("shop");
    }
  };

  const openSupport = (next: SupportView) => {
    setSupportSearch("");
    setSelectedSupportPost(null);
    navigate(next);
  };

  const scrollToDetail = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setDetailQuantity(1);
    navigate("detail");
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  const openAdminAccess = () => {
    if (adminAuthenticated) {
      navigateFromTop("admin");
      return;
    }
    setAdminLoginError("");
    setAdminCredentials({ id: "admin", password: "boardpick" });
    setAdminLoginOpen(true);
  };

  const loginAdmin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (adminCredentials.id !== "admin" || adminCredentials.password !== "boardpick") {
      setAdminLoginError("관리자 아이디 또는 비밀번호를 확인해 주세요.");
      return;
    }
    try {
      window.sessionStorage.setItem("boardpick-admin-auth", "true");
    } catch {
      // 저장소를 사용할 수 없는 브라우저에서도 현재 세션의 관리자 화면은 열 수 있습니다.
    }
    setAdminAuthenticated(true);
    setAdminLoginOpen(false);
    setAdminLoginError("");
    setBoardMenuOpen(false);
    setDiceMenuOpen(false);
    setView("admin");
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("관리자 공간에 로그인했습니다.");
  };

  const logoutAdmin = () => {
    try {
      window.sessionStorage.removeItem("boardpick-admin-auth");
    } catch {
      // 메모리의 로그인 상태는 아래에서 항상 초기화합니다.
    }
    setAdminAuthenticated(false);
    setAdminLoginOpen(false);
    navigateFromTop("home");
    showToast("관리자 공간에서 로그아웃했습니다.");
  };

  const saveCustomProducts = (next: Product[]) => {
    try {
      window.localStorage.setItem("boardpick-admin-products", JSON.stringify(next));
      setCustomProducts(next);
      return true;
    } catch {
      showToast("이미지 용량이 커서 저장할 수 없어요.");
      return false;
    }
  };

  const handleAdminImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      showToast("1.5MB 이하 이미지를 선택해 주세요.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAdminForm((current) => ({ ...current, image: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  const registerProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminForm.image) {
      showToast("상품 이미지를 등록해 주세요.");
      return;
    }
    const receivedDate = adminForm.received.split("-");
    const palette: Product["art"] = adminForm.category === "보드게임"
      ? ["#274c3a", "#d9b965", "#dce9df"]
      : adminForm.category === "주사위"
        ? ["#394b67", "#8cb6bd", "#d9d6ef"]
        : ["#5d675f", "#d0b58c", "#e8ece8"];
    const nextProduct: Product = {
      id: Date.now(),
      name: adminForm.name.trim(),
      label: adminForm.label.trim() || adminForm.name.trim().toUpperCase(),
      image: adminForm.image,
      imageMode: "photo",
      category: adminForm.category,
      genre: adminForm.genre.trim(),
      diceTags: adminForm.category === "주사위" ? [adminForm.diceType, adminForm.material] : undefined,
      price: Number(adminForm.price),
      originalPrice: adminForm.originalPrice ? Number(adminForm.originalPrice) : undefined,
      players: adminForm.players.trim(),
      time: adminForm.time.trim(),
      level: adminForm.level.trim(),
      received: receivedDate.length === 3 ? `${receivedDate[1]}.${receivedDate[2]} 입고` : "신규 입고",
      badge: adminForm.badge || undefined,
      art: palette,
      rating: 0,
      reviews: 0,
      description: adminForm.description.trim(),
      stock: Number(adminForm.stock),
      age: adminForm.age.trim(),
      language: adminForm.language.trim(),
    };
    if (saveCustomProducts([nextProduct, ...customProducts])) {
      setAdminForm(emptyAdminForm);
      showToast(`${nextProduct.name} 상품을 등록했어요.`);
    }
  };

  const removeCustomProduct = (id: number) => {
    const target = customProducts.find((product) => product.id === id);
    if (saveCustomProducts(customProducts.filter((product) => product.id !== id))) showToast(`${target?.name || "상품"}을 삭제했어요.`);
  };

  const addToCart = (product: Product, quantity = 1, goToCart = false) => {
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id);
      return found
        ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity, selected: true } : item)
        : [...current, { product, quantity, selected: true }];
    });
    if (goToCart) navigate("cart");
    else showToast(`${product.name}을(를) 장바구니에 담았어요.`);
  };

  const buyNow = (product: Product, quantity = 1) => {
    setCart([{ product, quantity, selected: true }]);
    navigate("checkout");
  };

  const updateQuantity = (id: number, change: number) => {
    setCart((current) => current.map((item) => item.product.id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item));
  };

  const toggleLike = (id: number) => setLiked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setMobileSearchOpen(false);
    setCategory("전체");
    navigateFromTop("shop");
  };

  const applyGameFinder = () => {
    setCategory(finderMood === "전략적으로" ? "전략" : finderMood === "함께" ? "협력" : "보드게임");
    setPlayerFilter(finderPlayers);
    setTimeFilter(finderTime);
    setLevelFilter(finderMood === "가볍게" ? "매우 쉬움" : "전체");
    setSort("추천순");
    navigate("shop");
  };

  const checkoutValid = Boolean(
    form.name && form.phone && form.email && form.receiver && form.receiverPhone && form.postcode && form.address && form.detailAddress && terms && selectedCart.length
  );

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!checkoutValid) return;
    setPaymentError("");
    if (payment === "네이버페이") {
      if (!naverPayConfig.configured || !naverPayConfig.clientId || !naverPayConfig.chainId) {
        setPaymentError("네이버페이 테스트 인증값이 아직 설정되지 않았습니다. 환경변수를 설정한 뒤 다시 시도해 주세요.");
        return;
      }
      setProcessing(true);
      try {
        await loadNaverPay();
        const merchantPayKey = `BP-${Date.now()}`;
        const productName = selectedCart[0]?.product.name || "보드픽 상품";
        window.sessionStorage.setItem("boardpick-naverpay-amount", String(total));
        window.Naver?.Pay.create({ mode: naverPayConfig.mode || "development", payType: "normal", openType: "page", clientId: naverPayConfig.clientId, chainId: naverPayConfig.chainId }).open({
          merchantUserKey: `guest-${merchantPayKey}`,
          merchantPayKey,
          productName,
          productCount: selectedCart.reduce((sum, item) => sum + item.quantity, 0),
          totalPayAmount: total,
          taxScopeAmount: total,
          taxExScopeAmount: 0,
          returnUrl: `${window.location.origin}${window.location.pathname}`,
          productItems: selectedCart.map((item) => ({ categoryType: "ETC", categoryId: "ETC", uid: String(item.product.id), name: item.product.name, payReferrer: "ETC", count: item.quantity })),
        });
      } catch (error) {
        setProcessing(false);
        setPaymentError(error instanceof Error ? error.message : "네이버페이 결제창을 열지 못했습니다.");
      }
      return;
    }
    setProcessing(true);
    window.setTimeout(() => {
      setOrderNumber(`BP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
      setProcessing(false);
      setCart([]);
      navigate("complete");
    }, 900);
  };

  const ProductCard = ({ product }: { product: Product }) => {
    const facts = productFacts(product);
    const stock = product.stock ?? (product.id * 7) % 11 + 2;
    return (
      <article className="product-card">
        <button className="product-image-button" onClick={() => openProduct(product)} aria-label={`${product.name} 상세 보기`}>
          <ProductArt product={product} />
          {product.badge && <span className={`badge badge-${product.badge === "재입고" ? "restock" : product.badge.toLowerCase()}`}>{product.badge}</span>}
          {product.originalPrice && <span className="discount-badge"><strong>{Math.round((1 - product.price / product.originalPrice) * 100)}%</strong><small>OFF</small></span>}
        </button>
        <div className="product-card-body">
          <div className="product-card-topline">
            <span>{product.genre}</span>
            <button className={`heart-button ${liked.includes(product.id) ? "active" : ""}`} onClick={() => toggleLike(product.id)} aria-label={liked.includes(product.id) ? `${product.name} 찜 해제` : `${product.name} 찜하기`}>
              <FavoriteIcon />
            </button>
          </div>
          <button className="product-title" onClick={() => openProduct(product)}>{product.name}</button>
          <div className="product-facts" aria-label="상품 핵심 정보">{facts.map((fact) => <span key={fact}>{fact}</span>)}</div>
          <p className="editor-note"><b>보드픽</b>{editorNote(product)}</p>
          <div className="price-row">
            <strong>{formatWon(product.price)}</strong>
            {product.originalPrice && <del>{formatWon(product.originalPrice)}</del>}
          </div>
          <div className="rating-row">{product.reviews ? <><span aria-hidden="true">★</span> {product.rating} <small>리뷰 {product.reviews}</small></> : <small className="new-product-copy">신규 등록</small>}<b className={stock <= 4 ? "low-stock" : ""}>{stock <= 4 ? `재고 ${stock}개` : "바로 출고"}</b></div>
        </div>
      </article>
    );
  };

  const SectionHeader = ({ eyebrow, title, description, target }: { eyebrow: string; title: string; description: string; target?: View }) => (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {target && <button className="text-link" onClick={() => navigate(target)}>전체보기 <span aria-hidden="true">→</span></button>}
    </div>
  );

  const adminPreview: Product = {
    id: -1,
    name: adminForm.name || "새 상품 이름",
    label: adminForm.label || "NEW PRODUCT",
    image: adminForm.image,
    imageMode: "photo",
    category: adminForm.category,
    genre: adminForm.genre || "카테고리",
    diceTags: adminForm.category === "주사위" ? [adminForm.diceType, adminForm.material] : undefined,
    price: Number(adminForm.price) || 0,
    originalPrice: Number(adminForm.originalPrice) || undefined,
    players: adminForm.players || "규격 정보",
    time: adminForm.time || "구성 정보",
    level: adminForm.level || "특징 정보",
    received: "신규 입고",
    badge: adminForm.badge || undefined,
    art: ["#274c3a", "#d9b965", "#dce9df"],
    rating: 0,
    reviews: 0,
    description: adminForm.description || "상품 설명이 이곳에 표시됩니다.",
    stock: Number(adminForm.stock) || 0,
    age: adminForm.age,
    language: adminForm.language,
  };

  return (
    <main>
      <div className="benefit-bar"><span>오늘 주문하면 내일 출발</span><span>5만원 이상 무료배송</span></div>
      <header className="site-header">
        <div className="header-main page-shell">
          <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴 열기" aria-expanded={menuOpen}>☰</button>
          <button className="brand" onClick={() => navigateFromTop("home")} aria-label="보드픽 홈">
            <img className="brand-logo" src={siteAsset("/brand/boardpick-logo.png")} alt="보드픽 BOARD PICK" />
          </button>
          <form className="search-box" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="site-search">상품 검색</label>
            <input id="site-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="어떤 게임을 찾으세요?" />
            <button type="submit" aria-label="검색"><EmptyIcon type="search" /></button>
          </form>
          <div className="header-actions">
            <button onClick={() => { setBoardMenuOpen(false); setDiceMenuOpen(false); showToast(liked.length ? `찜한 상품이 ${liked.length}개 있어요.` : "아직 찜한 상품이 없어요."); }}><EmptyIcon type="heart" /><small>찜 {liked.length || ""}</small></button>
            <button className="cart-action" onClick={() => navigateFromTop("cart")}><EmptyIcon type="bag" /><small>장바구니</small>{cartCount > 0 && <b>{cartCount}</b>}</button>
            <button onClick={() => customerLoggedIn ? showToast("로그인되어 있어요.") : setCustomerLoginOpen(true)}><EmptyIcon type="user" /><small>{customerLoggedIn ? "내 정보" : "로그인"}</small></button>
          </div>
          <button className="mobile-search-button" type="button" onClick={() => setMobileSearchOpen((open) => !open)} aria-label={mobileSearchOpen ? "검색창 닫기" : "검색창 열기"} aria-expanded={mobileSearchOpen} aria-controls="mobile-search-panel"><EmptyIcon type="search" /></button>
        </div>
        <form id="mobile-search-panel" className={`mobile-search-panel ${mobileSearchOpen ? "open" : ""}`} onSubmit={handleSearch}>
          <div className="page-shell">
            <label className="sr-only" htmlFor="mobile-site-search">상품 검색</label>
            <input id="mobile-site-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="어떤 게임을 찾으세요?" />
            <button type="submit" aria-label="검색"><EmptyIcon type="search" /></button>
          </div>
        </form>
        <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="주요 메뉴">
          <div className="primary-nav page-shell">
            <button className={`submenu-trigger ${boardMenuOpen ? "active" : ""}`} onClick={() => { setDiceMenuOpen(false); setBoardMenuOpen(!boardMenuOpen); }} aria-expanded={boardMenuOpen} aria-controls="board-game-submenu">보드게임 <span aria-hidden="true">⌄</span></button>
            <button className={`submenu-trigger ${diceMenuOpen ? "active" : ""}`} onClick={() => { setBoardMenuOpen(false); setDiceMenuOpen(!diceMenuOpen); }} aria-expanded={diceMenuOpen} aria-controls="dice-submenu">주사위 <span aria-hidden="true">⌄</span></button>
            <button onClick={() => { setSearch(""); setCategory("액세서리"); navigateFromTop("shop"); }}>액세서리</button>
          </div>
          {boardMenuOpen && (
            <div className="board-subnav" id="board-game-submenu">
              <div className="page-shell">
                <span className="subnav-label">보드게임 둘러보기</span>
                <button className={view === "new" ? "active" : ""} aria-current={view === "new" ? "page" : undefined} onClick={() => { setSearch(""); setCategory("보드게임"); navigate("new"); }}>신상품 <span aria-hidden="true">→</span></button>
                <button className={view === "shop" && category === "가족" ? "active" : ""} aria-current={view === "shop" && category === "가족" ? "page" : undefined} onClick={() => { setSearch(""); setSort("추천순"); setCategory("가족"); navigate("shop"); }}>테마 추천 <span aria-hidden="true">→</span></button>
                <button className={view === "featured" ? "active" : ""} aria-current={view === "featured" ? "page" : undefined} onClick={() => { setSearch(""); setCategory("보드게임"); navigate("featured"); }}>보드픽 추천 <span aria-hidden="true">→</span></button>
                <button className={view === "shop" && category === "보드게임" && sort === "평점순" ? "active" : ""} aria-current={view === "shop" && category === "보드게임" && sort === "평점순" ? "page" : undefined} onClick={() => { setSearch(""); setSort("평점순"); setCategory("보드게임"); navigate("shop"); }}>베스트 <span aria-hidden="true">→</span></button>
              </div>
            </div>
          )}
          {diceMenuOpen && (
            <div className="board-subnav dice-subnav" id="dice-submenu">
              <div className="page-shell">
                <span className="subnav-label">주사위 종류</span>
                {diceTypeFilters.map((item) => {
                  const count = catalogProducts.filter((product) => item.value === "주사위" ? Boolean(product.diceTags?.length) : product.diceTags?.includes(item.value)).length;
                  const active = view === "shop" && category === item.value;
                  return <button key={item.value} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => { setSearch(""); setSort("추천순"); setDiceMaterial("전체"); setCategory(item.value); navigate("shop"); }}>{item.label} <span aria-label={`${count}개 상품`}>{String(count).padStart(2, "0")}</span></button>;
                })}
              </div>
            </div>
          )}
        </nav>
        {adminAuthenticated && (
          <nav className="admin-workspace-bar" aria-label="관리자 전용 메뉴">
            <div className="page-shell">
              <span><b>ADMIN</b> 보드픽 운영 공간</span>
              <div>
                <button className={view === "admin" ? "active" : ""} aria-current={view === "admin" ? "page" : undefined} onClick={() => navigateFromTop("admin")}>상품 등록</button>
                <button onClick={() => navigateFromTop("home")}>쇼핑몰 보기</button>
                <button onClick={logoutAdmin}>로그아웃</button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {view === "home" && (
        <>
          <section className={`hero-carousel ${heroPaused || heroInteracting ? "paused" : ""}`} aria-label="보드픽 주요 기획전" aria-roledescription="carousel" onFocusCapture={() => setHeroInteracting(true)} onBlurCapture={() => setHeroInteracting(false)}>
            <div className={`hero hero-slide page-shell ${activeHero.tone}`} key={activeHero.id}>
              <div className="hero-copy">
                <span className="eyebrow">{activeHero.eyebrow}</span>
                <h1>{activeHero.titleTop}<br />{activeHero.titleBottom}</h1>
                <p>{activeHero.description}</p>
                <div className="hero-buttons">
                  <button className="button-primary" onClick={openHeroPrimary}>{activeHero.primary}</button>
                  <button className="button-secondary" onClick={openHeroSecondary}>{activeHero.secondary}</button>
                </div>
                <div className="hero-note">{(activeHero.id === "curation" ? ["평균 평점 4.8", "에디터 플레이 검증", "한글판 명확 표기"] : activeHero.id === "dice" ? ["재질별 큐레이션", "7종 다각면 세트", "숫자 가독성 검수"] : ["08.11 신규 입고", "2–4인 전략 모험", "에디터 추천작"]).map((note) => <span key={note}>{note}</span>)}</div>
              </div>
              <div className={`hero-stage hero-stage-${activeHero.visual}`} aria-label={`${activeHero.tab} 대표 상품`}>
                {activeHero.visual === "boards" && <><CutoutImage className="hero-cases-photo" src="/boardgame-cases-hero.png" alt="문 가든, 코스믹 카페, 포레스트 포스트 보드게임 상자와 게임 말" /><span className="hero-photo-caption">BOARDPICK CURATED · 03 GAMES</span></>}
                {activeHero.visual === "dice" && <div className="hero-dice-composition" role="img" aria-label="오로라, 메탈 드래곤, 갤럭시 다각면 주사위"><CutoutImage src="/product-art/aurora-d20-v3.png" /><CutoutImage src="/product-art/metal-dragon-d20-v3.png" /><CutoutImage src="/product-art/galaxy-d20-v3.png" /></div>}
                {activeHero.visual === "dragon" && <div className="hero-dragon-product"><ProductArt product={products[17]} large cutout /><span>DRAGON'S KEEP<br /><small>STRATEGY ADVENTURE</small></span></div>}
                <strong className="hero-mobile-product-title">{activeHero.visual === "boards" ? "보드픽 추천 보드게임" : activeHero.visual === "dice" ? "오로라 · 메탈 · 갤럭시 다이스" : products[17].name}</strong>
              </div>
            </div>
            <button className="hero-arrow hero-arrow-prev" type="button" onClick={() => moveHero(-1)} aria-label="이전 배너">‹</button>
            <button className="hero-arrow hero-arrow-next" type="button" onClick={() => moveHero(1)} aria-label="다음 배너">›</button>
            <div className="hero-controls page-shell">
              <button className="hero-pause" type="button" onClick={() => setHeroPaused((current) => !current)} aria-label={heroPaused ? "자동 전환 시작" : "자동 전환 일시정지"}>{heroPaused ? "▶" : "Ⅱ"}</button>
              <div className="hero-tabs">{heroSlides.map((slide, index) => <button key={slide.id} type="button" className={heroSlide === index ? "active" : ""} onClick={() => setHeroSlide(index)} aria-current={heroSlide === index ? "true" : undefined}><b>0{index + 1}</b><span>{slide.tab}</span>{heroSlide === index && <i className="hero-tab-progress" />}</button>)}</div>
              <span className="hero-count"><b>0{heroSlide + 1}</b> / 0{heroSlides.length}</span>
            </div>
          </section>

          <section className="quick-section page-shell" aria-label="빠른 상품 찾기">
            {[
              ["2인용", "둘이서 오붓하게"], ["가족", "함께 웃는 시간"], ["파티", "여럿이 신나게"], ["전략", "깊이 있게"], ["액세서리", "플레이를 편하게"],
            ].map(([label, copy]) => (
              <button key={label} onClick={() => { setCategory(label === "2인용" ? "2인" : label); navigate("shop"); }}><span>{label}</span><small>{copy}</small><i aria-hidden="true">→</i></button>
            ))}
          </section>

          <section className="content-section page-shell">
            <SectionHeader eyebrow="EDITOR'S PICK" title="이번 주 보드픽" description="게임을 고르는 시간이 즐거워지도록, 지금 가장 추천하고 싶은 게임을 골랐어요." target="featured" />
            <div className="featured-layout">
              <button className="featured-visual" onClick={() => openProduct(products[0])} aria-label={`${products[0].name} 상세 보기`}>
                <ProductArt product={products[0]} large cutout />
                <span className="featured-number">01</span>
                <strong className="featured-mobile-title">{products[0].name}</strong>
              </button>
              <div className="featured-copy">
                <span className="mini-label">가족이 함께 시작하기 좋은 전략 게임</span>
                <h3>{products[0].name}</h3>
                <p>{products[0].description}</p>
                <div className="info-pills"><span>{products[0].players}</span><span>{products[0].time}</span><span>난이도 {products[0].level}</span></div>
                <div className="featured-price"><strong>{formatWon(products[0].price)}</strong><del>{formatWon(products[0].originalPrice || 0)}</del></div>
                <div className="featured-actions"><button className="button-primary" onClick={() => openProduct(products[0])}>상품 자세히 보기</button><button className={`round-heart ${liked.includes(products[0].id) ? "active" : ""}`} onClick={() => toggleLike(products[0].id)} aria-label="달빛 정원 찜하기">♥</button></div>
              </div>
            </div>
          </section>

          <section className="content-section page-shell">
            <SectionHeader eyebrow="JUST ARRIVED" title="새로 들어왔어요" description="가장 최근에 입고된 게임과 플레이 용품을 만나보세요." target="new" />
            <div className="product-grid product-grid-scroll">{catalogProducts.filter((p) => p.badge === "NEW" || p.badge === "재입고" || p.paymentTest).sort((a, b) => Number(Boolean(b.paymentTest)) - Number(Boolean(a.paymentTest))).slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>

          <section className="content-section page-shell">
            <SectionHeader eyebrow="MOST LOVED" title="지금 많이 찾는 게임" description="보드픽 고객이 직접 고른 만족도 높은 인기 게임이에요." target="shop" />
            <div className="product-grid">{[products[6], products[7], products[4], products[3]].map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>

          <section className="game-finder page-shell" aria-labelledby="game-finder-title">
            <div className="game-finder-intro"><span className="eyebrow">FIND YOUR GAME</span><h2 id="game-finder-title">세 가지만 고르면<br />오늘의 게임을 찾아드려요</h2><p>상품명이 아니라 함께할 상황으로 찾아보세요.</p></div>
            <div className="finder-form">
              <fieldset><legend><b>01</b> 몇 명이 플레이하나요?</legend><div>{["2인", "3–4인", "5인+"].map((item) => <button type="button" key={item} className={finderPlayers === item ? "active" : ""} onClick={() => setFinderPlayers(item)}>{item}</button>)}</div></fieldset>
              <fieldset><legend><b>02</b> 시간은 얼마나 있나요?</legend><div>{["30분 이하", "60분 이하", "60분+"].map((item) => <button type="button" key={item} className={finderTime === item ? "active" : ""} onClick={() => setFinderTime(item)}>{item}</button>)}</div></fieldset>
              <fieldset><legend><b>03</b> 어떤 분위기가 좋아요?</legend><div>{["가볍게", "함께", "전략적으로"].map((item) => <button type="button" key={item} className={finderMood === item ? "active" : ""} onClick={() => setFinderMood(item)}>{item}</button>)}</div></fieldset>
              <button className="button-primary finder-submit" type="button" onClick={applyGameFinder}>조건에 맞는 게임 보기 <span aria-hidden="true">→</span></button>
            </div>
          </section>

          <section className="content-section page-shell">
            <SectionHeader eyebrow="PLAY BETTER" title="게임을 더 편하게" description="보관부터 플레이까지, 꼭 필요한 액세서리만 모았어요." target="shop" />
            <div className="product-grid product-grid-three">{catalogProducts.filter((p) => p.category === "액세서리").slice(0, 3).map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>

          <section className="service-strip page-shell">
            <div><ServiceIcon type="package" /><span className="service-copy"><strong>안전 포장</strong><small>상품에 맞춘 꼼꼼한 포장</small></span></div>
            <div><ServiceIcon type="shipping" /><span className="service-copy"><strong>빠른 배송</strong><small>평일 오후 2시 이전 당일 출고</small></span></div>
            <div><ServiceIcon type="support" /><span className="service-copy"><strong>상품 상담</strong><small>게임 선택이 어려울 때 도와드려요</small></span></div>
            <div><ServiceIcon type="return" /><span className="service-copy"><strong>교환·반품</strong><small>수령 후 7일 이내 간편 접수</small></span></div>
          </section>
        </>
      )}

      {(view === "shop" || view === "new" || view === "featured") && (
        <section className="collection page-shell">
          <div className="collection-heading">
            <span className="eyebrow">{view === "new" ? "JUST ARRIVED" : view === "featured" ? "EDITOR'S PICK" : "ALL PRODUCTS"}</span>
            <h1>{view === "new" ? "새로 들어온 보드게임" : view === "featured" ? "보드픽이 추천해요" : isDiceCategory ? "플레이를 완성하는 주사위" : "취향에 맞는 게임 찾기"}</h1>
            <p>{view === "new" ? "실제 입고일이 가장 최근인 상품부터 보여드려요." : view === "featured" ? "직접 플레이하고 자신 있게 추천하는 이번 시즌의 선택입니다." : isDiceCategory ? "형태와 재질을 먼저 고르면 내 게임에 맞는 주사위를 더 쉽게 찾을 수 있어요." : "인원, 시간, 난이도를 기준으로 편하게 골라보세요."}</p>
          </div>
          {view === "featured" && (
            <div className="collection-featured">
              <ProductArt product={products[1]} large cutout />
              <div><span>모임의 첫 게임</span><h2>{products[1].name}</h2><p>{products[1].featureCopy}. 규칙 설명은 5분이면 충분하고, 매번 다른 이야기가 펼쳐져요.</p><button className="button-primary" onClick={() => openProduct(products[1])}>추천 상품 보기</button></div>
            </div>
          )}
          <div className="filter-panel">
            <div className="filter-rows">
              {!isDiceCategory && category !== "액세서리" && (
                <>
                  <div className="filter-group"><strong>장르</strong><div>{boardGameFilters.map((item) => <button key={item.value} className={category === item.value || (category === "전체" && item.value === "보드게임") ? "active" : ""} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div></div>
                  <div className="filter-group"><strong>인원</strong><div>{boardPlayerFilters.map((item) => <button key={item} className={playerFilter === item ? "active" : ""} onClick={() => setPlayerFilter(item)}>{item}</button>)}</div></div>
                  <div className="filter-group"><strong>시간</strong><div>{boardTimeFilters.map((item) => <button key={item} className={timeFilter === item ? "active" : ""} onClick={() => setTimeFilter(item)}>{item}</button>)}</div></div>
                  <div className="filter-group"><strong>난이도</strong><div>{boardLevelFilters.map((item) => <button key={item} className={levelFilter === item ? "active" : ""} onClick={() => setLevelFilter(item)}>{item}</button>)}</div></div>
                </>
              )}
              {isDiceCategory && (
                <>
                  <div className="filter-group"><strong>종류</strong><div>{diceTypeFilters.map((item) => <button key={item.value} className={category === item.value ? "active" : ""} onClick={() => { setCategory(item.value); setDiceMaterial("전체"); }}>{item.label}</button>)}</div></div>
                  {showDiceMaterialFilters && <div className="filter-group"><strong>재질</strong><div>{["전체", ...diceMaterialFilters].map((material) => <button key={material} className={diceMaterial === material ? "active" : ""} onClick={() => setDiceMaterial(material)}>{material}</button>)}</div></div>}
                </>
              )}
              {category === "액세서리" && <div className="filter-context"><strong>플레이 액세서리</strong><span>주사위 상품을 제외한 보관·보호·정리 용품만 보여드려요.</span></div>}
            </div>
            <div className="filter-tools"><span><strong>{visibleProducts.length}</strong>개의 상품</span>{!isDiceCategory && category !== "액세서리" && <button type="button" onClick={() => { setCategory("보드게임"); setPlayerFilter("전체"); setTimeFilter("전체"); setLevelFilter("전체"); }}>조건 초기화</button>}<label>정렬 <select value={sort} onChange={(e) => setSort(e.target.value)}><option>추천순</option><option>평점순</option><option>낮은 가격순</option><option>높은 가격순</option></select></label></div>
          </div>
          {search && <div className="search-result-copy">‘{search}’ 검색 결과 <strong>{visibleProducts.length}</strong>개 <button onClick={() => setSearch("")}>검색어 지우기</button></div>}
          {visibleProducts.length ? <div className="product-grid collection-grid">{visibleProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty-state"><EmptyIcon type="search" /><h2>조건에 맞는 상품이 없어요</h2><p>검색어나 필터를 바꿔 다시 찾아보세요.</p><button className="button-primary" onClick={() => { setSearch(""); setCategory("전체"); }}>전체 상품 보기</button></div>}
        </section>
      )}

      {view === "admin" && adminAuthenticated && (
        <section className="admin-page page-shell">
          <header className="admin-heading">
            <div><span className="eyebrow">LOCAL STORE MANAGER</span><h1>상품 등록</h1><p>상품 정보를 입력하면 쇼핑몰 상품 목록과 상세 페이지에 바로 반영됩니다.</p></div>
            <button className="button-secondary" onClick={() => navigate("shop")}>쇼핑몰 보기 <span aria-hidden="true">→</span></button>
          </header>
          <div className="admin-summary" aria-label="상품 현황">
            <div><small>전체 상품</small><strong>{catalogProducts.length}</strong><span>개</span></div>
            <div><small>직접 등록</small><strong>{customProducts.length}</strong><span>개</span></div>
            <div><small>보드게임</small><strong>{catalogProducts.filter((product) => product.category === "보드게임").length}</strong><span>개</span></div>
            <div><small>주사위·액세서리</small><strong>{catalogProducts.filter((product) => product.category !== "보드게임").length}</strong><span>개</span></div>
          </div>
          <div className="admin-layout">
            <form className="admin-form" onSubmit={registerProduct}>
              <section className="admin-form-section">
                <div className="admin-section-title"><span>01</span><div><h2>기본 정보</h2><p>고객이 상품을 구분하는 이름과 카테고리를 입력하세요.</p></div></div>
                <div className="admin-fields">
                  <label><span>상품명 <b>*</b></span><input required value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} placeholder="예: 별빛 항해단" /></label>
                  <label><span>영문 상품명</span><input value={adminForm.label} onChange={(event) => setAdminForm({ ...adminForm, label: event.target.value })} placeholder="예: STAR VOYAGERS" /></label>
                  <label><span>상품 분류 <b>*</b></span><select value={adminForm.category} onChange={(event) => { const next = event.target.value as Product["category"]; setAdminForm({ ...adminForm, category: next, players: next === "보드게임" ? "2–4인" : next === "주사위" ? "7개 세트" : "1개", time: next === "보드게임" ? "30분" : next === "주사위" ? "다각면" : "기본 규격", level: next === "보드게임" ? "쉬움" : next === "주사위" ? "레진" : "기본형" }); }}><option>보드게임</option><option>주사위</option><option>액세서리</option></select></label>
                  <label><span>장르·용도 <b>*</b></span><input required value={adminForm.genre} onChange={(event) => setAdminForm({ ...adminForm, genre: event.target.value })} placeholder={adminForm.category === "보드게임" ? "예: 가족·전략" : "예: TRPG·다각면"} /></label>
                </div>
              </section>

              <section className="admin-form-section">
                <div className="admin-section-title"><span>02</span><div><h2>판매 정보</h2><p>판매가와 재고, 목록에 표시할 상태를 설정하세요.</p></div></div>
                <div className="admin-fields admin-fields-three">
                  <label><span>판매가 <b>*</b></span><div className="input-suffix"><input required min="0" type="number" value={adminForm.price} onChange={(event) => setAdminForm({ ...adminForm, price: event.target.value })} placeholder="42000" /><i>원</i></div></label>
                  <label><span>정상가</span><div className="input-suffix"><input min="0" type="number" value={adminForm.originalPrice} onChange={(event) => setAdminForm({ ...adminForm, originalPrice: event.target.value })} placeholder="48000" /><i>원</i></div></label>
                  <label><span>재고 수량 <b>*</b></span><div className="input-suffix"><input required min="0" type="number" value={adminForm.stock} onChange={(event) => setAdminForm({ ...adminForm, stock: event.target.value })} /><i>개</i></div></label>
                  <label><span>상품 표시</span><select value={adminForm.badge} onChange={(event) => setAdminForm({ ...adminForm, badge: event.target.value as typeof adminForm.badge })}><option value="">표시 없음</option><option value="NEW">NEW</option><option value="BEST">BEST</option><option value="재입고">재입고</option></select></label>
                  <label><span>입고일</span><input type="date" value={adminForm.received} onChange={(event) => setAdminForm({ ...adminForm, received: event.target.value })} /></label>
                </div>
              </section>

              <section className="admin-form-section">
                <div className="admin-section-title"><span>03</span><div><h2>상품 사양</h2><p>상품 카드에서 바로 비교할 핵심 정보를 입력하세요.</p></div></div>
                <div className="admin-fields admin-fields-three">
                  <label><span>{adminForm.category === "보드게임" ? "권장 인원" : "수량·규격"} <b>*</b></span><input required value={adminForm.players} onChange={(event) => setAdminForm({ ...adminForm, players: event.target.value })} /></label>
                  <label><span>{adminForm.category === "보드게임" ? "플레이 시간" : "구성·형태"} <b>*</b></span><input required value={adminForm.time} onChange={(event) => setAdminForm({ ...adminForm, time: event.target.value })} /></label>
                  <label><span>{adminForm.category === "보드게임" ? "난이도" : "재질·특징"} <b>*</b></span><input required value={adminForm.level} onChange={(event) => setAdminForm({ ...adminForm, level: event.target.value })} /></label>
                  {adminForm.category === "보드게임" && <><label><span>권장 연령</span><input value={adminForm.age} onChange={(event) => setAdminForm({ ...adminForm, age: event.target.value })} /></label><label><span>언어</span><select value={adminForm.language} onChange={(event) => setAdminForm({ ...adminForm, language: event.target.value })}><option>한글판</option><option>영문판</option><option>언어 독립</option></select></label></>}
                  {adminForm.category === "주사위" && <><label><span>주사위 종류</span><select value={adminForm.diceType} onChange={(event) => setAdminForm({ ...adminForm, diceType: event.target.value })}><option>다각면 세트</option><option>D6 세트</option></select></label><label><span>재질</span><select value={adminForm.material} onChange={(event) => setAdminForm({ ...adminForm, material: event.target.value })}><option>레진</option><option>메탈</option><option>원목</option></select></label></>}
                </div>
              </section>

              <section className="admin-form-section">
                <div className="admin-section-title"><span>04</span><div><h2>이미지와 설명</h2><p>정면이 잘 보이는 흰 배경 상품 이미지를 권장합니다.</p></div></div>
                <div className="admin-media-fields">
                  <label className={`admin-upload ${adminForm.image ? "has-image" : ""}`}><input key={adminForm.image ? "selected" : "empty"} required={!adminForm.image} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAdminImage} /><span>{adminForm.image ? "이미지 변경" : "이미지 선택"}</span><small>PNG·JPG·WEBP · 최대 1.5MB</small></label>
                  <label className="admin-description"><span>상품 설명 <b>*</b></span><textarea required rows={7} value={adminForm.description} onChange={(event) => setAdminForm({ ...adminForm, description: event.target.value })} placeholder="상품의 특징과 추천 이유를 구체적으로 작성해 주세요." /><small>{adminForm.description.length} / 500자</small></label>
                </div>
              </section>
              <div className="admin-form-actions"><button type="button" onClick={() => setAdminForm(emptyAdminForm)}>입력 초기화</button><button className="button-primary" type="submit">상품 등록하기</button></div>
            </form>

            <aside className="admin-aside">
              <section className="admin-preview">
                <div className="admin-preview-heading"><span>상품 카드 미리보기</span><small>입력 내용이 실시간으로 반영됩니다</small></div>
                {adminForm.image ? <ProductCard product={adminPreview} /> : <div className="admin-preview-empty"><span>＋</span><strong>상품 이미지를 선택해 주세요</strong><small>등록 전 상품 카드 모습을 확인할 수 있어요.</small></div>}
              </section>
              <section className="admin-recent">
                <div className="admin-preview-heading"><span>최근 등록 상품</span><small>{customProducts.length}개</small></div>
                {customProducts.length ? <div>{customProducts.slice(0, 5).map((product) => <article key={product.id}><CutoutImage src={product.image} /><span><strong>{product.name}</strong><small>{product.category} · {formatWon(product.price)}</small></span><button type="button" onClick={() => openProduct(product)}>보기</button><button className="admin-delete" type="button" onClick={() => removeCustomProduct(product.id)}>삭제</button></article>)}</div> : <p>아직 직접 등록한 상품이 없습니다.</p>}
              </section>
            </aside>
          </div>
        </section>
      )}

      {view === "detail" && (
        <section className="detail page-shell">
          <button className="back-link" onClick={() => navigate("shop")}>← 상품 목록</button>
          <div className="detail-layout">
            <div className="detail-gallery"><ProductArt product={selectedProduct} large cutout />{selectedProduct.badge && <span className={`detail-badge detail-badge-${selectedProduct.badge === "재입고" ? "restock" : selectedProduct.badge.toLowerCase()}`}>{selectedProduct.badge}</span>}</div>
            <div className="detail-info">
              <span className="eyebrow">{selectedProduct.category} · {selectedProduct.genre}</span>
              <h1>{selectedProduct.name}</h1>
              <div className="detail-rating"><span>★</span> {selectedProduct.rating} <button type="button" className="review-jump" onClick={() => scrollToDetail("review-summary")}>리뷰 {selectedProduct.reviews}개</button></div>
              <p className="detail-description">{selectedProduct.description}</p>
              {selectedProduct.paymentTest && <p className="payment-test-notice"><b>TEST</b><span>최종 결제 금액 1,000원 · 무료배송 · 실제 상품은 발송되지 않습니다.</span></p>}
              <div className="detail-price">{selectedProduct.originalPrice && <del>{formatWon(selectedProduct.originalPrice)}</del>}<strong>{formatWon(selectedProduct.price)}</strong>{selectedProduct.originalPrice && <b>{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%</b>}</div>
              <div className="detail-specs"><div><small>인원 / 규격</small><strong>{selectedProduct.players}</strong></div><div><small>시간 / 구성</small><strong>{selectedProduct.time}</strong></div><div><small>난이도 / 특징</small><strong>{selectedProduct.level}</strong></div></div>
              <div className="delivery-info"><span>배송</span><p><strong>3,000원</strong><small>50,000원 이상 무료 · 오늘 주문 시 내일 출발</small></p></div>
              <div className="quantity-line"><span>수량</span><div className="quantity-stepper"><button onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))} aria-label="수량 줄이기">−</button><b>{detailQuantity}</b><button onClick={() => setDetailQuantity(detailQuantity + 1)} aria-label="수량 늘리기">＋</button></div><strong>{formatWon(selectedProduct.price * detailQuantity)}</strong></div>
              <div className="detail-actions"><button className={`round-heart ${liked.includes(selectedProduct.id) ? "active" : ""}`} onClick={() => toggleLike(selectedProduct.id)} aria-label="찜하기">♥</button><button className="button-secondary" onClick={() => addToCart(selectedProduct, detailQuantity)}>장바구니 담기</button><button className="button-primary" onClick={() => buyNow(selectedProduct, detailQuantity)}>바로 구매</button></div>
            </div>
          </div>
          <div className="detail-tabs"><button className="active" onClick={() => scrollToDetail("product-story")}>상품 소개</button><button onClick={() => scrollToDetail("product-guide")}>게임 정보</button><button onClick={() => scrollToDetail("shipping-guide")}>배송·교환</button><button onClick={() => scrollToDetail("review-summary")}>리뷰 {selectedProduct.reviews}</button></div>
          <div className="detail-story" id="product-story"><span className="eyebrow">WHY WE PICKED IT</span><h2>{selectedDetail.title}</h2><p>{selectedDetail.intro}</p><ProductArt product={selectedProduct} large cutout /></div>
          <section className="detail-guide-grid" id="product-guide">
            <article><span className="eyebrow">HIGHLIGHTS</span><h2>이 상품의 매력</h2><ul>{selectedDetail.highlights.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul></article>
            <article><span className="eyebrow">HOW TO PLAY</span><h2>{selectedProduct.category === "보드게임" ? "이렇게 진행해요" : "이렇게 사용해요"}</h2><ol>{selectedDetail.guide.map((item, index) => <li key={item}><b>0{index + 1}</b><p>{item}</p></li>)}</ol></article>
            <aside><span className="eyebrow">GOOD FOR</span><h2>이런 분께 추천해요</h2><div className="recommend-tags">{selectedDetail.recommended.map((item) => <span key={item}>{item}</span>)}</div><div className="component-box"><small>구성품</small><p>{selectedDetail.contents}</p></div></aside>
          </section>
          <section className="detail-policy" id="shipping-guide"><div><span className="eyebrow">DELIVERY</span><h2>배송 안내</h2><p>평일 오후 2시 이전 결제 완료 주문은 당일 출고됩니다. 5만원 이상 구매 시 무료배송이며, 도서·산간 지역은 추가 배송비가 발생할 수 있습니다.</p></div><div><span className="eyebrow">EXCHANGE</span><h2>교환·반품</h2><p>상품 수령 후 7일 이내 신청할 수 있습니다. 상품 개봉 또는 구성품 훼손 시에는 교환·반품이 제한될 수 있으니 구성품을 먼저 확인해 주세요.</p></div></section>
          <section className="review-section" id="review-summary">
            <div className="review-summary">
              <div><span className="eyebrow">CUSTOMER REVIEW</span><h2>플레이어들의 평가</h2><p>구매 고객이 남긴 만족도와 후기입니다.</p></div>
              <strong>{selectedProduct.rating}<small>/ 5.0</small></strong>
              <div className="review-score"><span><i style={{ width: `${selectedProduct.rating * 20}%` }} /></span><b>★★★★★</b><small>{selectedProduct.reviews}개의 구매 후기</small></div>
              <div className="rating-distribution" aria-label="별점 분포">
                {[82, 13, 4, 1, 0].map((percent, index) => <div key={5 - index}><small>{5 - index}점</small><span><i style={{ width: `${percent}%` }} /></span><b>{percent}%</b></div>)}
              </div>
            </div>
            <div className="review-toolbar"><h3>구매 후기 <b>{selectedProduct.reviews}</b></h3><span>구매가 확인된 후기입니다</span></div>
            <div className="review-list">
              {customerReviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <div className="review-author"><strong>{review.author}</strong><span className="verified-badge">구매 인증</span><time>{review.date}</time></div>
                  <div className="review-content"><div className="review-stars" aria-label={`${review.rating}점`}>{"★".repeat(review.rating)}<span>{"★".repeat(5 - review.rating)}</span></div><h4>{review.title}</h4><p>{review.body}</p><small>{selectedProduct.name} 구매</small></div>
                </article>
              ))}
            </div>
          </section>
          <div className="related-section"><SectionHeader eyebrow="YOU MAY ALSO LIKE" title="함께 보면 좋은 상품" description="이 상품과 잘 어울리는 보드픽의 추천입니다." /><div className="product-grid">{catalogProducts.filter((p) => p.id !== selectedProduct.id).slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div></div>
        </section>
      )}

      {supportView && supportBoard && (
        <section className="support-page page-shell">
          <header className="support-heading">
            <span className="eyebrow">{supportBoard.eyebrow}</span>
            <h1>{supportBoard.title}</h1>
            <p>{supportBoard.description}</p>
          </header>
          <nav className="support-tabs" aria-label="고객 안내 게시판">
            {(["delivery", "returns", "faq"] as SupportView[]).map((item) => <button key={item} className={supportView === item ? "active" : ""} aria-current={supportView === item ? "page" : undefined} onClick={() => openSupport(item)}>{supportBoards[item].title}</button>)}
          </nav>
          <div className="support-toolbar">
            <strong>전체 <b>{supportBoard.posts.length}</b>건</strong>
            <label><span className="sr-only">게시글 검색</span><input value={supportSearch} onChange={(event) => setSupportSearch(event.target.value)} placeholder="제목을 검색해보세요" /><EmptyIcon type="search" /></label>
          </div>
          <div className="support-board">
            <div className="support-board-head"><span>번호</span><span>제목</span><span>등록일</span><span>조회</span></div>
            {visibleSupportPosts.map((post) => (
              <article className={`support-post ${selectedSupportPost === post.id ? "open" : ""}`} key={post.id}>
                <button className="support-post-row" onClick={() => setSelectedSupportPost(selectedSupportPost === post.id ? null : post.id)} aria-expanded={selectedSupportPost === post.id}>
                  <span>{String(post.id).padStart(2, "0")}</span><strong>{post.title}</strong><time>{post.date}</time><small>{post.views}</small>
                </button>
                {selectedSupportPost === post.id && <div className="support-post-content"><span>안내</span><p>{post.content}</p></div>}
              </article>
            ))}
            {!visibleSupportPosts.length && <div className="support-empty"><strong>검색 결과가 없습니다.</strong><button onClick={() => setSupportSearch("")}>전체 글 보기</button></div>}
          </div>
          <div className="support-pagination"><button aria-current="page">1</button></div>
        </section>
      )}

      {view === "cart" && (
        <section className="cart-page page-shell">
          <div className="flow-heading"><span className="active">01 장바구니</span><span>02 주문·결제</span><span>03 주문 완료</span></div>
          <h1>장바구니 <small>{cartCount}</small></h1>
          {cart.length ? <div className="cart-layout"><div className="cart-list">
            <div className="cart-select-all"><label><input type="checkbox" checked={cart.every((item) => item.selected)} onChange={(e) => setCart(cart.map((item) => ({ ...item, selected: e.target.checked })))} /> 전체 선택</label><button onClick={() => setCart(cart.filter((item) => !item.selected))}>선택 삭제</button></div>
            {cart.map((item) => <article className="cart-item" key={item.product.id}><input aria-label={`${item.product.name} 선택`} type="checkbox" checked={item.selected} onChange={() => setCart(cart.map((entry) => entry.product.id === item.product.id ? { ...entry, selected: !entry.selected } : entry))} /><button className="cart-art" onClick={() => openProduct(item.product)}><ProductArt product={item.product} cutout /></button><div className="cart-item-info"><small>{item.product.genre}</small><button onClick={() => openProduct(item.product)}>{item.product.name}</button><span>{item.product.players} · {item.product.time}</span><div className="quantity-stepper"><button onClick={() => updateQuantity(item.product.id, -1)}>−</button><b>{item.quantity}</b><button onClick={() => updateQuantity(item.product.id, 1)}>＋</button></div></div><strong>{formatWon(item.product.price * item.quantity)}</strong><button className="remove-item" onClick={() => setCart(cart.filter((entry) => entry.product.id !== item.product.id))} aria-label={`${item.product.name} 삭제`}>×</button></article>)}
          </div><aside className="order-summary"><h2>결제 예정 금액</h2><dl><div><dt>상품 금액</dt><dd>{formatWon(subtotal)}</dd></div><div><dt>배송비</dt><dd>{shipping ? formatWon(shipping) : "무료"}</dd></div></dl>{subtotal < 50000 && !paymentTestOnly && <p>{formatWon(50000 - subtotal)} 더 담으면 무료배송</p>}{paymentTestOnly && <p>결제 테스트 상품은 무료배송입니다.</p>}<div className="summary-total"><span>총 결제 금액</span><strong>{formatWon(total)}</strong></div><button className="button-primary" disabled={!selectedCart.length} onClick={() => navigate("checkout")}>선택 상품 주문하기</button><button className="continue-button" onClick={() => navigate("shop")}>계속 쇼핑하기</button></aside></div> : <div className="empty-state cart-empty"><span>▢</span><h2>장바구니가 비어 있어요</h2><p>오늘의 즐거움을 채워줄 게임을 골라보세요.</p><button className="button-primary" onClick={() => navigate("shop")}>상품 둘러보기</button></div>}
        </section>
      )}

      {view === "checkout" && (
        <section className="checkout-page page-shell">
          <div className="flow-heading"><span>01 장바구니</span><span className="active">02 주문·결제</span><span>03 주문 완료</span></div>
          <h1>주문·결제</h1>
          <form onSubmit={placeOrder} className="checkout-layout">
            <div className="checkout-form">
              <section className="form-section"><h2>주문 상품 <small>{selectedCart.length}건</small></h2>{selectedCart.map((item) => <div className="checkout-product" key={item.product.id}><ProductArt product={item.product} cutout /><span><strong>{item.product.name}</strong><small>{item.product.players} · 수량 {item.quantity}개</small></span><b>{formatWon(item.product.price * item.quantity)}</b></div>)}</section>
              <section className="form-section"><h2>주문자 정보</h2><div className="form-grid"><label>이름 <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름을 입력해주세요" /></label><label>휴대전화 <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" inputMode="tel" /></label><label className="full">이메일 <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="boardpick@example.com" /></label></div></section>
              <section className="form-section"><div className="form-section-title"><h2>배송지 정보</h2><button type="button" onClick={() => setForm({ ...form, receiver: form.name, receiverPhone: form.phone })}>주문자 정보와 동일</button></div><div className="form-grid"><label>받는 분 <input required value={form.receiver} onChange={(e) => setForm({ ...form, receiver: e.target.value })} placeholder="받는 분 이름" /></label><label>휴대전화 <input required value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} placeholder="010-0000-0000" /></label><label className="postcode full">우편번호 <span><input required readOnly value={form.postcode} placeholder="우편번호" /><button type="button" onClick={() => setPostcodeOpen(true)}>다음 주소 찾기</button></span><small>다음 우편번호 서비스에서 배송지를 검색합니다.</small></label><label className="full">기본 주소 <input required readOnly value={form.address} placeholder="주소 검색 후 자동 입력됩니다" /></label><label className="full">상세 주소 <input id="checkout-detail-address" required value={form.detailAddress} onChange={(e) => setForm({ ...form, detailAddress: e.target.value })} placeholder="동·호수 등 상세 주소를 입력해주세요" /></label><label className="full">배송 요청사항 <select value={form.request} onChange={(e) => setForm({ ...form, request: e.target.value })}><option value="">배송 요청사항을 선택해주세요</option><option>문 앞에 놓아주세요</option><option>경비실에 맡겨주세요</option><option>배송 전 연락해주세요</option></select></label></div></section>
              <section className="form-section"><h2>결제 수단</h2><div className="payment-options">{["네이버페이", "카드", "무통장입금"].map((item) => <button type="button" key={item} className={`${payment === item ? "active" : ""} ${item === "네이버페이" ? "naver-pay-option" : ""}`} onClick={() => { setPayment(item); setPaymentError(""); }}><span>{payment === item ? "✓" : ""}</span>{item === "네이버페이" ? <><b>N</b>pay <small>TEST</small></> : item}</button>)}</div>{payment === "네이버페이" && <p className={`naver-pay-status ${naverPayConfig.configured ? "ready" : "pending"}`}><strong>{naverPayConfig.configured ? "테스트 결제 준비 완료" : "테스트 인증값 설정 필요"}</strong><span>네이버페이 개발환경에서는 실제 결제 금액이 청구되지 않습니다.</span></p>}{paymentError && <p className="payment-error" role="alert">{paymentError}</p>}<p className="demo-note">카드·무통장입금은 화면 흐름 확인용 데모이며, 네이버페이만 공식 개발환경 결제창을 사용합니다.</p></section>
              <section className="form-section terms-section"><label><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span><strong>필수 약관 전체 동의</strong><small>구매 조건 및 개인정보 수집·이용에 동의합니다.</small></span></label></section>
            </div>
            <aside className="order-summary checkout-summary"><h2>최종 결제 금액</h2><dl><div><dt>상품 금액</dt><dd>{formatWon(subtotal)}</dd></div><div><dt>상품 할인</dt><dd>− 0원</dd></div><div><dt>배송비</dt><dd>{shipping ? formatWon(shipping) : "무료"}</dd></div></dl><div className="summary-total"><span>총 결제 금액</span><strong>{formatWon(total)}</strong></div><button className={`button-primary ${payment === "네이버페이" ? "naver-pay-submit" : ""}`} type="submit" disabled={!checkoutValid || processing}>{processing ? "결제 처리 중…" : payment === "네이버페이" ? `Npay ${formatWon(total)} 테스트 결제` : `${formatWon(total)} 결제하기`}</button><small className="summary-caption">주문 내용을 확인했으며 결제에 동의합니다.</small></aside>
          </form>
        </section>
      )}

      {view === "complete" && (
        <section className="complete-page page-shell">
          <div className="flow-heading"><span>01 장바구니</span><span>02 주문·결제</span><span className="active">03 주문 완료</span></div>
          <div className="complete-card"><div className="complete-check">✓</div><span className="eyebrow">ORDER COMPLETE</span><h1>주문이 완료되었어요</h1><p>보드픽을 이용해 주셔서 감사합니다.<br />안전하게 포장해 빠르게 보내드릴게요.</p><div className="order-number"><span>주문번호</span><strong>{orderNumber}</strong></div><div className="complete-info"><div><small>결제 수단</small><strong>{payment} · {payment === "네이버페이" ? "테스트 승인" : "데모 결제"}</strong></div><div><small>받는 분</small><strong>{form.receiver}</strong></div><div><small>배송지</small><strong>{form.address} {form.detailAddress}</strong></div></div><button className="button-primary" onClick={() => navigate("home")}>쇼핑 계속하기</button></div>
        </section>
      )}

      <nav className="mobile-bottom-nav" aria-label="모바일 주요 메뉴">
        <button className={view === "home" ? "active" : ""} aria-current={view === "home" ? "page" : undefined} onClick={() => navigateFromTop("home")}><span className="mobile-nav-icon mobile-nav-home" aria-hidden="true" /><small>홈</small></button>
        <button className={(view === "new" || view === "featured" || (view === "shop" && !isDiceCategory && category !== "액세서리") || (view === "detail" && selectedProduct.category === "보드게임")) ? "active" : ""} onClick={() => { setSearch(""); setCategory("보드게임"); setPlayerFilter("전체"); setTimeFilter("전체"); setLevelFilter("전체"); navigateFromTop("shop"); }}><span className="mobile-nav-icon mobile-nav-board" aria-hidden="true" /><small>보드게임</small></button>
        <button className={((view === "shop" && isDiceCategory) || (view === "detail" && selectedProduct.category === "주사위")) ? "active" : ""} onClick={() => { setSearch(""); setCategory("주사위"); setDiceMaterial("전체"); navigateFromTop("shop"); }}><span className="mobile-nav-icon mobile-nav-dice" aria-hidden="true">20</span><small>주사위</small></button>
        <button onClick={() => showToast(liked.length ? `찜한 상품이 ${liked.length}개 있어요.` : "아직 찜한 상품이 없어요.")}><FavoriteIcon className="mobile-nav-icon" /><small>찜</small>{liked.length > 0 && <b className="mobile-nav-count">{liked.length}</b>}</button>
        <button className={(view === "cart" || view === "checkout" || view === "complete") ? "active" : ""} aria-current={view === "cart" ? "page" : undefined} onClick={() => navigateFromTop("cart")}><EmptyIcon type="bag" /><small>장바구니</small>{cartCount > 0 && <b className="mobile-nav-count">{cartCount}</b>}</button>
      </nav>

      <aside className={`ai-chat ${chatOpen ? "open" : ""}`} aria-label="보드픽 AI 상담">
        {chatOpen && (
          <section className="ai-chat-panel" id="ai-chat-panel" role="dialog" aria-modal="false" aria-labelledby="ai-chat-title">
            <header>
              <div><span className="ai-chat-mark" aria-hidden="true">AI</span><span><strong id="ai-chat-title">보드픽 AI 도우미</strong><small>게임 선택부터 배송까지 물어보세요</small></span></div>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="AI 상담 닫기">×</button>
            </header>
            <div className="ai-chat-messages" aria-live="polite">
              {chatMessages.map((message, index) => <div className={`ai-chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AI" : "나"}</span><p>{message.content}</p></div>)}
              {chatLoading && <div className="ai-chat-message assistant"><span>AI</span><p className="ai-chat-typing"><i /><i /><i /><b className="sr-only">답변 작성 중</b></p></div>}
              {chatError && <div className="ai-chat-error" role="alert"><span>{chatError}</span><button type="button" onClick={() => sendChatMessage(undefined, chatMessages.filter((message) => message.role === "user").at(-1)?.content)}>다시 시도</button></div>}
              <div ref={chatEndRef} />
            </div>
            {chatMessages.length === 1 && <div className="ai-chat-suggestions">{["2명이 30분 안에 할 게임", "가족 게임 추천", "배송은 얼마나 걸려요?"].map((question) => <button type="button" key={question} onClick={() => sendChatMessage(undefined, question)}>{question}</button>)}</div>}
            <form className="ai-chat-form" onSubmit={(event) => sendChatMessage(event)}>
              <label className="sr-only" htmlFor="ai-chat-input">AI 도우미에게 질문</label>
              <textarea id="ai-chat-input" rows={1} maxLength={700} value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendChatMessage(); } }} placeholder="어떤 게임을 찾으세요?" />
              <button type="submit" disabled={!chatInput.trim() || chatLoading} aria-label="질문 보내기">↑</button>
            </form>
            <small className="ai-chat-disclaimer">AI 답변은 참고용이며 가격·재고는 상품 페이지를 확인해 주세요.</small>
          </section>
        )}
        <button className="ai-chat-launcher" type="button" onClick={() => setChatOpen((open) => !open)} aria-expanded={chatOpen} aria-controls="ai-chat-panel">
          <span aria-hidden="true">{chatOpen ? "×" : "AI"}</span><b>{chatOpen ? "상담 닫기" : "AI 게임 추천"}</b>
        </button>
      </aside>

      <footer className="footer">
        <div className="page-shell footer-grid"><div><button className="brand footer-brand" onClick={() => navigate("home")} aria-label="보드픽 홈"><img className="brand-logo" src={siteAsset("/brand/boardpick-logo.png")} alt="보드픽 BOARD PICK" /></button><p>오늘의 즐거움을 고르는 가장 쉬운 방법.<br />좋은 게임과 필요한 도구를 한곳에서 만나보세요.</p></div><div><strong>쇼핑</strong><button onClick={() => navigate("new")}>신상품</button><button onClick={() => navigate("featured")}>보드픽 추천</button><button onClick={() => navigate("shop")}>전체 상품</button></div><div><strong>고객 안내</strong><button onClick={() => openSupport("delivery")}>배송 안내</button><button onClick={() => openSupport("returns")}>교환·반품</button><button onClick={() => openSupport("faq")}>자주 묻는 질문</button></div><div><strong>고객센터</strong><b>02-1234-5678</b><small>평일 10:00–17:00<br />점심 12:00–13:00</small></div></div><div className="page-shell footer-bottom"><span>© 2026 BOARDPICK. All rights reserved.</span><span>이용약관 · 개인정보처리방침</span><button className="admin-access-link" onClick={openAdminAccess}>{adminAuthenticated ? "관리자 공간" : "관리자 로그인"}</button></div>
      </footer>
      {customerLoginOpen && (
        <div className="admin-login-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCustomerLoginOpen(false); }}>
          <section className="admin-login-dialog customer-login-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-login-title">
            <button className="admin-login-close" type="button" onClick={() => setCustomerLoginOpen(false)} aria-label="로그인 닫기">×</button>
            <span className="eyebrow">BOARDPICK MEMBER</span>
            <h2 id="customer-login-title">로그인</h2>
            <p>보드픽 회원으로 로그인하고 찜한 상품과 주문 내역을 확인하세요.</p>
            <form onSubmit={(event) => { event.preventDefault(); setCustomerLoggedIn(true); setCustomerLoginOpen(false); showToast("로그인되었습니다."); }}>
              <label><span>이메일</span><input autoFocus required type="email" value={customerCredentials.email} onChange={(event) => setCustomerCredentials({ ...customerCredentials, email: event.target.value })} autoComplete="email" placeholder="이메일을 입력해 주세요" /></label>
              <label><span>비밀번호</span><input required type="password" value={customerCredentials.password} onChange={(event) => setCustomerCredentials({ ...customerCredentials, password: event.target.value })} autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" /></label>
              <button className="button-primary" type="submit">로그인</button>
            </form>
            <small>현재는 화면 확인용 데모 로그인입니다.</small>
          </section>
        </div>
      )}
      {adminLoginOpen && (
        <div className="admin-login-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setAdminLoginOpen(false); }}>
          <section className="admin-login-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
            <button className="admin-login-close" type="button" onClick={() => setAdminLoginOpen(false)} aria-label="관리자 로그인 닫기">×</button>
            <span className="eyebrow">BOARDPICK ADMIN</span>
            <h2 id="admin-login-title">관리자 로그인</h2>
            <p>상품과 재고를 관리하는 운영자 전용 공간입니다.</p>
            <form onSubmit={loginAdmin}>
              <label><span>관리자 아이디</span><input autoFocus required value={adminCredentials.id} onChange={(event) => setAdminCredentials({ ...adminCredentials, id: event.target.value })} autoComplete="username" placeholder="아이디를 입력해 주세요" /></label>
              <label><span>비밀번호</span><input required type="password" value={adminCredentials.password} onChange={(event) => setAdminCredentials({ ...adminCredentials, password: event.target.value })} autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" /></label>
              {adminLoginError && <p className="admin-login-error" role="alert">{adminLoginError}</p>}
              <button className="button-primary" type="submit">관리자 공간으로 이동</button>
            </form>
            <small>로컬 데모 계정이 입력되어 있습니다. 버튼을 누르면 바로 이동합니다.</small>
          </section>
        </div>
      )}
      {postcodeOpen && (
        <div className="postcode-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setPostcodeOpen(false); }}>
          <section className="postcode-modal" role="dialog" aria-modal="true" aria-labelledby="postcode-modal-title">
            <header><div><span className="eyebrow">DELIVERY ADDRESS</span><h2 id="postcode-modal-title">배송지 주소 찾기</h2></div><button type="button" onClick={() => setPostcodeOpen(false)} aria-label="주소 검색 닫기">×</button></header>
            <div className="postcode-embed" id="daum-postcode-embed" />
            {postcodeStatus === "loading" && <div className="postcode-feedback" role="status">다음 우편번호 서비스를 불러오는 중입니다.</div>}
            {postcodeStatus === "error" && <div className="postcode-feedback postcode-error" role="alert"><strong>주소 검색을 불러오지 못했습니다.</strong><span>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</span><button type="button" onClick={() => { setPostcodeOpen(false); window.setTimeout(() => setPostcodeOpen(true), 0); }}>다시 시도</button></div>}
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
