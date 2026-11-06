"use client";

import { useEffect, useState } from "react";
import { Gem } from "lucide-react";
import { GLOBALS, WHEEL, dayKey } from "@/lib/game-config";
import type { Act, GamePayload } from "./game-types";
import { Button } from "./game-ui";
import { SvgIcon } from "./svg-icons";

type Props = { payload: GamePayload; now: number; busy: boolean; act: Act };
const SEGMENT = 360 / WHEEL.length;
const ICON: Record<string, string> = { coins: "🪙", gems: "💎", energy: "⚡", item: "🌾" };
const polar = (angle: number, radius: number) => {
  const rad = (angle - 90) * Math.PI / 180;
  return [100 + radius * Math.cos(rad), 100 + radius * Math.sin(rad)];
};
const sector = (index: number) => {
  const [x1, y1] = polar(index * SEGMENT, 92);
  const [x2, y2] = polar((index + 1) * SEGMENT, 92);
  return `M100 100 L${x1.toFixed(2)} ${y1.toFixed(2)} A92 92 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
};

export function WheelModule({ payload, now, busy, act }: Props) {
  const { state } = payload;
  const today = dayKey(new Date(now));
  const free = state.wheel.freeDay !== today;
  const paidToday = state.wheel.paidDay === today ? state.wheel.paidToday : 0;
  const limitReached = !free && paidToday >= GLOBALS.wheelPaidDaily;
  const last = state.wheel.last;
  const [track, setTrack] = useState({ at: last.at, rotation: 0, spinning: false });
  // Результат приходит от сервера: при новом значении колесо докручивается до выпавшего сектора.
  if (last.at !== track.at && last.index >= 0) {
    const target = (360 - (last.index + 0.5) * SEGMENT) % 360;
    setTrack({ at: last.at, rotation: track.rotation + 360 * 5 + ((target - (track.rotation % 360) + 360) % 360), spinning: true });
  }
  useEffect(() => {
    if (!track.spinning) return;
    const timer = window.setTimeout(() => setTrack((current) => ({ ...current, spinning: false })), 4300);
    return () => window.clearTimeout(timer);
  }, [track.spinning, track.at]);
  const spinning = track.spinning, rotation = track.rotation;
  const shown = !spinning && rotation > 0 && last.index >= 0 ? last.index : null;

  const prize = shown !== null ? WHEEL[shown] : null;
  return <div className="module-stack wheel-module">
    <div className="wheel-hero">
      <div className="wheel-stage">
        <div className="wheel-pointer" aria-hidden="true" />
        <svg className="wheel-svg" viewBox="0 0 200 200" role="img" aria-label="Колесо фортуны" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4.2s cubic-bezier(.12,.7,.1,1)" : "none" }}>
          <circle cx="100" cy="100" r="97" fill="#8a5a1a" />
          {WHEEL.map((entry, index) => {
            const [tx, ty] = polar((index + 0.5) * SEGMENT, 66);
            const [ix, iy] = polar((index + 0.5) * SEGMENT, 44);
            const angle = (index + 0.5) * SEGMENT;
            return <g key={entry.id}>
              <path d={sector(index)} fill={entry.color} stroke="#fff8e0" strokeWidth="2" />
              <text x={ix} y={iy} fontSize="17" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${angle} ${ix} ${iy})`}>{ICON[entry.kind]}</text>
              <text x={tx} y={ty} fontSize="14" fontWeight="900" fill="#4a2f12" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${angle} ${tx} ${ty})`}>{entry.label}</text>
            </g>;
          })}
          <circle cx="100" cy="100" r="16" fill="#fff3c4" stroke="#8a5a1a" strokeWidth="4" />
          <circle cx="100" cy="100" r="6" fill="#e8a917" />
        </svg>
      </div>
      <div className="wheel-side">
        <h2>Колесо фортуны</h2>
        <p>Одно вращение в день бесплатно. Дальше — за {GLOBALS.wheelSpinGems} алмаза, до {GLOBALS.wheelPaidDaily} раз в сутки.</p>
        <div className={`wheel-result ${prize ? "show" : ""}`} aria-live="polite">{prize ? <>Выпало: <strong>{ICON[prize.kind]} {prize.kind === "item" ? `×${prize.amount}` : prize.kind === "energy" ? `+${prize.amount}` : prize.amount}</strong></> : spinning ? "Крутится…" : "Нажмите «Крутить»"}</div>
        <Button className="btn-large wheel-button" disabled={busy || spinning || limitReached || (!free && state.gems < GLOBALS.wheelSpinGems)} onClick={() => void act({ type: "wheel-spin" })}>
          {free ? "Крутить бесплатно" : <>Крутить · <SvgIcon icon={Gem} size={16} />{GLOBALS.wheelSpinGems}</>}
        </Button>
        <small className="muted">{free ? "Бесплатное вращение доступно" : limitReached ? "Лимит платных вращений на сегодня исчерпан" : `Платных вращений сегодня: ${paidToday}/${GLOBALS.wheelPaidDaily}`}</small>
      </div>
    </div>
    <section className="panel wheel-prizes">
      <h3>Призы</h3>
      <div className="wheel-prize-grid">{WHEEL.map((entry) => <span key={entry.id} style={{ borderColor: entry.color }}><b>{ICON[entry.kind]}</b>{entry.kind === "item" ? `Корм ×${entry.amount}` : entry.kind === "energy" ? `Энергия +${entry.amount}` : entry.kind === "gems" ? `${entry.amount} алм.` : `${entry.amount} монет`}<small>{Math.round(entry.weight / WHEEL.reduce((sum, item) => sum + item.weight, 0) * 100)}%</small></span>)}</div>
    </section>
  </div>;
}
