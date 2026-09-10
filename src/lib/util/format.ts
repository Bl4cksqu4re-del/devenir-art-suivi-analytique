const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurSansDecimales = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatMontant(v: number, decimales = true): string {
  return decimales ? eur.format(v) : eurSansDecimales.format(v);
}

export function formatPct(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return `${Math.round(v)} %`;
}

export function formatDate(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

export function aujourdHuiISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** Seuils de couleur métier : vert (normal), ambre (alerte >85%), rouge (dépassement). */
export function statutSeuil(pct: number): "normal" | "alerte" | "depassement" {
  if (!Number.isFinite(pct) || pct > 100) return "depassement";
  if (pct >= 85) return "alerte";
  return "normal";
}
