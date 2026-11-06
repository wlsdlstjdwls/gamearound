// 섞인 정체 규칙 — 2026-11-06 옛 DB 병합 오염 실측 사례를 픽스처로 남긴다.
import { describe, expect, it } from "vitest";
import { findMixedIdentity, titlesRelated, type QualityRef } from "./rules-identity";
import type { QualityGame } from "./rules";

const game = (id: string, titleEn: string): QualityGame => ({ id, titleEn, contentType: "game", parentGameId: null });
const ref = (gameId: string, source: string, matchedTitle: string, matchedBy: "auto" | "manual" = "auto"): QualityRef => ({
  gameId,
  source,
  externalId: `${source}-${matchedTitle}`,
  matchedTitle,
  matchedBy,
});

describe("titlesRelated", () => {
  it("판본 꼬리, 기종 꼬리, 띄어쓰기는 같은 게임으로 본다", () => {
    expect(titlesRelated("Braid", "Braid, Anniversary Edition")).toBe(true);
    expect(titlesRelated("Absolum", "AbsolumNintendo Switch 2 Edition")).toBe(true);
    expect(titlesRelated("Assassin's Creed IV Black Flag", "Assassin's Creed IV: Black Flag")).toBe(true);
    expect(titlesRelated("Endzone - A World Apart", "Endzone: A World Apart - Survivor Edition")).toBe(true);
    expect(titlesRelated("Outlast 2", "Outlast II")).toBe(true);
    expect(titlesRelated("XEL", "XEL - Complete Edition")).toBe(true);
    expect(titlesRelated("EA SPORTS FC 24 Xbox Series X|S", "EA SPORTS FC™ 24")).toBe(true);
  });
  it("앞 낱말 하나만 겹치는 다른 작품은 다르다", () => {
    expect(titlesRelated("Halo: Campaign Evolved", "Halo Wars")).toBe(false);
    expect(titlesRelated("Digimon Survive", "Digimon World: Next Order")).toBe(false);
    expect(titlesRelated("Endzone - A World Apart", "A Fold Apart")).toBe(false);
  });
});

describe("findMixedIdentity", () => {
  it("행 제목과 스토어 판이 맞고 평점 소스만 딴 게임이면 auto 로 끊는다(1000xRESIST 에 붙은 100% Orange Juice)", () => {
    const g = game("g1", "1000xRESIST");
    const out = findMixedIdentity([g], [
      ref("g1", "steam", "1000xRESIST"),
      ref("g1", "xbox", "1000xRESIST"),
      ref("g1", "hltb", "100% Orange Juice"),
      ref("g1", "metacritic", "100% Orange Juice"),
    ]);
    expect(out.map((f) => [f.verdict, f.fix?.kind])).toEqual([
      ["auto", "unlink_meta_ref"],
      ["auto", "unlink_meta_ref"],
    ]);
  });

  it("스토어 판이 딴 게임이면 떼어 내자고 묻는다(Lilac 0 행의 Xbox 0 Degrees)", () => {
    const out = findMixedIdentity([game("g1", "Lilac 0")], [
      ref("g1", "xbox", "0 Degrees"),
      ref("g1", "hltb", "Lilac 0"),
      ref("g1", "wikidata_game", "Lilac 0"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ verdict: "candidate", fix: { kind: "split_store_ref", title: "0 Degrees", toGameId: null } });
  });

  it("떼어 낸 판은 같은 제목 행이 하나 있으면 그리로 옮긴다", () => {
    const out = findMixedIdentity([game("g1", "Expeditions: Rome"), game("g2", "Hidden Cats in Rome")], [
      ref("g1", "steam", "Expeditions: Rome"),
      ref("g1", "epic", "Hidden Cats in Rome"),
    ]);
    expect(out[0]).toMatchObject({ verdict: "candidate", fix: { toGameId: "g2" } });
  });

  it("행 제목을 받쳐 주는 연결이 없으면 판정하지 않는다 — 행 제목 쪽이 틀렸을 수 있다", () => {
    const out = findMixedIdentity([game("g1", "Kindred Spirits on the Roof")], [
      ref("g1", "hltb", "Five Hearts Under One Roof"),
      ref("g1", "metacritic", "Five Hearts Under One Roof"),
    ]);
    expect(out).toEqual([]);
  });

  it("받침이 평점 소스뿐이면 서로 맞는 평점 연결은 남긴다(Five Hearts 행의 위키데이터만 제목과 맞았다)", () => {
    const out = findMixedIdentity([game("g1", "Kindred Spirits on the Roof")], [
      ref("g1", "wikidata_game", "Kindred Spirits on the Roof"),
      ref("g1", "hltb", "Five Hearts Under One Roof"),
      ref("g1", "metacritic", "Five Hearts Under One Roof"),
    ]);
    expect(out).toEqual([]);
  });

  it("받침이 평점 소스뿐이어도 홀로 딴 게임인 연결은 끊는다(CRACK 행의 Warriors Orochi 4)", () => {
    const out = findMixedIdentity([game("g1", "CRACK")], [ref("g1", "wikidata_game", "Crack"), ref("g1", "metacritic", "Warriors Orochi 4")]);
    expect(out.map((f) => f.verdict)).toEqual(["auto"]);
  });

  it("스토어 판 제목과 닮은 평점 연결은 남긴다 — 행 제목이 낡았을 수 있다", () => {
    const out = findMixedIdentity([game("g1", "Ryu ga Gotoku 4")], [
      ref("g1", "nintendo_jp", "Ryu ga Gotoku 4"),
      ref("g1", "xbox", "Yakuza 4 Remastered"),
      ref("g1", "hltb", "Yakuza 4"),
    ]);
    expect(out.filter((f) => f.fix)).toEqual([]);
  });

  it("사람이 이은 연결과 한글 제목은 건드리지 않는다", () => {
    const out = findMixedIdentity([game("g1", "Tohotopia")], [
      ref("g1", "hltb", "Tohotopia"),
      ref("g1", "metacritic", "Magical Girl Witch Trial", "manual"),
      ref("g1", "steam", "토호토피아"),
    ]);
    expect(out).toEqual([]);
  });
});
