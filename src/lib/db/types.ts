// "charge" (dépense, comptes 60-68) ou "produit" (recette, comptes 70-79).
export type Nature = "charge" | "produit";

// Référence — chargée depuis reference-budget.json, figée pour l'année en usage courant.
export interface LigneBudget {
  id: string;
  annee: number;
  // Absent = "charge" (valeur historique par défaut, avant l'ajout des recettes).
  nature?: Nature;
  // Axe d'action pour une charge (toujours renseigné). Pour une recette,
  // absent/null par défaut (recette générale de l'association) ou renseigné
  // si la recette est fléchée sur une action précise (ex. subvention dédiée).
  axe: string | null;
  poste: string;
  // Regroupement intermédiaire optionnel entre poste et catégorie (ex.
  // "Déplacement, voyages" au-dessus de "Salarié·es déplacements"), tel que
  // structuré dans le classeur source — null si la catégorie est un enfant
  // direct du poste.
  groupe: string | null;
  categorie: string;
  prevu: number;
  // "manuelle" = catégorie créée depuis l'app (pas dans le classeur source) ;
  // préservée telle quelle lors d'un futur ré-import de reference-budget.json.
  // Absent/"classeur" = vient de l'extraction du classeur.
  origine?: "classeur" | "manuelle";
}

// Mouvements — table principale de saisie (le détail réel, jamais désynchronisé des totaux).
export interface Mouvement {
  id: string;
  date: string; // ISO yyyy-mm-dd
  // Absent = "charge" (valeur historique par défaut).
  nature?: Nature;
  axe: string | null;
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
  Recettes?: { poste: string; groupe?: string | null; categorie: string; prevu: number }[];
  [axe: string]: number | { poste: string; groupe?: string | null; categorie: string; prevu: number }[] | undefined;
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

// Postes officiels du plan comptable associatif — liste fixe (pas dérivée
// des catégories existantes) pour pouvoir créer une catégorie même sous un
// poste qui n'a encore aucune ligne (ex. "66 – Charges financières").
export const POSTES_CHARGES = [
  "60 – Achats",
  "61 – Services extérieurs",
  "62 – Autres services extérieurs",
  "63 – Impôts & taxes",
  "64 – Charges de personnel",
  "65 – Autres charges de gestion courante",
  "66 – Charges financières",
  "67 – Charges exceptionnelles",
  "68 – Dotations aux amortissements",
] as const;

export const POSTES_PRODUITS = [
  "70 – Ventes",
  "74 – Subventions",
  "75 – Autres produits de gestion courante",
  "76 – Produits financiers",
  "77 – Produits exceptionnels",
  "78 – Produits d'activités annexes",
  "79 – Transfert de charges",
] as const;
