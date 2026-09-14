export const MOIS_LABELS = [
  "Janv.",
  "Fév.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
] as const;

/** Date ISO pour un jour donné dans un mois/année, en calant sur le dernier
 * jour du mois si le jour demandé n'existe pas (ex. le 31 en avril -> 30). */
export function dateDansLeMois(annee: number, moisIndex: number, jour: number): string {
  const dernierJour = new Date(annee, moisIndex + 1, 0).getDate();
  const jourValide = Math.min(jour, dernierJour);
  const mm = String(moisIndex + 1).padStart(2, "0");
  const dd = String(jourValide).padStart(2, "0");
  return `${annee}-${mm}-${dd}`;
}

export function parseISO(iso: string): { annee: number; moisIndex: number; jour: number } {
  const [annee, mois, jour] = iso.split("-").map(Number);
  return { annee, moisIndex: mois - 1, jour };
}
