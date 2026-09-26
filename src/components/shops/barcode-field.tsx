"use client";
// 물건 폼의 바코드 칸 — 스캐너, 손입력, 카메라 셋을 한 칸이 받는다. 설계서 §11 "바코드 스캔 등록".
//
// USB, 블루투스 스캐너는 키보드다. 숫자를 치고 **엔터**를 보낸다. 그냥 두면 그 엔터가 반쯤 채운 폼을 제출한다 —
// 그래서 이 칸의 엔터는 제출이 아니라 조회다. 스캐너를 쓰는 매장은 찍고, 이름이 채워진 것을 보고, 값만 적는다.
//
// 카메라는 브라우저 내장 BarcodeDetector 를 쓴다. 안드로이드 크롬, 삼성 인터넷은 있고 **아이폰 사파리는 없다**
// (2026-09 기준). 없는 기기에서는 버튼을 세우지 않는다 — 누르면 실패할 버튼을 두지 않는다. 라이브러리(zxing 등)를
// 들이면 아이폰도 되지만 수백 KB 가 매장 콘솔 전체에 실린다. 아이폰 매장은 스캐너나 손입력으로 충분하다.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { lookupBarcodeAction } from "@/app/(user)/vendor/[shopSlug]/listings/actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { BARCODE_SCAN_FORMATS, BARCODE_SCAN_INTERVAL_MS } from "@/lib/shops/constants";
import { LISTING_MESSAGES as M } from "@/lib/shops/listing-messages";
import { BARCODE_MAX, BARCODE_MIN, normalizeBarcode } from "@/lib/shops/listing-schemas";
import type { BarcodeHitDto } from "@/server/services/listings";

/** TS 기본 lib 에 없는 브라우저 API. 쓰는 만큼만 적는다 */
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (opts: { formats: readonly string[] }) => BarcodeDetectorLike;

function detectorCtor(): BarcodeDetectorCtor | null {
  return (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;
}

const noopSubscribe = () => () => {};

function CameraScanner({ onDetect, onFail }: { onDetect: (code: string) => void; onFail: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const Ctor = detectorCtor();
    if (!Ctor) return onFail();
    const detector = new Ctor({ formats: BARCODE_SCAN_FORMATS });
    let stream: MediaStream | null = null;
    let frame = 0;
    let last = 0;
    let stopped = false;

    async function tick(now: number) {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && now - last >= BARCODE_SCAN_INTERVAL_MS) {
        last = now;
        const found = await detector.detect(video).catch(() => []);
        if (!stopped && found[0]?.rawValue) return onDetect(found[0].rawValue);
      }
      frame = requestAnimationFrame(tick);
    }

    navigator.mediaDevices
      // 뒤 카메라. 앞 카메라는 초점 거리가 길어 바코드가 번진다
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        frame = requestAnimationFrame(tick);
      })
      .catch(onFail);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect, onFail]);

  return (
    <div className="flex flex-col gap-2">
      <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full rounded-[var(--radius-sm)] bg-bg object-cover" />
      <p className="text-[12px] text-dim">{M.barcodeScanHint}</p>
    </div>
  );
}

export function BarcodeField({ shopSlug, onHit }: { shopSlug: string; onHit: (hit: BarcodeHitDto) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const lastLooked = useRef("");
  // 서버에서는 늘 false 다 — 첫 화면은 버튼 없이 그리고, 붙은 뒤 기기가 되면 세운다(하이드레이션 어긋남 없이)
  const canScan = useSyncExternalStore(noopSubscribe, () => detectorCtor() !== null && Boolean(navigator.mediaDevices), () => false);

  const lookup = useCallback(
    async (raw: string) => {
      const code = normalizeBarcode(raw);
      if (code.length < BARCODE_MIN || code === lastLooked.current) return;
      lastLooked.current = code;
      setNote(M.barcodeFinding);
      const hit = await lookupBarcodeAction(shopSlug, code).catch(() => null);
      if (hit) {
        onHit(hit);
        setNote(M.barcodeHit(hit.name, hit.gameTitle));
      } else {
        setNote(M.barcodeMiss);
      }
    },
    [shopSlug, onHit],
  );

  // 칸을 제어하지 않는다 — 등록이 성공하면 ActionForm 이 form.reset() 으로 비우는데, 값을 state 로 쥐면
  // 화면만 비고 state 는 옛 바코드를 쥔 채 남는다. 대신 초기화를 들어 안내와 마지막 조회값을 같이 지운다
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      lastLooked.current = "";
      setNote(null);
      setError(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const onDetect = useCallback(
    (code: string) => {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = code;
      void lookup(code);
    },
    [lookup],
  );

  const onFail = useCallback(() => {
    setScanning(false);
    setError(M.barcodeCameraDenied);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <TextField
        name="barcode"
        label={M.barcodeLabel}
        hint={note ?? M.barcodeHint}
        error={error}
        maxLength={BARCODE_MAX}
        inputMode="numeric"
        autoComplete="off"
        ref={inputRef}
        onChange={() => setError(null)}
        onKeyDown={(e) => {
          // 스캐너가 보내는 엔터가 폼을 제출하지 않게 한다(파일 머리 주석)
          if (e.key !== "Enter") return;
          e.preventDefault();
          void lookup(e.currentTarget.value);
        }}
        onBlur={(e) => void lookup(e.currentTarget.value)}
      />
      {canScan && (
        <div className="flex flex-col gap-2">
          <div>
            <Button variant="ghost" size="sm" onClick={() => (setError(null), setScanning((s) => !s))}>
              {scanning ? M.barcodeScanStop : M.barcodeScan}
            </Button>
          </div>
          {scanning && <CameraScanner onDetect={onDetect} onFail={onFail} />}
        </div>
      )}
    </div>
  );
}
