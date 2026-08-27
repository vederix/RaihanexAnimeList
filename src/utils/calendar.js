/**
 * Utility untuk membuat tautan Google Calendar dan mengunduh file .ics (iCalendar)
 * untuk pengingat jadwal rilis anime.
 */

// Format tanggal ke format iCalendar UTC: YYYYMMDDTHHmmssZ
function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Menghasilkan link template Google Calendar
 */
export function generateGoogleCalendarUrl({
  title,
  episode,
  airingAt,
  durationMinutes = 25,
}) {
  const startDate = new Date(airingAt * 1000);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const startUtc = formatIcsDate(startDate);
  const endUtc = formatIcsDate(endDate);

  const eventTitle = `Rilis Anime: ${title} - Episode ${episode}`;
  const details = `Episode ${episode} dari ${title} dijadwalkan tayang sekarang!\n\nLihat detail selengkapnya di RAIHANEX.`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle
  )}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(
    details
  )}&location=RAIHANEX%20Anime%20Tracker`;
}

/**
 * Mengunduh file .ics standar yang kompatibel dengan Apple Calendar, Outlook, & Android
 */
export function downloadIcsFile({
  title,
  episode,
  airingAt,
  durationMinutes = 25,
}) {
  const startDate = new Date(airingAt * 1000);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const startUtc = formatIcsDate(startDate);
  const endUtc = formatIcsDate(endDate);
  const nowUtc = formatIcsDate(new Date());

  const eventTitle = `Rilis: ${title} Ep ${episode}`;
  const details = `Episode ${episode} dari ${title} tayang sekarang. Pantau watchlist kamu di RAIHANEX!`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RAIHANEX//Anime Schedule Reminder//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:raihanex-${airingAt}-${Math.random().toString(36).substring(2, 9)}@raihanex.local`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${eventTitle}`,
    `DESCRIPTION:${details}`,
    "LOCATION:RAIHANEX Anime List",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Pengingat: ${eventTitle} tayang 15 menit lagi!`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${title.replace(/[^a-zA-Z0-9]/g, "_")}_Ep${episode}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
