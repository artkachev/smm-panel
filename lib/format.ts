export const TZ_DEFAULT = "Europe/Moscow";

export function fmtDateTime(v?: string | null, tz = TZ_DEFAULT): string {
  if (!v) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(v));
}

export function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export function relative(v?: string | null): string {
  if (!v) return "никогда";
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000);
  const abs = Math.abs(s);
  const unit = abs < 60 ? [abs, "с"] : abs < 3600 ? [Math.round(abs / 60), "мин"] : abs < 86400 ? [Math.round(abs / 3600), "ч"] : [Math.round(abs / 86400), "дн"];
  return s >= 0 ? `${unit[0]} ${unit[1]} назад` : `через ${unit[0]} ${unit[1]}`;
}

export const ACCESS: Record<string, [string, string]> = {
  ok: ["Работает", "ok"], limited: ["Ручной ввод", "warn"], unavailable: ["Недоступен", "bad"], unchecked: ["Не проверен", "muted"],
};
export const SHOT: Record<string, [string, string]> = {
  ok: ["Сохранён", "ok"], manual: ["Загружен вручную", "ok"], pending: ["Ожидает", "muted"],
  retrying: ["Повтор", "warn"], failed: ["Ошибка", "bad"], unavailable: ["Пост недоступен", "bad"],
};
export const REPORT: Record<string, [string, string]> = {
  complete: ["Полный", "ok"], incomplete: ["Неполный", "warn"], failed: ["Ошибка", "bad"], generating: ["Формируется", "muted"],
};
export const EVENTS: Record<string, [string, string]> = {
  post_detected: ["Обнаружен новый пост", "info"], screenshot_saved: ["Скриншот сохранён", "ok"],
  post_stored: ["Пост добавлен в базу", "info"], monitor_error: ["Ошибка мониторинга", "bad"],
  screenshot_error: ["Ошибка скриншота", "bad"], report_complete: ["Отчёт сформирован", "ok"],
  report_incomplete: ["Отчёт сформирован частично", "warn"], report_failed: ["Ошибка формирования отчёта", "bad"],
  pdf_sent: ["PDF отправлен", "ok"],
};
export const JOB_KIND: Record<string, string> = {
  monitor_source: "Мониторинг", capture_screenshot: "Скриншот", generate_report: "Отчёт", add_post: "Добавление поста",
};
export const PLATFORM: Record<string, string> = { facebook: "Facebook", instagram: "Instagram" };
