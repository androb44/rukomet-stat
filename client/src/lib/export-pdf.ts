import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Team, Player, Match, MatchEvent } from "@shared/schema";

interface MatchWithTeams extends Match {
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
}

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

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [60, 60, 60];
}

function formatMinute(seconds: number): string {
  return `${Math.floor(seconds / 60)}'`;
}

function getPlayerStats(
  events: MatchEvent[],
  players: Player[],
  teamId: number
): { player: Player; stats: Record<string, number> }[] {
  return players
    .map((player) => {
      const playerEvents = events.filter(
        (e) => e.teamId === teamId && e.playerId === player.id
      );
      const stats: Record<string, number> = {};
      for (const key of Object.keys(EVENT_LABELS)) {
        stats[key] = playerEvents.filter((e) => e.type === key).length;
      }
      stats.total = playerEvents.length;
      return { player, stats };
    })
    .filter((p) => p.stats.total > 0)
    .sort((a, b) => b.stats.total - a.stats.total);
}

function getTeamStats(events: MatchEvent[], teamId: number): Record<string, number> {
  const teamEvents = events.filter((e) => e.teamId === teamId);
  const stats: Record<string, number> = {};
  for (const key of Object.keys(EVENT_LABELS)) {
    stats[key] = teamEvents.filter((e) => e.type === key).length;
  }
  return stats;
}

export function exportMatchPdf(
  match: MatchWithTeams,
  homePlayers: Player[],
  awayPlayers: Player[]
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 0;

  const homeRgb = hexToRgb(match.homeTeam.color);
  const awayRgb = hexToRgb(match.awayTeam.color);

  // ── HEADER BANNER ──────────────────────────────────────────────────
  doc.setFillColor(20, 20, 30);
  doc.rect(0, 0, pageW, 44, "F");

  // Home team block
  doc.setFillColor(...homeRgb);
  doc.roundedRect(margin, 6, 52, 32, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(match.homeTeam.shortName, margin + 26, 20, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(match.homeTeam.name, margin + 26, 28, { align: "center", maxWidth: 48 });

  // Away team block
  doc.setFillColor(...awayRgb);
  doc.roundedRect(pageW - margin - 52, 6, 52, 32, 3, 3, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(match.awayTeam.shortName, pageW - margin - 26, 20, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(match.awayTeam.name, pageW - margin - 26, 28, { align: "center", maxWidth: 48 });

  // Score
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(`${match.homeScore ?? 0}  :  ${match.awayScore ?? 0}`, pageW / 2, 25, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const statusLabel =
    match.status === "finished" ? "FINAL" : match.status === "in_progress" ? "LIVE" : "SCHEDULED";
  doc.text(statusLabel, pageW / 2, 32, { align: "center" });

  // Match info below header
  y = 50;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const dateStr = format(new Date(match.date), "EEEE, d MMMM yyyy • HH:mm");
  doc.text(`📅  ${dateStr}`, pageW / 2, y, { align: "center" });
  y += 5;
  if (match.location) {
    doc.text(`📍  ${match.location}`, pageW / 2, y, { align: "center" });
    y += 5;
  }

  // Title
  y += 4;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 30);
  doc.text("MATCH REPORT", pageW / 2, y, { align: "center" });
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── TEAM STATS SUMMARY ──────────────────────────────────────────────
  const statKeys = ["goal", "shot", "save", "assist", "turnover", "block", "yellow_card", "2min", "red_card"];
  const homeStats = getTeamStats(match.events, match.homeTeam.id);
  const awayStats = getTeamStats(match.events, match.awayTeam.id);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 30);
  doc.text("TEAM STATISTICS", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[match.homeTeam.name, "Event", match.awayTeam.name]],
    body: statKeys
      .filter((k) => (homeStats[k] || 0) + (awayStats[k] || 0) > 0)
      .map((k) => [
        String(homeStats[k] || 0),
        EVENT_LABELS[k],
        String(awayStats[k] || 0),
      ]),
    headStyles: {
      fillColor: [20, 20, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", textColor: homeRgb },
      1: { halign: "center", textColor: [60, 60, 60] },
      2: { halign: "center", fontStyle: "bold", textColor: awayRgb },
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1,
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── PLAYER STATS – HOME TEAM ────────────────────────────────────────
  const homePlayerStats = getPlayerStats(match.events, homePlayers, match.homeTeam.id);

  if (homePlayerStats.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    doc.text(`${match.homeTeam.name.toUpperCase()} — PLAYER STATISTICS`, margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Player", "Pos", "G", "Sh", "Sv", "As", "To", "Bl", "Yc", "2m", "Rc"]],
      body: homePlayerStats.map(({ player, stats }) => [
        player.number,
        player.name,
        player.position,
        stats.goal || 0,
        stats.shot || 0,
        stats.save || 0,
        stats.assist || 0,
        stats.turnover || 0,
        stats.block || 0,
        stats.yellow_card || 0,
        stats["2min"] || 0,
        stats.red_card || 0,
      ]),
      headStyles: {
        fillColor: homeRgb,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "left", cellWidth: 40 },
        2: { halign: "center", cellWidth: 10 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        8: { halign: "center" },
        9: { halign: "center" },
        10: { halign: "center" },
        11: { halign: "center" },
      },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.1,
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── PLAYER STATS – AWAY TEAM ────────────────────────────────────────
  const awayPlayerStats = getPlayerStats(match.events, awayPlayers, match.awayTeam.id);

  if (awayPlayerStats.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 14;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    doc.text(`${match.awayTeam.name.toUpperCase()} — PLAYER STATISTICS`, margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Player", "Pos", "G", "Sh", "Sv", "As", "To", "Bl", "Yc", "2m", "Rc"]],
      body: awayPlayerStats.map(({ player, stats }) => [
        player.number,
        player.name,
        player.position,
        stats.goal || 0,
        stats.shot || 0,
        stats.save || 0,
        stats.assist || 0,
        stats.turnover || 0,
        stats.block || 0,
        stats.yellow_card || 0,
        stats["2min"] || 0,
        stats.red_card || 0,
      ]),
      headStyles: {
        fillColor: awayRgb,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "left", cellWidth: 40 },
        2: { halign: "center", cellWidth: 10 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        8: { halign: "center" },
        9: { halign: "center" },
        10: { halign: "center" },
        11: { halign: "center" },
      },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.1,
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── EVENT LOG ───────────────────────────────────────────────────────
  if (match.events && match.events.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 14;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    doc.text("MATCH EVENT LOG", margin, y);
    y += 4;

    const allPlayers = [...homePlayers, ...awayPlayers];
    const sortedEvents = [...match.events].sort((a, b) => a.time - b.time);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Min", "Event", "Player", "Team"]],
      body: sortedEvents.map((event) => {
        const player = allPlayers.find((p) => p.id === event.playerId);
        const team =
          event.teamId === match.homeTeam.id ? match.homeTeam : match.awayTeam;
        return [
          formatMinute(event.time),
          EVENT_LABELS[event.type] ?? event.type,
          player ? `#${player.number} ${player.name}` : "—",
          team.name,
        ];
      }),
      headStyles: {
        fillColor: [20, 20, 30],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { cellWidth: 36 },
        2: { cellWidth: 50 },
        3: {},
      },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.1,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const rowIndex = data.row.index;
          const event = sortedEvents[rowIndex];
          if (event) {
            const rgb =
              event.teamId === match.homeTeam.id ? homeRgb : awayRgb;
            data.cell.styles.textColor = rgb;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  }

  // ── FOOTER ──────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(160, 160, 160);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Handball Stats Tracker  •  Generated ${format(new Date(), "d MMM yyyy HH:mm")}  •  Page ${i}/${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" }
    );
  }

  // ── SAVE ────────────────────────────────────────────────────────────
  const filename = `Match_${match.homeTeam.shortName}_vs_${match.awayTeam.shortName}_${format(new Date(match.date), "yyyyMMdd")}.pdf`;
  doc.save(filename);
}
