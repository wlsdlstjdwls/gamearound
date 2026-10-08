// 퀘스트 지도, 칭호 카드가 단계마다 쓰는 그림 — 두 자리가 같은 단계에 같은 그림을 써야 "그 칸을 채웠다" 가 이어진다.
import type { ComponentType } from "react";
import type { OnboardingStep } from "@/lib/onboarding/steps";
import { BellIcon, CalendarIcon, ClockIcon, GamepadIcon, HeartIcon, MonitorIcon, TagIcon } from "@/components/ui/icons";

type Icon = ComponentType<{ size?: number; className?: string }>;

/** intro 와 done 은 칸 그림이 없다 — intro 는 칸이 아니고, done 은 로고 손전등이 맡는다(quest-map) */
export const STEP_ICON: Partial<Record<OnboardingStep, Icon>> = {
  platforms: GamepadIcon,
  device: MonitorIcon,
  genres: HeartIcon,
  "deal-style": TagIcon,
  "play-time": ClockIcon,
  subscriptions: CalendarIcon,
  notify: BellIcon,
};
