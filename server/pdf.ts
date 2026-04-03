import PDFDocument from "pdfkit";
import type { Response } from "express";
import { format } from "date-fns";

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [60, 60, 60];
}

function formatMinute(seconds: number): string {
  return `${Math.floor(seconds / 60)}'`;
}

const EVENT_LABELS: Record<string, string> = {
  goal: "Gol", shot: "Šut", save: "Odbrana", assist: "Asistencija",
  turnover: "Izgubljena", block: "Blokada", yellow_card: "Žuti karton",
  "2min": "2 minute", red_card: "Crveni karton",
};

const ZONE_LABELS: Record<string, string> = {
  left_wing: "Lijevi krilni", left_9m: "Lijevi 9m", center_9m: "Centar 9m",
  right_9m: "Desni 9m", right_wing: "Desni krilni", pivot: "Pivot / 6m",
  penalty_7m: "7m kazneni",
};

const ACTION_LABELS: Record<string, string> = {
  set_play: "Postav. napad", counter: "Kontranapad", fast_break: "Brzi prodor",
  breakthrough: "Proboj", free_throw: "Slobodan bacanj", penalty_7m: "7m kazneni",
};

// Classify each shot into display zones matching IHF format
function shotZoneCategory(event: any): "9m" | "6m" | "wing" | "7m" | "fb" | "brk" | null {
  const at = event.actionType ?? "";
  if (at === "fast_break") return "fb";
  if (at === "breakthrough") return "brk";
  const sz = event.shotZone ?? "";
  if (sz === "left_9m" || sz === "center_9m" || sz === "right_9m") return "9m";
  if (sz === "pivot") return "6m";
  if (sz === "left_wing" || sz === "right_wing") return "wing";
  if (sz === "penalty_7m") return "7m";
  return null;
}

export function generateMatchPdf(match: any, homePlayers: any[], awayPlayers: any[], res: Response) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  const homeRgb = hexToRgb(match.homeTeam.color);
  const awayRgb = hexToRgb(match.awayTeam.color);
  const events: any[] = match.events ?? [];

  const filename = `Match_${match.homeTeam.shortName}_vs_${match.awayTeam.shortName}_${format(new Date(match.date), "yyyyMMdd")}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  doc.pipe(res);

  const pageW = doc.page.width;
  const margin = 36;
  const contentW = pageW - margin * 2;

  // ── HEADER ─────────────────────────────────────────────────────────
  doc.rect(0, 0, pageW, 100).fill("#14141e");

  doc.roundedRect(margin, 12, 118, 64, 5).fill(match.homeTeam.color);
  doc.fill("#ffffff").font("Helvetica-Bold").fontSize(20)
    .text(match.homeTeam.shortName, margin, 26, { width: 118, align: "center" });
  doc.fill("rgba(255,255,255,0.70)").font("Helvetica").fontSize(8)
    .text(match.homeTeam.name, margin, 50, { width: 118, align: "center" });

  doc.roundedRect(pageW - margin - 118, 12, 118, 64, 5).fill(match.awayTeam.color);
  doc.fill("#ffffff").font("Helvetica-Bold").fontSize(20)
    .text(match.awayTeam.shortName, pageW - margin - 118, 26, { width: 118, align: "center" });
  doc.fill("rgba(255,255,255,0.70)").font("Helvetica").fontSize(8)
    .text(match.awayTeam.name, pageW - margin - 118, 50, { width: 118, align: "center" });

  doc.fill("#ffffff").font("Helvetica-Bold").fontSize(32)
    .text(`${match.homeScore ?? 0}  :  ${match.awayScore ?? 0}`, 0, 22, { align: "center", width: pageW });
  const statusLabel = match.status === "finished" ? "FINAL" : match.status === "in_progress" ? "LIVE" : "UPCOMING";
  doc.fill("rgba(255,255,255,0.50)").font("Helvetica").fontSize(7)
    .text(statusLabel, 0, 58, { align: "center", width: pageW });

  let y = 108;
  doc.fill("#555555").font("Helvetica").fontSize(8)
    .text(format(new Date(match.date), "EEEE, d MMMM yyyy  •  HH:mm"), margin, y, { align: "center", width: contentW });
  if (match.location) {
    y += 13;
    doc.text(`Lokacija: ${match.location}`, margin, y, { align: "center", width: contentW });
  }
  y += 18;

  // ── HELPERS ────────────────────────────────────────────────────────
  type Col = { text: string; width: number; bold?: boolean; color?: string; align?: "left" | "center" | "right" };

  const drawRow = (cols: Col[], yPos: number, bg?: string, rowH = 16): number => {
    if (bg) doc.rect(margin, yPos, contentW, rowH).fill(bg);
    let x = margin;
    for (const col of cols) {
      doc.fill(col.color ?? "#222222")
        .font(col.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(7.5)
        .text(col.text, x + 2, yPos + (rowH - 8) / 2 + 1, {
          width: col.width - 4,
          align: col.align ?? "left",
          lineBreak: false,
        });
      x += col.width;
    }
    return yPos + rowH;
  };

  const sectionTitle = (title: string, yPos: number, rgb: [number, number, number] = [20, 20, 30]) => {
    doc.rect(margin, yPos, contentW, 18).fill(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
    doc.fill("#ffffff").font("Helvetica-Bold").fontSize(8)
      .text(title, margin + 6, yPos + 4, { width: contentW - 12, lineBreak: false });
    return yPos + 18;
  };

  // ── COLUMN DEFINITIONS ─────────────────────────────────────────────
  // IHF-style zone columns: 9m | 6m | Krilni | 7m | FB | Proboj
  // Then total G/Šut | % | Odbrane | Asist | Izgub | Blokade | Kazne
  // Total width must equal contentW
  const C = {
    num:  { w: 18, label: "#",       title: "Broj",          align: "center" as const },
    name: { w: 88, label: "Igrač",   title: "Igrač",         align: "left" as const },
    m9:   { w: 40, label: "9m",      title: "9m šutevi",     align: "center" as const },
    m6:   { w: 37, label: "6m",      title: "6m / pivot",    align: "center" as const },
    wing: { w: 37, label: "Kril",    title: "Krilni šutevi", align: "center" as const },
    m7:   { w: 34, label: "7m",      title: "7m kazneni",    align: "center" as const },
    fb:   { w: 34, label: "FB",      title: "Brzi prodor",   align: "center" as const },
    brk:  { w: 37, label: "Proboj",  title: "Proboj",        align: "center" as const },
    tot:  { w: 50, label: "G/Šut",   title: "Ukupno G/Šut",  align: "center" as const },
    pct:  { w: 24, label: "%",       title: "Efikasnost",    align: "center" as const },
    sv:   { w: 20, label: "Obr",     title: "Odbrane (GK)",  align: "center" as const },
    as:   { w: 20, label: "Ast",     title: "Asistencije",   align: "center" as const },
    tf:   { w: 20, label: "Izg",     title: "Izgubljena",    align: "center" as const },
    bl:   { w: 20, label: "Blk",     title: "Blokade",       align: "center" as const },
    pen:  { w: 16, label: "Žk",      title: "Žuti karton",   align: "center" as const },
    two:  { w: 16, label: "2m",      title: "2 minute",      align: "center" as const },
    rc:   { w: 16, label: "Ck",      title: "Crveni karton", align: "center" as const },
  };
  // Verify total: 18+88+40+37+37+34+34+37+50+24+20+20+20+20+16+16+16 = 527... let me recalculate
  // 18+88=106, +40=146, +37=183, +37=220, +34=254, +34=288, +37=325, +50=375, +24=399, +20=419, +20=439, +20=459, +20=479, +16=495, +16=511, +16=527
  // contentW = 515, so I'm 12 over. Let me reduce name by 8, m9 by 2, tot by 2: 88→80, 40→38, 50→48
  // 18+80+38+37+37+34+34+37+48+24+20+20+20+20+16+16+16 = 515 ✓

  // Final widths (verified total = 515):
  const cols = [
    { key: "num",  ...C.num,  w: 18 },
    { key: "name", ...C.name, w: 80 },
    { key: "m9",   ...C.m9,   w: 38 },
    { key: "m6",   ...C.m6,   w: 37 },
    { key: "wing", ...C.wing, w: 37 },
    { key: "m7",   ...C.m7,   w: 34 },
    { key: "fb",   ...C.fb,   w: 34 },
    { key: "brk",  ...C.brk,  w: 37 },
    { key: "tot",  ...C.tot,  w: 48 },
    { key: "pct",  ...C.pct,  w: 24 },
    { key: "sv",   ...C.sv,   w: 20 },
    { key: "as",   ...C.as,   w: 20 },
    { key: "tf",   ...C.tf,   w: 20 },
    { key: "bl",   ...C.bl,   w: 20 },
    { key: "pen",  ...C.pen,  w: 16 },
    { key: "two",  ...C.two,  w: 16 },
    { key: "rc",   ...C.rc,   w: 16 },
  ];

  // Compute shot stats for a list of events (goal + shot events by zone)
  const zoneStats = (evs: any[]) => {
    const shots = evs.filter((e) => e.type === "goal" || e.type === "shot");
    const count = (cat: string) => ({
      goals: shots.filter((e) => e.type === "goal" && shotZoneCategory(e) === cat).length,
      total: shots.filter((e) => shotZoneCategory(e) === cat).length,
    });
    const totGoals = evs.filter((e) => e.type === "goal").length;
    const totShots = shots.length;
    return {
      m9: count("9m"), m6: count("6m"), wing: count("wing"),
      m7: count("7m"), fb: count("fb"), brk: count("brk"),
      totGoals, totShots,
      pct: totShots > 0 ? Math.round((totGoals / totShots) * 100) : 0,
    };
  };

  const gsLabel = (g: number, s: number) => (s === 0 ? (g > 0 ? `${g}/-` : "-") : `${g}/${s}`);

  // ── PLAYER TABLE PER TEAM ──────────────────────────────────────────
  const drawTeamTable = (players: any[], teamId: number, rgb: [number, number, number], teamName: string) => {
    if (y > 650) { doc.addPage(); y = 40; }

    y = sectionTitle(`${teamName.toUpperCase()}`, y, rgb);

    // Group header row (two rows: zone group label + column labels)
    const shotGroupW = cols.slice(2, 8).reduce((s, c) => s + c.w, 0); // 9m..brk
    const afterShotX = margin + cols.slice(0, 8).reduce((s, c) => s + c.w, 0);

    // Row 1: group captions
    const grpBg = `rgb(${Math.min(rgb[0]+40,255)},${Math.min(rgb[1]+40,255)},${Math.min(rgb[2]+40,255)})`;
    doc.rect(margin, y, contentW, 13).fill(grpBg);

    const nameW = cols[0].w + cols[1].w;
    doc.fill("#ffffffcc").font("Helvetica-Bold").fontSize(6.5)
      .text("Igrač", margin + 2, y + 2, { width: nameW, lineBreak: false });
    const zoneStartX = margin + nameW;
    doc.fill("#ffffffcc").font("Helvetica-Bold").fontSize(6.5)
      .text("Golovi / Šutevi  —  po poziciji", zoneStartX + 2, y + 2, { width: shotGroupW - 4, align: "center", lineBreak: false });
    doc.fill("#ffffffcc").font("Helvetica-Bold").fontSize(6.5)
      .text("Ukupno", afterShotX + 2, y + 2, { width: cols[8].w + cols[9].w - 4, align: "center", lineBreak: false });
    doc.fill("#ffffffcc").font("Helvetica-Bold").fontSize(6.5)
      .text("Ostalo", afterShotX + cols[8].w + cols[9].w + 2, y + 2, { width: contentW - (afterShotX - margin) - cols[8].w - cols[9].w - 2, align: "center", lineBreak: false });
    y += 13;

    // Row 2: column labels
    y = drawRow(
      cols.map((c) => ({ text: c.label, width: c.w, bold: true, color: "#ffffff", align: c.align })),
      y,
      `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
      15
    );

    // Collect player rows with stats
    type PlayerRow = {
      player: any;
      zs: ReturnType<typeof zoneStats>;
      sv: number; as_: number; tf: number; bl: number;
      pen: number; two: number; rc: number;
    };

    const teamEvents = events.filter((e) => e.teamId === teamId);

    const playerRows: PlayerRow[] = players
      .map((p) => {
        const pe = teamEvents.filter((e) => e.playerId === p.id);
        if (pe.length === 0) return null;
        return {
          player: p,
          zs: zoneStats(pe),
          sv: pe.filter((e) => e.type === "save").length,
          as_: pe.filter((e) => e.type === "assist").length,
          tf: pe.filter((e) => e.type === "turnover").length,
          bl: pe.filter((e) => e.type === "block").length,
          pen: pe.filter((e) => e.type === "yellow_card").length,
          two: pe.filter((e) => e.type === "2min").length,
          rc: pe.filter((e) => e.type === "red_card").length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.zs.totGoals - a!.zs.totGoals) as PlayerRow[];

    if (playerRows.length === 0) {
      y = drawRow([{ text: "Nema podataka za ovaj tim.", width: contentW, color: "#aaaaaa" }], y, "#fafafa");
      y += 10;
      return;
    }

    playerRows.forEach((row, idx) => {
      if (y > 740) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? "#ffffff" : "#f6f6fb";
      const zs = row.zs;

      const goalColor = (g: number) => g > 0 ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : "#aaaaaa";

      y = drawRow([
        { text: String(row.player.number), width: cols[0].w, bold: true, align: "center" },
        { text: row.player.name, width: cols[1].w },
        { text: gsLabel(zs.m9.goals, zs.m9.total), width: cols[2].w, color: goalColor(zs.m9.goals), bold: zs.m9.goals > 0, align: "center" },
        { text: gsLabel(zs.m6.goals, zs.m6.total), width: cols[3].w, color: goalColor(zs.m6.goals), bold: zs.m6.goals > 0, align: "center" },
        { text: gsLabel(zs.wing.goals, zs.wing.total), width: cols[4].w, color: goalColor(zs.wing.goals), bold: zs.wing.goals > 0, align: "center" },
        { text: gsLabel(zs.m7.goals, zs.m7.total), width: cols[5].w, color: goalColor(zs.m7.goals), bold: zs.m7.goals > 0, align: "center" },
        { text: gsLabel(zs.fb.goals, zs.fb.total), width: cols[6].w, color: goalColor(zs.fb.goals), bold: zs.fb.goals > 0, align: "center" },
        { text: gsLabel(zs.brk.goals, zs.brk.total), width: cols[7].w, color: goalColor(zs.brk.goals), bold: zs.brk.goals > 0, align: "center" },
        { text: `${zs.totGoals}/${zs.totShots}`, width: cols[8].w, bold: true, align: "center", color: zs.totGoals > 0 ? "#111111" : "#aaaaaa" },
        { text: zs.totShots > 0 ? `${zs.pct}%` : "-", width: cols[9].w, align: "center", color: "#555555" },
        { text: row.sv > 0 ? String(row.sv) : "-", width: cols[10].w, align: "center", color: row.sv > 0 ? "#111111" : "#cccccc" },
        { text: row.as_ > 0 ? String(row.as_) : "-", width: cols[11].w, align: "center", color: row.as_ > 0 ? "#111111" : "#cccccc" },
        { text: row.tf > 0 ? String(row.tf) : "-", width: cols[12].w, align: "center", color: row.tf > 0 ? "#111111" : "#cccccc" },
        { text: row.bl > 0 ? String(row.bl) : "-", width: cols[13].w, align: "center", color: row.bl > 0 ? "#111111" : "#cccccc" },
        { text: row.pen > 0 ? String(row.pen) : "-", width: cols[14].w, align: "center", color: row.pen > 0 ? "#cc7700" : "#cccccc" },
        { text: row.two > 0 ? String(row.two) : "-", width: cols[15].w, align: "center", color: row.two > 0 ? "#cc4400" : "#cccccc" },
        { text: row.rc > 0 ? String(row.rc) : "-", width: cols[16].w, align: "center", color: row.rc > 0 ? "#cc0000" : "#cccccc" },
      ], y, bg);
    });

    // TOTALS row
    const totEvs = teamEvents;
    const teamZs = zoneStats(totEvs);
    const teamSv = totEvs.filter((e) => e.type === "save").length;
    const teamAs = totEvs.filter((e) => e.type === "assist").length;
    const teamTf = totEvs.filter((e) => e.type === "turnover").length;
    const teamBl = totEvs.filter((e) => e.type === "block").length;
    const teamPen = totEvs.filter((e) => e.type === "yellow_card").length;
    const teamTwo = totEvs.filter((e) => e.type === "2min").length;
    const teamRc = totEvs.filter((e) => e.type === "red_card").length;

    y = drawRow([
      { text: "", width: cols[0].w },
      { text: "UKUPNO", width: cols[1].w, bold: true, color: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` },
      { text: gsLabel(teamZs.m9.goals, teamZs.m9.total), width: cols[2].w, bold: true, align: "center" },
      { text: gsLabel(teamZs.m6.goals, teamZs.m6.total), width: cols[3].w, bold: true, align: "center" },
      { text: gsLabel(teamZs.wing.goals, teamZs.wing.total), width: cols[4].w, bold: true, align: "center" },
      { text: gsLabel(teamZs.m7.goals, teamZs.m7.total), width: cols[5].w, bold: true, align: "center" },
      { text: gsLabel(teamZs.fb.goals, teamZs.fb.total), width: cols[6].w, bold: true, align: "center" },
      { text: gsLabel(teamZs.brk.goals, teamZs.brk.total), width: cols[7].w, bold: true, align: "center" },
      { text: `${teamZs.totGoals}/${teamZs.totShots}`, width: cols[8].w, bold: true, align: "center" },
      { text: teamZs.totShots > 0 ? `${teamZs.pct}%` : "-", width: cols[9].w, bold: true, align: "center", color: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` },
      { text: teamSv > 0 ? String(teamSv) : "-", width: cols[10].w, bold: true, align: "center" },
      { text: teamAs > 0 ? String(teamAs) : "-", width: cols[11].w, bold: true, align: "center" },
      { text: teamTf > 0 ? String(teamTf) : "-", width: cols[12].w, bold: true, align: "center" },
      { text: teamBl > 0 ? String(teamBl) : "-", width: cols[13].w, bold: true, align: "center" },
      { text: teamPen > 0 ? String(teamPen) : "-", width: cols[14].w, bold: true, align: "center", color: "#cc7700" },
      { text: teamTwo > 0 ? String(teamTwo) : "-", width: cols[15].w, bold: true, align: "center", color: "#cc4400" },
      { text: teamRc > 0 ? String(teamRc) : "-", width: cols[16].w, bold: true, align: "center", color: "#cc0000" },
    ], y, "#eeeef8", 17);

    // Legend line
    y += 3;
    doc.fill("#999999").font("Helvetica").fontSize(6)
      .text(
        "9m = šutevi sa 9m  |  6m = pivot/6m  |  Kril = krilni šutevi  |  7m = kazneni  |  FB = brzi prodor  |  Proboj = proboj  |  Obr = odbrane  |  Ast = asistencije  |  Izg = izgubljena lopta  |  Blk = blokade  |  Žk = žuti karton  |  2m = 2 minute  |  Ck = crveni karton",
        margin, y, { width: contentW }
      );
    y += 14;
  };

  drawTeamTable(homePlayers, match.homeTeam.id, homeRgb, match.homeTeam.name);
  drawTeamTable(awayPlayers, match.awayTeam.id, awayRgb, match.awayTeam.name);

  // ── EVENT LOG ──────────────────────────────────────────────────────
  if (events.length > 0) {
    if (y > 640) { doc.addPage(); y = 40; }

    y = sectionTitle("LOG DOGAĐAJA", y);

    const evColW = { min: 32, type: 96, zone: 118, action: 100, player: 118, team: contentW - 32 - 96 - 118 - 100 - 118 };

    y = drawRow([
      { text: "Min", width: evColW.min, bold: true, color: "#ffffff", align: "center" },
      { text: "Događaj", width: evColW.type, bold: true, color: "#ffffff" },
      { text: "Zona", width: evColW.zone, bold: true, color: "#ffffff" },
      { text: "Akcija", width: evColW.action, bold: true, color: "#ffffff" },
      { text: "Igrač", width: evColW.player, bold: true, color: "#ffffff" },
      { text: "Tim", width: evColW.team, bold: true, color: "#ffffff" },
    ], y, "#14141e", 16);

    const allPlayers = [...homePlayers, ...awayPlayers];
    const sorted = [...events].sort((a, b) => a.time - b.time);

    sorted.forEach((ev, idx) => {
      if (y > 748) { doc.addPage(); y = 40; }
      const player = allPlayers.find((p) => p.id === ev.playerId);
      const isHome = ev.teamId === match.homeTeam.id;
      const tRgb = isHome ? homeRgb : awayRgb;
      const bg = idx % 2 === 0 ? "#ffffff" : "#f6f6fb";

      y = drawRow([
        { text: formatMinute(ev.time), width: evColW.min, align: "center", color: "#555555" },
        { text: EVENT_LABELS[ev.type] ?? ev.type, width: evColW.type, bold: ev.type === "goal" },
        { text: ev.shotZone ? (ZONE_LABELS[ev.shotZone] ?? ev.shotZone) : "—", width: evColW.zone, color: "#555555" },
        { text: ev.actionType ? (ACTION_LABELS[ev.actionType] ?? ev.actionType) : "—", width: evColW.action, color: "#555555" },
        { text: player ? `#${player.number} ${player.name}` : "—", width: evColW.player },
        { text: isHome ? match.homeTeam.name : match.awayTeam.name, width: evColW.team, bold: true, color: `rgb(${tRgb[0]},${tRgb[1]},${tRgb[2]})` },
      ], y, bg);
    });
  }

  // ── FOOTER ──────────────────────────────────────────────────────────
  doc.fill("#bbbbbb").font("Helvetica").fontSize(6.5)
    .text(
      `Handball Stats Tracker  •  Generirano ${format(new Date(), "d. M. yyyy. HH:mm")}`,
      margin, doc.page.height - 22,
      { align: "center", width: contentW, lineBreak: false }
    );

  doc.end();
}
