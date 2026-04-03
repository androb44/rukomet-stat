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

  // Helper: count events by type and team
  const countEv = (teamId: number, type: string) =>
    events.filter((e) => e.teamId === teamId && e.type === type).length;

  const homeId = match.homeTeam.id;
  const awayId = match.awayTeam.id;

  const activeStats = statKeys.filter((k) => countEv(homeId, k) + countEv(awayId, k) > 0);

  if (activeStats.length > 0) {
    y = sectionTitle("TEAM STATISTICS", y);

    // Column widths: HOME_VAL | STAT_LABEL | AWAY_VAL
    const valW = 110;
    const labelW = contentW - valW * 2;

    // Header row — explains each column
    y = drawRow([
      { text: `${match.homeTeam.name} ↑`, width: valW, bold: true, color: `rgb(${homeRgb[0]},${homeRgb[1]},${homeRgb[2]})` },
      { text: "Statistika", width: labelW, bold: true, color: "#444444" },
      { text: `↑ ${match.awayTeam.name}`, width: valW, bold: true, color: `rgb(${awayRgb[0]},${awayRgb[1]},${awayRgb[2]})` },
    ], y, "#f0f0f5");

    // Goals / Shots combined row (always first if both exist)
    const homeGoals = countEv(homeId, "goal");
    const homeShots = countEv(homeId, "shot") + homeGoals; // goals are successful shots
    const awayGoals = countEv(awayId, "goal");
    const awayShots = countEv(awayId, "shot") + awayGoals;

    const hasShootingData = homeShots + awayShots > 0;
    if (hasShootingData) {
      y = drawRow([
        { text: `${homeGoals} / ${homeShots}`, width: valW, bold: true, color: `rgb(${homeRgb[0]},${homeRgb[1]},${homeRgb[2]})` },
        { text: "Gol / Šut  (G/Šut)", width: labelW, bold: true },
        { text: `${awayGoals} / ${awayShots}`, width: valW, bold: true, color: `rgb(${awayRgb[0]},${awayRgb[1]},${awayRgb[2]})` },
      ], y, "#fff8e7");

      // Shooting efficiency %
      const homePct = homeShots > 0 ? Math.round((homeGoals / homeShots) * 100) : 0;
      const awayPct = awayShots > 0 ? Math.round((awayGoals / awayShots) * 100) : 0;
      y = drawRow([
        { text: `${homePct}%`, width: valW, bold: true },
        { text: "Efikasnost šutiranja", width: labelW, color: "#555555" },
        { text: `${awayPct}%`, width: valW, bold: true },
      ], y, "#fffdf0");
    }

    // Other stats (excluding goal/shot since they're shown above)
    const otherStats = activeStats.filter((k) => k !== "goal" && k !== "shot");
    otherStats.forEach((k, idx) => {
      const homeCount = countEv(homeId, k);
      const awayCount = countEv(awayId, k);
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8f8fc";
      y = drawRow([
        { text: String(homeCount), width: valW, bold: true },
        { text: EVENT_LABELS[k], width: labelW },
        { text: String(awayCount), width: valW, bold: true },
      ], y, bg);
    });
    y += 14;
  }

  // ── SHOOTING BY ZONE ───────────────────────────────────────────────
  const zones = Object.keys(ZONE_LABELS);
  const zoneData = zones.map((zone) => {
    const homeGoalsZ = events.filter((e) => e.teamId === homeId && e.type === "goal" && e.shotZone === zone).length;
    const homeShotsZ = events.filter((e) => e.teamId === homeId && (e.type === "goal" || e.type === "shot") && e.shotZone === zone).length;
    const awayGoalsZ = events.filter((e) => e.teamId === awayId && e.type === "goal" && e.shotZone === zone).length;
    const awayShotsZ = events.filter((e) => e.teamId === awayId && (e.type === "goal" || e.type === "shot") && e.shotZone === zone).length;
    return { zone, homeGoalsZ, homeShotsZ, awayGoalsZ, awayShotsZ };
  }).filter((r) => r.homeShotsZ + r.awayShotsZ > 0);

  if (zoneData.length > 0) {
    if (y > 680) { doc.addPage(); y = 40; }
    y = sectionTitle("ŠUTEVI PO POZICIJI  (Golovi / Pokušaji)", y);

    const zoneValW = 90;
    const zoneLabelW = contentW - zoneValW * 2;

    // Header with column explanations
    y = drawRow([
      {
        text: `${match.homeTeam.shortName}  G / Šut  (%)`,
        width: zoneValW, bold: true,
        color: `rgb(${homeRgb[0]},${homeRgb[1]},${homeRgb[2]})`
      },
      { text: "Pozicija", width: zoneLabelW, bold: true, color: "#444444" },
      {
        text: `${match.awayTeam.shortName}  G / Šut  (%)`,
        width: zoneValW, bold: true,
        color: `rgb(${awayRgb[0]},${awayRgb[1]},${awayRgb[2]})`
      },
    ], y, "#f0f0f5");

    zoneData.forEach(({ zone, homeGoalsZ, homeShotsZ, awayGoalsZ, awayShotsZ }, idx) => {
      const homePct = homeShotsZ > 0 ? Math.round((homeGoalsZ / homeShotsZ) * 100) : 0;
      const awayPct = awayShotsZ > 0 ? Math.round((awayGoalsZ / awayShotsZ) * 100) : 0;
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8f8fc";
      y = drawRow([
        {
          text: homeShotsZ > 0 ? `${homeGoalsZ} / ${homeShotsZ}  (${homePct}%)` : "—",
          width: zoneValW, bold: homeGoalsZ > 0
        },
        { text: ZONE_LABELS[zone], width: zoneLabelW },
        {
          text: awayShotsZ > 0 ? `${awayGoalsZ} / ${awayShotsZ}  (${awayPct}%)` : "—",
          width: zoneValW, bold: awayGoalsZ > 0
        },
      ], y, bg);
    });
    y += 14;
  }

  // ── PLAYER STATS ───────────────────────────────────────────────────
  // Columns: # | Player | Pos | G/Šut | Sv | As | To | Bl | Yc | 2m | Rc
  const playerStatCols = [
    { key: "number",      label: "#",      title: "Broj",         width: 28 },
    { key: "name",        label: "Igrač",  title: "Ime igrača",   width: 112 },
    { key: "position",    label: "Poz",    title: "Pozicija",     width: 28 },
    { key: "g_sh",        label: "G/Šut",  title: "Golovi/Šutevi", width: 40 },
    { key: "save",        label: "Obr",    title: "Odbrane",      width: 25 },
    { key: "assist",      label: "Ast",    title: "Asistencije",  width: 25 },
    { key: "turnover",    label: "Izg",    title: "Izgubljene",   width: 25 },
    { key: "block",       label: "Blk",    title: "Blokade",      width: 25 },
    { key: "yellow_card", label: "Žk",     title: "Žuti karton",  width: 22 },
    { key: "2min",        label: "2m",     title: "2 minute",     width: 22 },
    { key: "red_card",    label: "Ck",     title: "Crveni karton", width: 22 },
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
      .sort((a: any, b: any) => (b.stats.goal ?? 0) - (a.stats.goal ?? 0));

    if (playerRows.length === 0) return;

    if (y > 680) { doc.addPage(); y = 40; }

    y = sectionTitle(`${teamName.toUpperCase()}  —  STATISTIKA IGRAČA`, y, rgb);

    // Header row with column titles
    y = drawRow(
      playerStatCols.map((c) => ({ text: c.label, width: c.width, bold: true, color: "#ffffff" })),
      y,
      `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
    );

    // Legend subtitle (small text explaining abbreviations)
    doc.fill("#888888").font("Helvetica").fontSize(6.5)
      .text(
        "G/Šut = Golovi/Šutevi  |  Obr = Odbrane  |  Ast = Asistencije  |  Izg = Izgubljene lopte  |  Blk = Blokade  |  Žk = Žuti karton  |  2m = 2 minute  |  Ck = Crveni karton",
        margin, y + 1, { width: contentW }
      );
    y += 12;

    playerRows.forEach((row: any, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8f8fc";
      const goals = row.stats.goal ?? 0;
      const shots = (row.stats.shot ?? 0) + goals;
      y = drawRow(
        playerStatCols.map((c) => {
          if (c.key === "number") return { text: String(row.player.number), width: c.width, bold: true };
          if (c.key === "name") return { text: row.player.name, width: c.width };
          if (c.key === "position") return { text: row.player.position, width: c.width, color: "#666666" };
          if (c.key === "g_sh") {
            const val = shots > 0 ? `${goals}/${shots}` : (goals > 0 ? `${goals}/—` : "—");
            return { text: val, width: c.width, bold: goals > 0, color: goals > 0 ? "#111111" : "#aaaaaa" };
          }
          const v = row.stats[c.key] ?? 0;
          return { text: v > 0 ? String(v) : "—", width: c.width, color: v > 0 ? "#111111" : "#cccccc" };
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
