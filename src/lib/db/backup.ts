import { db } from "./db";
import type { LigneBudget, Mouvement } from "./types";

export interface SauvegardeComplete {
  version: 1;
  exporteLe: string;
  lignesBudget: LigneBudget[];
  mouvements: Mouvement[];
}

export async function exporterSauvegarde(): Promise<SauvegardeComplete> {
  const [lignesBudget, mouvements] = await Promise.all([
    db.lignesBudget.toArray(),
    db.mouvements.toArray(),
  ]);
  return {
    version: 1,
    exporteLe: new Date().toISOString(),
    lignesBudget,
    mouvements,
  };
}

function estSauvegardeValide(data: unknown): data is SauvegardeComplete {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.lignesBudget) && Array.isArray(d.mouvements);
}

/** Remplace intégralement les données locales par celles du fichier importé. */
export async function importerSauvegarde(data: unknown): Promise<{ lignes: number; mouvements: number }> {
  if (!estSauvegardeValide(data)) {
    throw new Error("Fichier de sauvegarde invalide : structure inattendue.");
  }
  await db.transaction("rw", db.lignesBudget, db.mouvements, async () => {
    await db.lignesBudget.clear();
    await db.mouvements.clear();
    await db.lignesBudget.bulkAdd(data.lignesBudget);
    await db.mouvements.bulkAdd(data.mouvements);
  });
  return { lignes: data.lignesBudget.length, mouvements: data.mouvements.length };
}
