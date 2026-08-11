"use client";

import { FormEvent, useMemo, useState } from "react";

type View = "home" | "shop" | "new" | "featured" | "detail" | "cart" | "checkout" | "complete";

type Product = {
  id: number;
  name: string;
  label: string;
  category: "보드게임" | "액세서리";
  genre: string;
  price: number;
  originalPrice?: number;
  players: string;
  time: string;
  level: string;
  received: string;
  badge?: "NEW" | "재입고" | "BEST";
  featured?: boolean;
  featureCopy?: string;
  art: [string, string, string];
  rating: number;
  reviews: number;
  description: string;
};

type CartItem = { product: Product; quantity: number; selected: boolean };

const products: Product[] = [
  {
    id: 1,
    name: "달빛 정원",
    label: "MOON GARDEN",
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
    category: "액세서리",
    genre: "주사위·트레이",
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
    category: "액세서리",
    genre: "주사위",
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
];

const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

function ProductArt({ product, large = false }: { product: Product; large?: boolean }) {
  const style = {
    "--art-one": product.art[0],
    "--art-two": product.art[1],
    "--art-three": product.art[2],
  } as React.CSSProperties;

  return (
    <div className={`product-art ${large ? "product-art-large" : ""}`} style={style} aria-label={`${product.name} 패키지 이미지`}>
      <div className="art-sun" />
      <div className="art-grid" />
      <div className="art-piece piece-one" />
      <div className="art-piece piece-two" />
      <div className="art-piece piece-three" />
      <span className="art-label">BOARDPICK ORIGINAL</span>
      <strong>{product.label}</strong>
      <small>{product.genre.toUpperCase()}</small>
    </div>
  );
}

function EmptyIcon({ type }: { type: "heart" | "bag" | "search" }) {
  return <span aria-hidden="true">{type === "heart" ? "♡" : type === "bag" ? "▢" : "⌕"}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product>(products[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState("추천순");
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", receiver: "", receiverPhone: "", postcode: "", address: "", detailAddress: "", request: "" });
  const [payment, setPayment] = useState("카드");
  const [terms, setTerms] = useState(false);
  const [processing, setProcessing] = useState(false);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCart = cart.filter((item) => item.selected);
  const subtotal = selectedCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shipping;

  const visibleProducts = useMemo(() => {
    let list = products.filter((p) => {
      const text = `${p.name} ${p.genre} ${p.category}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesCategory = category === "전체" || p.category === category || p.genre.includes(category);
      const matchesView = view === "new" ? p.badge === "NEW" || p.badge === "재입고" : view === "featured" ? p.featured : true;
      return matchesSearch && matchesCategory && matchesView;
    });
    if (sort === "낮은 가격순") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "높은 가격순") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "평점순") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [search, category, sort, view]);

  const navigate = (next: View) => {
    setView(next);
    setMenuOpen(false);
    setBoardMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setDetailQuantity(1);
    navigate("detail");
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
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
    setCategory("전체");
    navigate("shop");
  };

  const checkoutValid = Boolean(
    form.name && form.phone && form.email && form.receiver && form.receiverPhone && form.postcode && form.address && form.detailAddress && terms && selectedCart.length
  );

  const placeOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!checkoutValid) return;
    setProcessing(true);
    window.setTimeout(() => {
      setOrderNumber(`BP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
      setProcessing(false);
      setCart([]);
      navigate("complete");
    }, 900);
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <article className="product-card">
      <button className="product-image-button" onClick={() => openProduct(product)} aria-label={`${product.name} 상세 보기`}>
        <ProductArt product={product} />
        {product.badge && <span className={`badge badge-${product.badge === "재입고" ? "restock" : product.badge.toLowerCase()}`}>{product.badge}</span>}
      </button>
      <div className="product-card-body">
        <div className="product-card-topline">
          <span>{product.genre}</span>
          <button className={`heart-button ${liked.includes(product.id) ? "active" : ""}`} onClick={() => toggleLike(product.id)} aria-label={liked.includes(product.id) ? `${product.name} 찜 해제` : `${product.name} 찜하기`}>
            {liked.includes(product.id) ? "♥" : "♡"}
          </button>
        </div>
        <button className="product-title" onClick={() => openProduct(product)}>{product.name}</button>
        <p className="product-meta">{product.players} · {product.time} · {product.level}</p>
        <div className="price-row">
          <strong>{formatWon(product.price)}</strong>
          {product.originalPrice && <del>{formatWon(product.originalPrice)}</del>}
        </div>
        <div className="rating-row"><span aria-hidden="true">★</span> {product.rating} <small>({product.reviews})</small></div>
      </div>
    </article>
  );

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

  return (
    <main>
      <div className="benefit-bar"><span>오늘 주문하면 내일 출발</span><span>5만원 이상 무료배송</span></div>
      <header className="site-header">
        <div className="header-main page-shell">
          <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴 열기" aria-expanded={menuOpen}>☰</button>
          <button className="brand" onClick={() => navigate("home")} aria-label="보드픽 홈">
            <span className="brand-mark"><i /><i /><i /><i /></span>
            <span>보드픽<small>BOARDPICK</small></span>
          </button>
          <form className="search-box" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="site-search">상품 검색</label>
            <input id="site-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="어떤 게임을 찾으세요?" />
            <button type="submit" aria-label="검색">⌕</button>
          </form>
          <div className="header-actions">
            <button onClick={() => { setSearch(""); setCategory("전체"); navigate("shop"); }}><EmptyIcon type="search" /><small>검색</small></button>
            <button onClick={() => showToast(liked.length ? `찜한 상품이 ${liked.length}개 있어요.` : "아직 찜한 상품이 없어요.")}><EmptyIcon type="heart" /><small>찜 {liked.length || ""}</small></button>
            <button className="cart-action" onClick={() => navigate("cart")}><EmptyIcon type="bag" /><small>장바구니</small>{cartCount > 0 && <b>{cartCount}</b>}</button>
          </div>
        </div>
        <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="주요 메뉴">
          <div className="primary-nav page-shell">
            <button className={`board-menu-trigger ${boardMenuOpen ? "active" : ""}`} onClick={() => setBoardMenuOpen(!boardMenuOpen)} aria-expanded={boardMenuOpen} aria-controls="board-game-submenu">보드게임 <span aria-hidden="true">⌄</span></button>
            <button onClick={() => { setSearch(""); setCategory("주사위"); navigate("shop"); }}>주사위</button>
            <button onClick={() => { setSearch(""); setCategory("액세서리"); navigate("shop"); }}>액세서리</button>
          </div>
          {boardMenuOpen && (
            <div className="board-subnav" id="board-game-submenu">
              <div className="page-shell">
                <span className="subnav-label">보드게임 둘러보기</span>
                <button onClick={() => { setSearch(""); setCategory("보드게임"); navigate("new"); }}>신상품 <span aria-hidden="true">→</span></button>
                <button onClick={() => { setSearch(""); setCategory("가족"); navigate("shop"); }}>테마 추천 <span aria-hidden="true">→</span></button>
                <button onClick={() => { setSearch(""); setCategory("보드게임"); navigate("featured"); }}>보드픽 추천 <span aria-hidden="true">→</span></button>
                <button onClick={() => { setSearch(""); setSort("평점순"); setCategory("보드게임"); navigate("shop"); }}>베스트 <span aria-hidden="true">→</span></button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {view === "home" && (
        <>
          <section className="hero page-shell">
            <div className="hero-copy">
              <span className="eyebrow">PLAY YOUR MOMENT</span>
              <h1>테이블 위에 펼쳐지는<br />새로운 즐거움</h1>
              <p>인원, 시간, 취향에 딱 맞는 게임을<br />보드픽이 쉽게 골라드릴게요.</p>
              <div className="hero-buttons">
                <button className="button-primary" onClick={() => navigate("shop")}>보드게임 둘러보기</button>
                <button className="button-secondary" onClick={() => navigate("featured")}>이번 주 추천</button>
              </div>
              <div className="hero-note"><span>평균 평점 4.8</span><span>엄선한 120+ 게임</span></div>
            </div>
            <div className="hero-stage" aria-label="보드픽 추천 보드게임 컬렉션">
              <div className="hero-art art-back"><ProductArt product={products[2]} /></div>
              <div className="hero-art art-middle"><ProductArt product={products[1]} /></div>
              <div className="hero-art art-front"><ProductArt product={products[0]} /></div>
              <span className="floating-piece fp-one">●</span>
              <span className="floating-piece fp-two">◆</span>
              <span className="floating-piece fp-three">▲</span>
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
                <ProductArt product={products[0]} large />
                <span className="featured-number">01</span>
              </button>
              <div className="featured-copy">
                <span className="mini-label">가족이 함께 시작하기 좋은 전략 게임</span>
                <h3>{products[0].name}</h3>
                <p>{products[0].description}</p>
                <div className="info-pills"><span>{products[0].players}</span><span>{products[0].time}</span><span>난이도 {products[0].level}</span></div>
                <div className="featured-price"><strong>{formatWon(products[0].price)}</strong><del>{formatWon(products[0].originalPrice || 0)}</del></div>
                <div className="featured-actions"><button className="button-primary" onClick={() => openProduct(products[0])}>상품 자세히 보기</button><button className="round-heart" onClick={() => toggleLike(products[0].id)} aria-label="달빛 정원 찜하기">{liked.includes(1) ? "♥" : "♡"}</button></div>
              </div>
            </div>
          </section>

          <section className="content-section page-shell">
            <SectionHeader eyebrow="JUST ARRIVED" title="새로 들어왔어요" description="가장 최근에 입고된 게임과 플레이 용품을 만나보세요." target="new" />
            <div className="product-grid product-grid-scroll">{products.filter((p) => p.badge === "NEW" || p.badge === "재입고").slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>

          <section className="content-section page-shell">
            <SectionHeader eyebrow="MOST LOVED" title="지금 많이 찾는 게임" description="보드픽 고객이 직접 고른 만족도 높은 인기 게임이에요." target="shop" />
            <div className="product-grid">{[products[6], products[7], products[4], products[3]].map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>

          <section className="guide-banner page-shell">
            <div><span className="eyebrow">FIRST GAME GUIDE</span><h2>어떤 게임부터<br />시작할지 고민이라면</h2><p>함께할 사람과 시간을 고르면 어렵지 않아요.</p><button onClick={() => { setCategory("가족"); navigate("shop"); }}>입문 게임 골라보기 <span aria-hidden="true">→</span></button></div>
            <div className="guide-cards"><span>2인</span><span>30분</span><span>쉬움</span><span>함께</span></div>
          </section>

          <section className="content-section page-shell">
            <SectionHeader eyebrow="PLAY BETTER" title="게임을 더 편하게" description="보관부터 플레이까지, 꼭 필요한 액세서리만 모았어요." target="shop" />
            <div className="product-grid product-grid-three">{products.filter((p) => p.category === "액세서리").slice(0, 3).map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>

          <section className="service-strip page-shell">
            <div><b>♧</b><span><strong>안전 포장</strong><small>상품에 맞춘 꼼꼼한 포장</small></span></div>
            <div><b>↗</b><span><strong>빠른 배송</strong><small>평일 오후 2시 이전 당일 출고</small></span></div>
            <div><b>◎</b><span><strong>상품 상담</strong><small>게임 선택이 어려울 때 도와드려요</small></span></div>
            <div><b>↺</b><span><strong>교환·반품</strong><small>수령 후 7일 이내 간편 접수</small></span></div>
          </section>
        </>
      )}

      {(view === "shop" || view === "new" || view === "featured") && (
        <section className="collection page-shell">
          <div className="collection-heading">
            <span className="eyebrow">{view === "new" ? "JUST ARRIVED" : view === "featured" ? "EDITOR'S PICK" : "ALL PRODUCTS"}</span>
            <h1>{view === "new" ? "새로 들어온 보드게임" : view === "featured" ? "보드픽이 추천해요" : category === "주사위" ? "플레이를 완성하는 주사위" : "취향에 맞는 게임 찾기"}</h1>
            <p>{view === "new" ? "실제 입고일이 가장 최근인 상품부터 보여드려요." : view === "featured" ? "직접 플레이하고 자신 있게 추천하는 이번 시즌의 선택입니다." : category === "주사위" ? "클래식 주사위부터 다각면 세트와 트레이까지 한곳에서 만나보세요." : "인원, 시간, 난이도를 기준으로 편하게 골라보세요."}</p>
          </div>
          {view === "featured" && (
            <div className="collection-featured">
              <ProductArt product={products[1]} large />
              <div><span>모임의 첫 게임</span><h2>{products[1].name}</h2><p>{products[1].featureCopy}. 규칙 설명은 5분이면 충분하고, 매번 다른 이야기가 펼쳐져요.</p><button className="button-primary" onClick={() => openProduct(products[1])}>추천 상품 보기</button></div>
            </div>
          )}
          <div className="filter-bar">
            <div className="filter-chips">
              {["전체", "보드게임", "주사위", "액세서리", "가족", "전략", "파티", "2인"].map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label>정렬 <select value={sort} onChange={(e) => setSort(e.target.value)}><option>추천순</option><option>평점순</option><option>낮은 가격순</option><option>높은 가격순</option></select></label>
          </div>
          {search && <div className="search-result-copy">‘{search}’ 검색 결과 <strong>{visibleProducts.length}</strong>개 <button onClick={() => setSearch("")}>검색어 지우기</button></div>}
          {visibleProducts.length ? <div className="product-grid collection-grid">{visibleProducts.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty-state"><span>⌕</span><h2>조건에 맞는 상품이 없어요</h2><p>검색어나 필터를 바꿔 다시 찾아보세요.</p><button className="button-primary" onClick={() => { setSearch(""); setCategory("전체"); }}>전체 상품 보기</button></div>}
        </section>
      )}

      {view === "detail" && (
        <section className="detail page-shell">
          <button className="back-link" onClick={() => navigate("shop")}>← 상품 목록</button>
          <div className="detail-layout">
            <div className="detail-gallery"><ProductArt product={selectedProduct} large />{selectedProduct.badge && <span className="detail-badge">{selectedProduct.badge}</span>}</div>
            <div className="detail-info">
              <span className="eyebrow">{selectedProduct.category} · {selectedProduct.genre}</span>
              <h1>{selectedProduct.name}</h1>
              <div className="detail-rating"><span>★</span> {selectedProduct.rating} <u>리뷰 {selectedProduct.reviews}개</u></div>
              <p className="detail-description">{selectedProduct.description}</p>
              <div className="detail-price">{selectedProduct.originalPrice && <del>{formatWon(selectedProduct.originalPrice)}</del>}<strong>{formatWon(selectedProduct.price)}</strong>{selectedProduct.originalPrice && <b>{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%</b>}</div>
              <div className="detail-specs"><div><small>인원 / 규격</small><strong>{selectedProduct.players}</strong></div><div><small>시간 / 구성</small><strong>{selectedProduct.time}</strong></div><div><small>난이도 / 특징</small><strong>{selectedProduct.level}</strong></div></div>
              <div className="delivery-info"><span>배송</span><p><strong>3,000원</strong><small>50,000원 이상 무료 · 오늘 주문 시 내일 출발</small></p></div>
              <div className="quantity-line"><span>수량</span><div className="quantity-stepper"><button onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))} aria-label="수량 줄이기">−</button><b>{detailQuantity}</b><button onClick={() => setDetailQuantity(detailQuantity + 1)} aria-label="수량 늘리기">＋</button></div><strong>{formatWon(selectedProduct.price * detailQuantity)}</strong></div>
              <div className="detail-actions"><button className="round-heart" onClick={() => toggleLike(selectedProduct.id)} aria-label="찜하기">{liked.includes(selectedProduct.id) ? "♥" : "♡"}</button><button className="button-secondary" onClick={() => addToCart(selectedProduct, detailQuantity)}>장바구니 담기</button><button className="button-primary" onClick={() => buyNow(selectedProduct, detailQuantity)}>바로 구매</button></div>
            </div>
          </div>
          <div className="detail-tabs"><button className="active">상품 소개</button><button>게임 정보</button><button>배송·교환</button><button>리뷰 {selectedProduct.reviews}</button></div>
          <div className="detail-story"><span className="eyebrow">WHY WE PICKED IT</span><h2>선택은 쉽고,<br />플레이는 오래 기억되도록.</h2><p>{selectedProduct.featureCopy || "필요한 정보는 한눈에, 테이블 위의 즐거움은 더 크게 느낄 수 있는 상품입니다."}</p><ProductArt product={selectedProduct} large /></div>
          <div className="related-section"><SectionHeader eyebrow="YOU MAY ALSO LIKE" title="함께 보면 좋은 상품" description="이 상품과 잘 어울리는 보드픽의 추천입니다." /><div className="product-grid">{products.filter((p) => p.id !== selectedProduct.id).slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div></div>
        </section>
      )}

      {view === "cart" && (
        <section className="cart-page page-shell">
          <div className="flow-heading"><span className="active">01 장바구니</span><span>02 주문·결제</span><span>03 주문 완료</span></div>
          <h1>장바구니 <small>{cartCount}</small></h1>
          {cart.length ? <div className="cart-layout"><div className="cart-list">
            <div className="cart-select-all"><label><input type="checkbox" checked={cart.every((item) => item.selected)} onChange={(e) => setCart(cart.map((item) => ({ ...item, selected: e.target.checked })))} /> 전체 선택</label><button onClick={() => setCart(cart.filter((item) => !item.selected))}>선택 삭제</button></div>
            {cart.map((item) => <article className="cart-item" key={item.product.id}><input aria-label={`${item.product.name} 선택`} type="checkbox" checked={item.selected} onChange={() => setCart(cart.map((entry) => entry.product.id === item.product.id ? { ...entry, selected: !entry.selected } : entry))} /><button className="cart-art" onClick={() => openProduct(item.product)}><ProductArt product={item.product} /></button><div className="cart-item-info"><small>{item.product.genre}</small><button onClick={() => openProduct(item.product)}>{item.product.name}</button><span>{item.product.players} · {item.product.time}</span><div className="quantity-stepper"><button onClick={() => updateQuantity(item.product.id, -1)}>−</button><b>{item.quantity}</b><button onClick={() => updateQuantity(item.product.id, 1)}>＋</button></div></div><strong>{formatWon(item.product.price * item.quantity)}</strong><button className="remove-item" onClick={() => setCart(cart.filter((entry) => entry.product.id !== item.product.id))} aria-label={`${item.product.name} 삭제`}>×</button></article>)}
          </div><aside className="order-summary"><h2>결제 예정 금액</h2><dl><div><dt>상품 금액</dt><dd>{formatWon(subtotal)}</dd></div><div><dt>배송비</dt><dd>{shipping ? formatWon(shipping) : "무료"}</dd></div></dl>{subtotal < 50000 && <p>{formatWon(50000 - subtotal)} 더 담으면 무료배송</p>}<div className="summary-total"><span>총 결제 금액</span><strong>{formatWon(total)}</strong></div><button className="button-primary" disabled={!selectedCart.length} onClick={() => navigate("checkout")}>선택 상품 주문하기</button><button className="continue-button" onClick={() => navigate("shop")}>계속 쇼핑하기</button></aside></div> : <div className="empty-state cart-empty"><span>▢</span><h2>장바구니가 비어 있어요</h2><p>오늘의 즐거움을 채워줄 게임을 골라보세요.</p><button className="button-primary" onClick={() => navigate("shop")}>상품 둘러보기</button></div>}
        </section>
      )}

      {view === "checkout" && (
        <section className="checkout-page page-shell">
          <div className="flow-heading"><span>01 장바구니</span><span className="active">02 주문·결제</span><span>03 주문 완료</span></div>
          <h1>주문·결제</h1>
          <form onSubmit={placeOrder} className="checkout-layout">
            <div className="checkout-form">
              <section className="form-section"><h2>주문 상품 <small>{selectedCart.length}건</small></h2>{selectedCart.map((item) => <div className="checkout-product" key={item.product.id}><ProductArt product={item.product} /><span><strong>{item.product.name}</strong><small>{item.product.players} · 수량 {item.quantity}개</small></span><b>{formatWon(item.product.price * item.quantity)}</b></div>)}</section>
              <section className="form-section"><h2>주문자 정보</h2><div className="form-grid"><label>이름 <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="이름을 입력해주세요" /></label><label>휴대전화 <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" inputMode="tel" /></label><label className="full">이메일 <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="boardpick@example.com" /></label></div></section>
              <section className="form-section"><div className="form-section-title"><h2>배송지 정보</h2><button type="button" onClick={() => setForm({ ...form, receiver: form.name, receiverPhone: form.phone })}>주문자 정보와 동일</button></div><div className="form-grid"><label>받는 분 <input required value={form.receiver} onChange={(e) => setForm({ ...form, receiver: e.target.value })} placeholder="받는 분 이름" /></label><label>휴대전화 <input required value={form.receiverPhone} onChange={(e) => setForm({ ...form, receiverPhone: e.target.value })} placeholder="010-0000-0000" /></label><label className="postcode full">우편번호 <span><input required value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} placeholder="우편번호" /><button type="button" onClick={() => setForm({ ...form, postcode: "04524", address: "서울특별시 중구 세종대로 110" })}>주소 찾기</button></span></label><label className="full">기본 주소 <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="주소를 입력해주세요" /></label><label className="full">상세 주소 <input required value={form.detailAddress} onChange={(e) => setForm({ ...form, detailAddress: e.target.value })} placeholder="상세 주소를 입력해주세요" /></label><label className="full">배송 요청사항 <select value={form.request} onChange={(e) => setForm({ ...form, request: e.target.value })}><option value="">배송 요청사항을 선택해주세요</option><option>문 앞에 놓아주세요</option><option>경비실에 맡겨주세요</option><option>배송 전 연락해주세요</option></select></label></div></section>
              <section className="form-section"><h2>결제 수단</h2><div className="payment-options">{["카드", "간편결제", "무통장입금"].map((item) => <button type="button" key={item} className={payment === item ? "active" : ""} onClick={() => setPayment(item)}><span>{payment === item ? "✓" : ""}</span>{item}</button>)}</div><p className="demo-note">데모 쇼핑몰입니다. 실제 금융 정보는 입력하거나 전송하지 않습니다.</p></section>
              <section className="form-section terms-section"><label><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span><strong>필수 약관 전체 동의</strong><small>구매 조건 및 개인정보 수집·이용에 동의합니다.</small></span></label></section>
            </div>
            <aside className="order-summary checkout-summary"><h2>최종 결제 금액</h2><dl><div><dt>상품 금액</dt><dd>{formatWon(subtotal)}</dd></div><div><dt>상품 할인</dt><dd>− 0원</dd></div><div><dt>배송비</dt><dd>{shipping ? formatWon(shipping) : "무료"}</dd></div></dl><div className="summary-total"><span>총 결제 금액</span><strong>{formatWon(total)}</strong></div><button className="button-primary" type="submit" disabled={!checkoutValid || processing}>{processing ? "결제 처리 중…" : `${formatWon(total)} 결제하기`}</button><small className="summary-caption">주문 내용을 확인했으며 결제에 동의합니다.</small></aside>
          </form>
        </section>
      )}

      {view === "complete" && (
        <section className="complete-page page-shell">
          <div className="flow-heading"><span>01 장바구니</span><span>02 주문·결제</span><span className="active">03 주문 완료</span></div>
          <div className="complete-card"><div className="complete-check">✓</div><span className="eyebrow">ORDER COMPLETE</span><h1>주문이 완료되었어요</h1><p>보드픽을 이용해 주셔서 감사합니다.<br />안전하게 포장해 빠르게 보내드릴게요.</p><div className="order-number"><span>주문번호</span><strong>{orderNumber}</strong></div><div className="complete-info"><div><small>결제 수단</small><strong>{payment} · 데모 결제</strong></div><div><small>받는 분</small><strong>{form.receiver}</strong></div><div><small>배송지</small><strong>{form.address} {form.detailAddress}</strong></div></div><button className="button-primary" onClick={() => navigate("home")}>쇼핑 계속하기</button></div>
        </section>
      )}

      <footer className="footer">
        <div className="page-shell footer-grid"><div><button className="brand footer-brand" onClick={() => navigate("home")}><span className="brand-mark"><i /><i /><i /><i /></span><span>보드픽<small>BOARDPICK</small></span></button><p>오늘의 즐거움을 고르는 가장 쉬운 방법.<br />좋은 게임과 필요한 도구를 한곳에서 만나보세요.</p></div><div><strong>쇼핑</strong><button onClick={() => navigate("new")}>신상품</button><button onClick={() => navigate("featured")}>보드픽 추천</button><button onClick={() => navigate("shop")}>전체 상품</button></div><div><strong>고객 안내</strong><button>배송 안내</button><button>교환·반품</button><button>자주 묻는 질문</button></div><div><strong>고객센터</strong><b>02-1234-5678</b><small>평일 10:00–17:00<br />점심 12:00–13:00</small></div></div><div className="page-shell footer-bottom"><span>© 2026 BOARDPICK. All rights reserved.</span><span>이용약관 · 개인정보처리방침</span></div>
      </footer>
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
