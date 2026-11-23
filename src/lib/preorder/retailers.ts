// 예약 특전 "판매처" 글에서 이름난 쇼핑몰을 찾아 바로 가는 링크로 만든다(2026-11-23 사용자 "각 특전별 판매처도 표기, 링크까지").
//
// 판매처 칸은 한국닌텐도 공지를 그대로 옮긴 자유 글이다("온라인 닌텐도 브랜드관(G마켓, 옥션, 11번가), 롯데홈쇼핑, 예스이십사 등").
// 공지가 상품 주소를 주지 않아 링크는 **쇼핑몰 첫 화면**까지다 — 상품 주소를 지어내지 않는다.
// 아래 표에 없는 이름(오프라인 매장, 개별 스마트스토어)은 링크 없이 원문 글에만 남는다. 새 쇼핑몰이 공지에 보이면 표에 한 줄 더한다.
// 순수 함수다(retailers.test).

export type RetailerLink = { name: string; url: string };

/**
 * 찾을 이름(공지에 실제로 쓰인 표기) → 화면 이름, 주소. 순서가 곧 화면 순서다.
 * 2026-11-23 운영 DB 판매처 글 24가지에서 실제로 나온 이름만 넣었다
 */
const RETAILERS: ReadonlyArray<{ match: RegExp; name: string; url: string }> = [
  { match: /닌텐도\s*e숍/, name: "닌텐도 e숍", url: "https://store.nintendo.co.kr" },
  { match: /포켓몬\s*스토어/, name: "포켓몬 스토어", url: "https://www.pokemonstore.co.kr" },
  { match: /토이저러스/, name: "토이저러스", url: "https://www.toysrus.co.kr" },
  { match: /SSG\.COM/i, name: "SSG.COM", url: "https://www.ssg.com" },
  { match: /신세계라이브쇼핑/, name: "신세계라이브쇼핑", url: "https://www.shinsegaetvshopping.com" },
  { match: /카카오톡\s*선물하기/, name: "카카오톡 선물하기", url: "https://gift.kakao.com" },
  { match: /하이마트/, name: "하이마트", url: "https://www.e-himart.co.kr" },
  { match: /컬리/, name: "컬리", url: "https://www.kurly.com" },
  { match: /홈플러스/, name: "홈플러스", url: "https://front.homeplus.co.kr" },
  { match: /G마켓/i, name: "G마켓", url: "https://www.gmarket.co.kr" },
  { match: /옥션/, name: "옥션", url: "https://www.auction.co.kr" },
  { match: /11번가/, name: "11번가", url: "https://www.11st.co.kr" },
  { match: /롯데ON/i, name: "롯데ON", url: "https://www.lotteon.com" },
  { match: /롯데홈쇼핑|롯데i몰/, name: "롯데홈쇼핑", url: "https://www.lotteimall.com" },
  { match: /예스이십사|YES24/i, name: "예스24", url: "https://www.yes24.com" },
  { match: /CJ온스타일/i, name: "CJ온스타일", url: "https://www.cjonstyle.com" },
  { match: /현대H몰/i, name: "현대H몰", url: "https://www.hmall.com" },
];

/** 판매처 글에 나온 이름난 쇼핑몰들(표 순서, 겹친 것은 하나) */
export function retailerLinks(text: string | null): RetailerLink[] {
  if (!text) return [];
  return RETAILERS.filter((r) => r.match.test(text)).map(({ name, url }) => ({ name, url }));
}
