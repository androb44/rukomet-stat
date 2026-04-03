import PDFDocument from "pdfkit";
import type { Response } from "express";
import { format } from "date-fns";

const EVENT_LABELS: Record<string, string> = {
  goal: "Goal",
  shot: "Shot",
  save: "Save",
  assist: "Assist",
  turnover: "Turnover",
  block: "Block",
  yellow_card: "Yellow Card",
  "2min": "2-Min Suspension",
  red_card: "Red Card",
};

const ZONE_LABELS: Record<string, string> = {
  left_wing: "Left Wing",
  left_9m: "Left 9m",
  center_9m: "Center 9m",
  right_9m: "Right 9m",
  right_wing: "Right Wing",
  pivot: "Pivot / 6m",
  penalty_7m: "7m Penalty",
};

const ACTION_LABELS: Record<string, string> = {
  set_play: "Set Play",
  counter: "Counter Attack",
  fast_break: "Fast Break",
  breakthrough: "Breakthrough",
  free_throw: "Free Throw",
  penalty_7m: "7m Penalty",
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [60, 60, 60];
}

function formatMinute(seconds: number): string {
  return `${Math.floor(seconds / 60)}'`;
}

export function generateMatchPdf(match: any, homePlayers: any[], awayPlayers: any[], res: Response) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  const homeRgb = hexToRgb(match.homeTeam.color);
  const awayRgb = hexToRgb(match.awayTeam.color);
  const events: any[] = match.events ?? [];
  const allPlayers = [...homePlayers, ...awayPlayers];

  const filename = `Match_${match.homeTeam.shortName}_vs_${match.awayTeam.shortName}_${format(new Date(match.date), "yyyyMMdd")}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");

  doc.pipe(res);

  const pageW = doc.page.width;
  const margin = 40;
  const contentW = pageW - margin * 2;

  // ── HEADER ─────────────────────────────────────────────────────────
  // Background banner
  doc.rect(0, 0, pageW, 110).fill("#14141e");

  // Home team block
  doc.roundedRect(margin, 14, 130, 70, 6).fill(match.homeTeam.color);
  doc.fill("#ffffff").font("Helvetica-Bold").fontSize(22)
    .text(match.homeTeam.shortName, margin, 30, { width: 130, align: "center" });
  doc.fill("rgba(255,255,255,0.75)").font("Helvetica").fontSize(9)
    .text(match.homeTeam.name, margin, 56, { width: 130, align: "center" });

  // Away team block
  doc.roundedRect(pageW - margin - 130, 14, 130, 70, 6).fill(match.awayTeam.color);
  doc.fill("#ffffff").font("Helvetica-Bold").fontSize(22)
    .text(match.awayTeam.shortName, pageW - margin - 130, 30, { width: 130, align: "center" });
  doc.fill("rgba(255,255,255,0.75)").font("Helvetica").fontSize(9)
    .text(match.awayTeam.name, pageW - margin - 130, 56, { width: 130, align: "center" });

  // Score
  const scoreText = `${match.homeScore ?? 0}  :  ${match.awayScore ?? 0}`;
  doc.fill("#ffffff").font("Helvetica-Bold").fontSize(36)
    .text(scoreText, 0, 26, { align: "center", width: pageW });

  const statusLabel =
    match.status === "finished" ? "FINAL" : match.status === "in_progress" ? "LIVE" : "UPCOMING";
  doc.fill("rgba(255,255,255,0.55)").font("Helvetica").fontSize(8)
    .text(statusLabel, 0, 66, { align: "center", width: pageW });

  // Date / location
  doc.moveDown(0.2);
  let y = 120;
  doc.fill("#555555").font("Helvetica").fontSize(9)
    .text(format(new Date(match.date), "EEEE, d MMMM yyyy  •  HH:mm"), margin, y, { align: "center", width: contentW });

  if (match.location) {
    y += 14;
    doc.text(`📍  ${match.location}`, margin, y, { align: "center", width: contentW });
  }

  // Section title helper
  const sectionTitle = (title: string, yPos: number, rgb: [number,number,number] = [20,20,30]) => {
    doc.rect(margin, yPos, contentW, 20).fill(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
    doc.fill("#ffffff").font("Helvetica-Bold").fontSize(9)
      .text(title, margin + 8, yPos + 5, { width: contentW - 16 });
    return yPos + 20;
  };

  // Table row helper
  const drawRow = (cols: { text: string; width: number; bold?: boolean; color?: string }[], yPos: number, bg?: string) => {
    const rowH = 18;
    if (bg) doc.rect(margin, yPos, contentW, rowH).fill(bg);
    let x = margin;
    for (const col of cols) {
      doc.fill(col.color ?? "#222222")
        .font(col.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .text(col.text, x + 4, yPos + 4, { width: col.width - 8 });
      x += col.width;
    }
    return yPos + rowH;
  };

  // ── TEAM STATS ─────────────────────────────────────────────────────
  y = match.location ? 158 : 144;
  y += 12;

  const statKeys = Object.keys(EVENT_LABELS);
  const activeStats = statKeys.filter((k) => {
    const homeC = events.filter((e) => e.teamId === match.homeTeam.id && e.type === k).length;
    const awayC = events.filter((e) => e.teamId === match.awayTeam.id && e.type === k).length;
    return homeC + awayC > 0;
  });

  if (activeStats.length > 0) {
    y = sectionTitle("TEAM STATISTICS", y);
    // Header row
    const statCols = [
      { text: match.homeTeam.name, width: 130, bold: true, color: `rgb(${homeRgb[0]},${homeRgb[1]},${homeRgb[2]})` },
      { text: "Event", width: contentW - 260, bold: true, color: "#444444" },
      { text: match.awayTeam.name, width: 130, bold: true, color: `rgb(${awayRgb[0]},${awayRgb[1]},${awayRgb[2]})` },
    ];
    y = drawRow(statCols, y, "#f0f0f5");

    activeStats.forEach((k, idx) => {
      const homeCount = events.filter((e) => e.teamId === match.homeTeam.id && e.type === k).length;
      const awayCount = events.filter((e) => e.teamId === match.awayTeam.id && e.type === k).length;
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8f8fc";
      y = drawRow([
        { text: String(homeCount), width: 130, bold: true },
        { text: EVENT_LABELS[k], width: contentW - 260 },
        { text: String(awayCount), width: 130, bold: true },
      ], y, bg);
    });
    y += 14;
  }

  // ── PLAYER STATS ───────────────────────────────────────────────────
  const playerStatCols = [
    { key: "number", label: "#", width: 28 },
    { key: "name", label: "Player", width: 110 },
    { key: "position", label: "Pos", width: 30 },
    { key: "goal", label: "G", width: 22 },
    { key: "shot", label: "Sh", width: 22 },
    { key: "save", label: "Sv", width: 22 },
    { key: "assist", label: "As", width: 22 },
    { key: "turnover", label: "To", width: 22 },
    { key: "block", label: "Bl", width: 22 },
    { key: "yellow_card", label: "Yc", width: 22 },
    { key: "2min", label: "2m", width: 22 },
    { key: "red_card", label: "Rc", width: 22 },
  ];

  const drawPlayerTable = (players: any[], teamId: number, rgb: [number,number,number], teamName: string) => {
    const playerRows = players
      .map((p) => {
        const pEvents = events.filter((e) => e.teamId === teamId && e.playerId === p.id);
        if (pEvents.length === 0) return null;
        const stats: Record<string, number> = {};
        for (const k of statKeys) stats[k] = pEvents.filter((e: any) => e.type === k).length;
        return { player: p, stats };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aGoals = a.stats.goal ?? 0;
        const bGoals = b.stats.goal ?? 0;
        return bGoals - aGoals;
      });

    if (playerRows.length === 0) return;

    // Add new page if not enough space
    if (y > 680) { doc.addPage(); y = 40; }

    y = sectionTitle(`${teamName.toUpperCase()}  —  PLAYER STATISTICS`, y, rgb);

    // Header
    y = drawRow(
      playerStatCols.map((c) => ({ text: c.label, width: c.width, bold: true, color: "#ffffff" })),
      y,
      `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
    );

    playerRows.forEach((row: any, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8f8fc";
      y = drawRow(
        playerStatCols.map((c) => {
          if (c.key === "number") return { text: String(row.player.number), width: c.width, bold: true };
          if (c.key === "name") return { text: row.player.name, width: c.width };
          if (c.key === "position") return { text: row.player.position, width: c.width, color: "#666666" };
          return { text: String(row.stats[c.key] || 0), width: c.width, color: row.stats[c.key] ? "#111111" : "#cccccc" };
        }),
        y,
        bg
      );
    });
    y += 14;
  };

  drawPlayerTable(homePlayers, match.homeTeam.id, homeRgb, match.homeTeam.name);
  drawPlayerTable(awayPlayers, match.awayTeam.id, awayRgb, match.awayTeam.name);

  // ── EVENT LOG ──────────────────────────────────────────────────────
  if (events.length > 0) {
    if (y > 650) { doc.addPage(); y = 40; }

    y = sectionTitle("MATCH EVENT LOG", y);

    // Header
    y = drawRow([
      { text: "Min", width: 36, bold: true, color: "#ffffff" },
      { text: "Event", width: 100, bold: true, color: "#ffffff" },
      { text: "Zone / Action", width: 130, bold: true, color: "#ffffff" },
      { text: "Player", width: 140, bold: true, color: "#ffffff" },
      { text: "Team", width: contentW - 406, bold: true, color: "#ffffff" },
    ], y, "#14141e");

    const sorted = [...events].sort((a, b) => a.time - b.time);
    sorted.forEach((event, idx) => {
      if (y > 740) { doc.addPage(); y = 40; }
      const player = allPlayers.find((p) => p.id === event.playerId);
      const isHome = event.teamId === match.homeTeam.id;
      const teamRgb = isHome ? homeRgb : awayRgb;
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8f8fc";
      const zoneAction = [
        event.shotZone ? ZONE_LABELS[event.shotZone] ?? event.shotZone : null,
        event.actionType ? ACTION_LABELS[event.actionType] ?? event.actionType : null,
      ].filter(Boolean).join(" · ");

      y = drawRow([
        { text: formatMinute(event.time), width: 36 },
        { text: EVENT_LABELS[event.type] ?? event.type, width: 100 },
        { text: zoneAction || "—", width: 130, color: "#666666" },
        { text: player ? `#${player.number} ${player.name}` : "—", width: 140 },
        { text: isHome ? match.homeTeam.name : match.awayTeam.name, width: contentW - 406, bold: true, color: `rgb(${teamRgb[0]},${teamRgb[1]},${teamRgb[2]})` },
      ], y, bg);
    });
  }

  // ── FOOTER ──────────────────────────────────────────────────────────
  doc.fill("#aaaaaa").font("Helvetica").fontSize(7)
    .text(
      `Handball Stats Tracker  •  Generated ${format(new Date(), "d MMM yyyy HH:mm")}`,
      margin,
      doc.page.height - 25,
      { align: "center", width: contentW, lineBreak: false }
    );

  doc.end();
}
