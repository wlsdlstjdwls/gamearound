// 판매 목록 CSV 의 머리글과 한 줄을 판매 입력으로 옮긴다 — 순수 함수라 테스트로 고정한다.
//
// 검증은 손입력 폼과 **같은 스키마**(listingCreateSchema)를 다시 쓴다(AGENTS §2). CSV 전용 규칙을 따로 두면
// 폼에서는 막히는 값이 파일로는 들어오는 길이 생긴다. 여기서 하는 일은 사람이 적는 꼴("35,000원", "새 제품")을
// 스키마가 받는 꼴("35000", "new")로 옮기는 것뿐이다.
import { parseCsv } from "@/lib/csv";
import { CSV_MESSAGES } from "./listing-messages";
import { listingCreateSchema, type ListingCreateInput } from "./listing-schemas";

/** CSV 한 줄이 만드는 입력. 매장과 게임은 파일이 정하지 않는다 — 매장은 화면이, 게임은 매핑 배치(§5.2)가 정한다 */
export type ListingCsvInput = Omit<ListingCreateInput, "shopId" | "gameId">;

export type ListingCsvRow = { line: number; ok: true; value: ListingCsvInput } | { line: number; ok: false; error: string };

type Field = "name" | "barcode" | "hardware" | "condition" | "price" | "onHand" | "status";

/**
 * 머리글 별칭. 비교는 공백을 뺀 소문자로 한다 — 사람은 "상품 이름" 과 "상품이름" 을 섞어 적는다.
 * 양식(LISTING_CSV_HEADER)의 이름이 맨 앞이다.
 */
const HEADER_ALIASES: Record<Field, string[]> = {
  name: ["상품명", "상품이름", "이름", "name"],
  barcode: ["바코드", "barcode", "ean", "jan"],
  hardware: ["기종", "hardware", "platform"],
  condition: ["상태", "condition"],
  price: ["판매가", "가격", "price"],
  onHand: ["수량", "재고", "stock", "qty"],
  status: ["공개", "판매상태", "status"],
};

/** 비어 있으면 안 되는 열. 수량을 비워 두면 "0개" 인지 "안 적었다" 인지 모른다 — 다시 올릴 때 재고를 잘못 덮는다 */
const REQUIRED: Field[] = ["name", "price", "onHand"];

/** 열 순서. 양식 받기와 읽기가 같은 순서를 본다 */
const FIELD_ORDER: Field[] = ["name", "barcode", "hardware", "condition", "price", "onHand", "status"];

/** 양식의 머리글. 템플릿 받기와 테스트가 같은 줄을 본다 */
export const LISTING_CSV_HEADER = FIELD_ORDER.map((f) => HEADER_ALIASES[f][0]);

const CONDITION_WORDS: Record<string, ListingCreateInput["condition"]> = {
  중고: "used",
  used: "used",
  새제품: "new",
  신품: "new",
  new: "new",
  미개봉: "sealed",
  sealed: "sealed",
};

const STATUS_WORDS: Record<string, ListingCreateInput["status"]> = {
  판매중: "selling",
  selling: "selling",
  작성중: "draft",
  draft: "draft",
  숨김: "hidden",
  hidden: "hidden",
  품절: "soldout",
  soldout: "soldout",
};

/** 공백 빼고 소문자. 머리글, 상태, 기종 이름을 이 꼴로 맞춰 비교한다 */
function key(v: string): string {
  return v.replace(/\s+/g, "").toLowerCase();
}

/** "35,000원" 을 "35000" 으로. 숫자가 아닌 것이 남으면 그대로 넘겨 스키마가 거절하게 둔다 */
function plainNumber(v: string): string {
  return v.replace(/[,\s원]/g, "");
}

type Hardware = { code: string; nameKo: string };

/** 기종 칸은 코드("switch")로도 이름("닌텐도 스위치")으로도 받는다 */
function resolveHardware(raw: string, hardware: Hardware[]): string | null {
  const k = key(raw);
  const hit = hardware.find((h) => key(h.code) === k || key(h.nameKo) === k);
  return hit?.code ?? null;
}

/**
 * 파일 전체를 줄 단위 결과로. 머리글이 틀리면 줄을 읽지 않고 한 문장으로 끝낸다 —
 * 열이 어긋난 채로 읽으면 값이 옆 칸으로 밀려 500줄이 다 틀린 값으로 들어간다.
 *
 * `line` 은 파일에서의 줄 번호다(머리글이 1). 매장주가 엑셀에서 그 번호로 찾아간다.
 */
export function readListingCsv(
  text: string,
  hardware: Hardware[],
): { ok: true; rows: ListingCsvRow[] } | { ok: false; error: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { ok: false, error: CSV_MESSAGES.empty };

  const header = table[0].map(key);
  const index = {} as Record<Field, number>;
  for (const field of FIELD_ORDER) {
    index[field] = header.findIndex((h) => HEADER_ALIASES[field].some((a) => key(a) === h));
  }
  for (const field of REQUIRED) {
    if (index[field] < 0) return { ok: false, error: CSV_MESSAGES.headerMissing(HEADER_ALIASES[field][0]) };
  }

  const rows = table.slice(1).map((cells, i): ListingCsvRow => {
    const line = i + 2;
    const cell = (f: Field) => (index[f] >= 0 ? (cells[index[f]] ?? "").trim() : "");

    for (const field of REQUIRED) {
      if (!cell(field)) return { line, ok: false, error: CSV_MESSAGES.valueRequired(HEADER_ALIASES[field][0]) };
    }

    let hardwareCode = "";
    if (cell("hardware")) {
      const code = resolveHardware(cell("hardware"), hardware);
      if (!code) return { line, ok: false, error: CSV_MESSAGES.hardwareUnknown(cell("hardware")) };
      hardwareCode = code;
    }

    // 상태와 공개는 비우면 폼의 기본값과 같게 둔다(중고, 판매 중)
    const condition = cell("condition") ? CONDITION_WORDS[key(cell("condition"))] : "used";
    if (!condition) return { line, ok: false, error: CSV_MESSAGES.conditionUnknown(cell("condition")) };
    const status = cell("status") ? STATUS_WORDS[key(cell("status"))] : "selling";
    if (!status) return { line, ok: false, error: CSV_MESSAGES.statusUnknown(cell("status")) };

    const parsed = listingCreateSchema.omit({ shopId: true, gameId: true }).safeParse({
      name: cell("name"),
      barcode: cell("barcode"),
      hardwareCode,
      condition,
      priceMinor: plainNumber(cell("price")),
      onHand: plainNumber(cell("onHand")),
      status,
    });
    if (!parsed.success) return { line, ok: false, error: parsed.error.issues[0]?.message ?? CSV_MESSAGES.empty };
    return { line, ok: true, value: parsed.data };
  });
  return { ok: true, rows };
}
