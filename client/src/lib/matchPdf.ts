// Client-side match PDF generator. Mirrors the visual structure of the
// server-side report (server/pdf.ts) but runs in the browser via jsPDF, so
// the PDF export works on backend-less deploys (e.g. Cloudflare static).

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Team, Player, MatchEvent } from "@shared/schema";

type Lang = "bs" | "en" | "de" | "fr";

type PdfStrings = {
  eventLabels: Record<string, string>;
  zoneLabels: Record<string, string>;
  actionLabels: Record<string, string>;
  player: string; total: string;
  colPlayer: string; colSv: string; colAs: string; colTf: string; colBl: string;
  colYc: string; col2m: string; colRc: string; colGoals: string; colShots: string; colPct: string;
  totalRow: string;
  eventLog: string;
  colMin: string; colEvent: string; colZone: string; colAction: string; colTeam: string;
  statusFinal: string; statusLive: string; statusUpcoming: string;
  location: string;
  footer: string;
  noData: string;
  noEvents: string;
};

const STRINGS: Record<Lang, PdfStrings> = {
  bs: {
    eventLabels: { goal: "Gol", shot: "Šut", save: "Odbrana", assist: "Asistencija", turnover: "Izgubljena lopta", block: "Blokada", yellow_card: "Žuti karton", "2min": "2 minute", red_card: "Crveni karton" },
    zoneLabels: { left_wing: "Lijevi krilni", left_9m: "Lijevi 9m", center_9m: "Centar 9m", right_9m: "Desni 9m", right_wing: "Desni krilni", pivot: "Pivot / 6m", penalty_7m: "7m kazneni" },
    actionLabels: { set_play: "Pozic. napad", counter: "Kontranapad", fast_break: "Brzi napad", breakthrough: "Proboj", free_throw: "Slobodan udarac", penalty_7m: "7m kazneni" },
    player: "Igrač", total: "Ukupno",
    colPlayer: "Igrač", colSv: "Obr", colAs: "Ast", colTf: "Izg", colBl: "Blk",
    colYc: "Žk", col2m: "2m", colRc: "Ck", colGoals: "Golovi", colShots: "Šutevi", colPct: "%",
    totalRow: "UKUPNO",
    eventLog: "LOG DOGAĐAJA",
    colMin: "Min", colEvent: "Događaj", colZone: "Zona", colAction: "Akcija", colTeam: "Tim",
    statusFinal: "KRAJ", statusLive: "UŽIVO", statusUpcoming: "PREDSTOJEĆE",
    location: "Lokacija",
    footer: "Handball Stats Tracker  •  Generirano",
    noData: "Nema podataka za ovaj tim.",
    noEvents: "Nema zabilježenih događaja.",
  },
  en: {
    eventLabels: { goal: "Goal", shot: "Shot", save: "Save", assist: "Assist", turnover: "Turnover", block: "Block", yellow_card: "Yellow Card", "2min": "2 Minutes", red_card: "Red Card" },
    zoneLabels: { left_wing: "Left Wing", left_9m: "Left 9m", center_9m: "Center 9m", right_9m: "Right 9m", right_wing: "Right Wing", pivot: "Pivot / 6m", penalty_7m: "7m Penalty" },
    actionLabels: { set_play: "Set Play", counter: "Counter Attack", fast_break: "Fast Break", breakthrough: "Breakthrough", free_throw: "Free Throw", penalty_7m: "7m Penalty" },
    player: "Player", total: "Total",
    colPlayer: "Player", colSv: "Sv", colAs: "As", colTf: "To", colBl: "Bl",
    colYc: "Yc", col2m: "2m", colRc: "Rc", colGoals: "Goals", colShots: "Shots", colPct: "%",
    totalRow: "TOTAL",
    eventLog: "EVENT LOG",
    colMin: "Min", colEvent: "Event", colZone: "Zone", colAction: "Action", colTeam: "Team",
    statusFinal: "FINAL", statusLive: "LIVE", statusUpcoming: "UPCOMING",
    location: "Location",
    footer: "Handball Stats Tracker  •  Generated",
    noData: "No data for this team.",
    noEvents: "No events recorded.",
  },
  de: {
    eventLabels: { goal: "Tor", shot: "Wurf", save: "Parade", assist: "Assist", turnover: "Ballverlust", block: "Block", yellow_card: "Gelbe Karte", "2min": "2-Minuten", red_card: "Rote Karte" },
    zoneLabels: { left_wing: "Linker Flügel", left_9m: "Links 9m", center_9m: "Mitte 9m", right_9m: "Rechts 9m", right_wing: "Rechter Flügel", pivot: "Kreisläufer / 6m", penalty_7m: "7m Strafwurf" },
    actionLabels: { set_play: "Positionsspiel", counter: "Konterangriff", fast_break: "Schnellangriff", breakthrough: "Durchbruch", free_throw: "Freiwurf", penalty_7m: "7m Strafwurf" },
    player: "Spieler", total: "Gesamt",
    colPlayer: "Spieler", colSv: "Par", colAs: "Ass", colTf: "Verl", colBl: "Blk",
    colYc: "Gk", col2m: "2m", colRc: "Rk", colGoals: "Tore", colShots: "Würfe", colPct: "%",
    totalRow: "GESAMT",
    eventLog: "EREIGNIS-LOG",
    colMin: "Min", colEvent: "Ereignis", colZone: "Zone", colAction: "Aktion", colTeam: "Team",
    statusFinal: "ABPFIFF", statusLive: "LIVE", statusUpcoming: "BEVORSTEHEND",
    location: "Spielort",
    footer: "Handball Stats Tracker  •  Erstellt am",
    noData: "Keine Daten für dieses Team.",
    noEvents: "Keine Ereignisse erfasst.",
  },
  fr: {
    eventLabels: { goal: "But", shot: "Tir", save: "Arrêt", assist: "Passe décisive", turnover: "Perte de balle", block: "Blocage", yellow_card: "Carton jaune", "2min": "2 minutes", red_card: "Carton rouge" },
    zoneLabels: { left_wing: "Ailier gauche", left_9m: "Gauche 9m", center_9m: "Centre 9m", right_9m: "Droite 9m", right_wing: "Ailier droit", pivot: "Pivot / 6m", penalty_7m: "7m penalti" },
    actionLabels: { set_play: "Jeu placé", counter: "Contre-attaque", fast_break: "Contre rapide", breakthrough: "Percée", free_throw: "Jet franc", penalty_7m: "7m penalti" },
    player: "Joueur", total: "Total",
    colPlayer: "Joueur", colSv: "Arr", colAs: "Pas", colTf: "Pert", colBl: "Blq",
    colYc: "Cj", col2m: "2m", colRc: "Cr", colGoals: "Buts", colShots: "Tirs", colPct: "%",
    totalRow: "TOTAL",
    eventLog: "JOURNAL DES ÉVÉNEMENTS",
    colMin: "Min", colEvent: "Événement", colZone: "Zone", colAction: "Action", colTeam: "Équipe",
    statusFinal: "FINAL", statusLive: "EN DIRECT", statusUpcoming: "À VENIR",
    location: "Lieu",
    footer: "Handball Stats Tracker  •  Généré le",
    noData: "Aucune donnée pour cette équipe.",
    noEvents: "Aucun événement enregistré.",
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [60, 60, 60];
}

function fmtMinute(seconds: number): string {
  return `${Math.floor(seconds / 60)}'`;
}

type MatchInput = {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  date: Date | string;
  location: string;
  status: string;
  events: MatchEvent[];
};

export function generateMatchPdfBrowser(
  match: MatchInput,
  homePlayers: Player[],
  awayPlayers: Player[],
  lang: Lang = "bs",
): void {
  const S = STRINGS[lang] ?? STRINGS.bs;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentW = pageW - margin * 2;

  const homeRgb = hexToRgb(match.homeTeam.color);
  const awayRgb = hexToRgb(match.awayTeam.color);
  const events = match.events ?? [];
  const matchDate = new Date(match.date);

  // ── HEADER BAND ────────────────────────────────────────────────────
  doc.setFillColor(20, 20, 30);
  doc.rect(0, 0, pageW, 100, "F");

  // Home team box
  doc.setFillColor(homeRgb[0], homeRgb[1], homeRgb[2]);
  doc.roundedRect(margin, 12, 118, 64, 5, 5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(20);
  doc.text(match.homeTeam.shortName, margin + 59, 42, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(match.homeTeam.name, margin + 59, 62, { align: "center", maxWidth: 110 });

  // Away team box
  doc.setFillColor(awayRgb[0], awayRgb[1], awayRgb[2]);
  doc.roundedRect(pageW - margin - 118, 12, 118, 64, 5, 5, "F");
  doc.setFont("helvetica", "bold").setFontSize(20);
  doc.text(match.awayTeam.shortName, pageW - margin - 59, 42, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(match.awayTeam.name, pageW - margin - 59, 62, { align: "center", maxWidth: 110 });

  // Score
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(32);
  doc.text(`${match.homeScore ?? 0}  :  ${match.awayScore ?? 0}`, pageW / 2, 50, { align: "center" });

  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "normal").setFontSize(7);
  const statusLabel = match.status === "finished" ? S.statusFinal : match.status === "in_progress" ? S.statusLive : S.statusUpcoming;
  doc.text(statusLabel, pageW / 2, 70, { align: "center" });

  // Date / location
  let y = 116;
  doc.setTextColor(85, 85, 85);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(format(matchDate, "EEEE, d MMMM yyyy  •  HH:mm"), pageW / 2, y, { align: "center" });
  if (match.location) {
    y += 13;
    doc.text(`${S.location}: ${match.location}`, pageW / 2, y, { align: "center" });
  }
  y += 18;

  // ── TEAM TABLES ────────────────────────────────────────────────────
  const renderTeamTable = (teamId: number, teamName: string, players: Player[], rgb: [number, number, number]) => {
    const teamEvents = events.filter((e) => e.teamId === teamId);

    // Section title bar
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.rect(margin, y, contentW, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text(teamName.toUpperCase(), margin + 6, y + 12);
    y += 18;

    type Row = { num: string; name: string; g: number; sh: number; sv: number; as_: number; tf: number; bl: number; yc: number; tm: number; rc: number };
    const rows: Row[] = players
      .map((p) => {
        const pe = teamEvents.filter((e) => e.playerId === p.id);
        if (pe.length === 0) return null;
        const goals = pe.filter((e) => e.type === "goal").length;
        const shots = pe.filter((e) => e.type === "goal" || e.type === "shot").length;
        return {
          num: String(p.number),
          name: p.name,
          g: goals,
          sh: shots,
          sv: pe.filter((e) => e.type === "save").length,
          as_: pe.filter((e) => e.type === "assist").length,
          tf: pe.filter((e) => e.type === "turnover").length,
          bl: pe.filter((e) => e.type === "block").length,
          yc: pe.filter((e) => e.type === "yellow_card").length,
          tm: pe.filter((e) => e.type === "2min").length,
          rc: pe.filter((e) => e.type === "red_card").length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.g - a!.g) as Row[];

    if (rows.length === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentW, 16, "F");
      doc.setTextColor(170, 170, 170);
      doc.setFont("helvetica", "normal").setFontSize(8);
      doc.text(S.noData, margin + 6, y + 11);
      y += 26;
      return;
    }

    const totals = rows.reduce(
      (a, r) => ({ g: a.g + r.g, sh: a.sh + r.sh, sv: a.sv + r.sv, as_: a.as_ + r.as_, tf: a.tf + r.tf, bl: a.bl + r.bl, yc: a.yc + r.yc, tm: a.tm + r.tm, rc: a.rc + r.rc }),
      { g: 0, sh: 0, sv: 0, as_: 0, tf: 0, bl: 0, yc: 0, tm: 0, rc: 0 },
    );
    const pct = totals.sh > 0 ? Math.round((totals.g / totals.sh) * 100) : 0;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      theme: "grid",
      head: [[
        "#", S.colPlayer,
        S.colGoals, S.colShots, S.colPct,
        S.colSv, S.colAs, S.colTf, S.colBl,
        S.colYc, S.col2m, S.colRc,
      ]],
      body: rows.map((r) => [
        r.num, r.name,
        r.g || "-", r.sh || "-", r.sh > 0 ? `${Math.round((r.g / r.sh) * 100)}%` : "-",
        r.sv || "-", r.as_ || "-", r.tf || "-", r.bl || "-",
        r.yc || "-", r.tm || "-", r.rc || "-",
      ]),
      foot: [[
        "", S.totalRow,
        String(totals.g), String(totals.sh), totals.sh > 0 ? `${pct}%` : "-",
        String(totals.sv), String(totals.as_), String(totals.tf), String(totals.bl),
        String(totals.yc), String(totals.tm), String(totals.rc),
      ]],
      headStyles: { fillColor: [rgb[0], rgb[1], rgb[2]], textColor: 255, fontSize: 8, halign: "center" },
      footStyles: { fillColor: [238, 238, 248], textColor: 30, fontStyle: "bold", fontSize: 8, halign: "center" },
      bodyStyles: { fontSize: 8, halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 22 },
        1: { halign: "left", cellWidth: 100 },
      },
      styles: { cellPadding: 3, lineColor: [220, 220, 230], lineWidth: 0.3 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  };

  renderTeamTable(match.homeTeam.id, match.homeTeam.name, homePlayers, homeRgb);
  renderTeamTable(match.awayTeam.id, match.awayTeam.name, awayPlayers, awayRgb);

  // ── EVENT LOG ──────────────────────────────────────────────────────
  if (y > pageH - 100) {
    doc.addPage();
    y = 40;
  }

  doc.setFillColor(20, 20, 30);
  doc.rect(margin, y, contentW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(S.eventLog, margin + 6, y + 12);
  y += 18;

  if (events.length === 0) {
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentW, 16, "F");
    doc.setTextColor(170, 170, 170);
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(S.noEvents, margin + 6, y + 11);
    y += 16;
  } else {
    const allPlayers = [...homePlayers, ...awayPlayers];
    const sorted = [...events].sort((a, b) => a.time - b.time);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      theme: "striped",
      head: [[S.colMin, S.colEvent, S.colZone, S.colAction, S.colPlayer, S.colTeam]],
      body: sorted.map((ev) => {
        const player = allPlayers.find((p) => p.id === ev.playerId);
        const isHome = ev.teamId === match.homeTeam.id;
        return [
          fmtMinute(ev.time),
          S.eventLabels[ev.type] ?? ev.type,
          ev.shotZone ? (S.zoneLabels[ev.shotZone] ?? ev.shotZone) : "—",
          ev.actionType ? (S.actionLabels[ev.actionType] ?? ev.actionType) : "—",
          player ? `#${player.number} ${player.name}` : "—",
          isHome ? match.homeTeam.name : match.awayTeam.name,
        ];
      }),
      headStyles: { fillColor: [20, 20, 30], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 3, lineColor: [220, 220, 230], lineWidth: 0.2 },
      columnStyles: { 0: { halign: "center", cellWidth: 36 } },
    });
  }

  // ── FOOTER ─────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(170, 170, 170);
    doc.setFont("helvetica", "normal").setFontSize(7);
    doc.text(
      `${S.footer} ${format(new Date(), "d. M. yyyy. HH:mm")}`,
      pageW / 2,
      pageH - 16,
      { align: "center" },
    );
  }

  const filename = `Match_${match.homeTeam.shortName}_vs_${match.awayTeam.shortName}_${format(matchDate, "yyyyMMdd")}.pdf`;
  doc.save(filename);
}
