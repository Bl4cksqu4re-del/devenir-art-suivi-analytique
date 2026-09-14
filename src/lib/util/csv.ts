import type { Mouvement } from "../db/types";

function champCsv(valeur: string | number): string {
  const s = String(valeur);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV point-virgule + BOM UTF-8 : ouverture correcte par défaut dans Excel FR. */
export function mouvementsVersCsv(mouvements: Mouvement[]): string {
  const entetes = ["Date", "Axe", "Poste", "Catégorie", "Montant", "Description", "Statut"];
  const lignes = mouvements.map((m) =>
    [
      m.date,
      m.axe,
      m.poste,
      m.categorie,
      m.montant.toFixed(2).replace(".", ","),
      m.description ?? "",
      m.confirme === false ? "À confirmer" : "Confirmé",
    ]
      .map(champCsv)
      .join(";"),
  );
  return "﻿" + [entetes.join(";"), ...lignes].join("\r\n");
}

export function telechargerFichier(contenu: string | Blob, nomFichier: string, type: string) {
  const blob = typeof contenu === "string" ? new Blob([contenu], { type }) : contenu;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
