// Référence — chargée depuis reference-budget.json, figée pour l'année en usage courant.
export interface LigneBudget {
  id: string;
  annee: number;
  axe: string;
  poste: string;
  // Regroupement intermédiaire optionnel entre poste et catégorie (ex.
  // "Déplacement, voyages" au-dessus de "Salarié·es déplacements"), tel que
  // structuré dans le classeur source — null si la catégorie est un enfant
  // direct du poste.
  groupe: string | null;
  categorie: string;
  prevu: number;
}

// Mouvements — table principale de saisie (le détail réel, jamais désynchronisé des totaux).
export interface Mouvement {
  id: string;
  date: string; // ISO yyyy-mm-dd
  axe: string;
  poste: string;
  categorie: string;
  montant: number; // TTC
  description?: string;
  creeLe: string; // horodatage de création, pour audit
  // false = échéance récurrente générée à l'avance, pas encore confirmée
  // (date/montant à ajuster) — exclue du Réalisé tant qu'elle ne l'est pas.
  // absent ou true = mouvement réel.
  confirme?: boolean;
}

// Forme du fichier produit par scripts/extract_reference.py
export interface ReferenceBudgetFile {
  annee: number;
  [axe: string]: number | { poste: string; groupe?: string | null; categorie: string; prevu: number }[];
}

export const AXES_ORDRE = [
  "Fonctionnement",
  "Commissions",
  "Points Infos",
  "RRAV",
  "Coopération et Visibilité",
  "Navettes de l'art",
  "Représentation",
] as const;

export type Axe = (typeof AXES_ORDRE)[number];
