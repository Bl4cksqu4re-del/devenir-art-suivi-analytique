import Dexie, { type Table } from "dexie";
import type { LigneBudget, Mouvement } from "./types";

export class DevenirArtDB extends Dexie {
  lignesBudget!: Table<LigneBudget, string>;
  mouvements!: Table<Mouvement, string>;

  constructor() {
    super("devenir-art-budget");
    this.version(1).stores({
      lignesBudget: "id, annee, axe, poste, categorie, [axe+poste+categorie]",
      mouvements: "id, date, axe, poste, categorie, creeLe",
    });
    // v2 : ajout des recettes (nature charge/produit).
    this.version(2).stores({
      lignesBudget: "id, annee, axe, poste, categorie, nature, [axe+poste+categorie]",
      mouvements: "id, date, axe, poste, categorie, creeLe, nature",
    });
  }
}

export const db = new DevenirArtDB();

export function uid(): string {
  return crypto.randomUUID();
}
