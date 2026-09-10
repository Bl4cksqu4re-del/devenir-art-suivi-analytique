#!/usr/bin/env python3
"""
Extraction de la référence budgétaire (Prévisionnel) depuis le classeur Excel
de suivi analytique de devenir·art, vers un fichier reference-budget.json
exploitable par l'application web.

Logique :
- Un onglet par axe (Fonctionnement + 6 actions).
- Dans chaque onglet, la colonne A porte les libellés, la colonne C le
  Prévisionnel, la colonne D le Réalisé.
- Une ligne "poste comptable" commence par un nombre à deux chiffres suivi
  d'un tiret (ex. "60 – Achats") : elle sert uniquement de séparateur / total
  de poste, ce n'est jamais une catégorie de saisie.
- Une ligne "catégorie feuille" (ex. "carburant", "Fournitures bureau") est
  identifiable par le fait que sa cellule Prévisionnel OU Réalisé contient une
  formule SUM() sur une PLAGE contiguë (ex. =SUM(C11:C18)) : cette plage
  référence les lignes de transaction individuelles juste en dessous.
  Les lignes intermédiaires de regroupement (ex. "Achats matières &
  fournitures", qui agrège carburant + Fournitures bureau + copies) ont elles
  une formule qui additionne des cellules isolées (=SUM(C10+C19+C36) ou
  =C10+C19+C36, sans ":") : ce ne sont PAS des catégories de saisie, on ne les
  garde donc pas.
- On ne lit jamais les lignes de transaction individuelles elles-mêmes (les
  valeurs brutes en dessous d'une catégorie) : seul le sous-total de la
  catégorie (son Prévisionnel figé pour l'année) nous intéresse.

Le script ne modifie jamais le classeur source (ouverture en lecture seule).

Usage :
    py scripts/extract_reference.py "chemin/vers/BP_....xlsx" [--annee 2026] [--out public/reference-budget.json]

Ré-exécutable chaque année sur un nouveau classeur (même structure de gabarit,
nouveaux montants) : il suffit de repasser le chemin du nouveau fichier.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    print(
        "Le module 'openpyxl' est requis. Installez-le avec : py -m pip install openpyxl",
        file=sys.stderr,
    )
    sys.exit(1)

# Ordre et libellés des 7 axes tels qu'ils doivent apparaitre dans l'app,
# associés au nom exact de l'onglet dans le classeur Excel.
AXES: list[tuple[str, str]] = [
    ("Fonctionnement", "Fonctionnement"),
    ("Commissions", "Commissions"),
    ("Points Infos", "Points Infos"),
    ("RRAV", "RRAV"),
    ("Coopération et Visibilité", "Coopération et Visibilité"),
    ("Navettes de l'art", "navettes de l'art"),
    ("Représentation", "Représentation"),
]

POSTE_RE = re.compile(r"^\s*\d{2}\s*[–‒\-]\s*.+")
# Formule SUM() sur une plage contiguë avec ":" -> catégorie feuille.
LEAF_SUM_RANGE_RE = re.compile(r"^=SUM\([A-Za-z]+\d+:[A-Za-z]+\d+\)\s*$")

STOP_LABELS = {
    "TOTAL DES CHARGES",
    "PART BUDGET GLOBAL",
    "TOTAL GENERAL",
    "TOTAL GÉNÉRAL",
}


def clean_label(value) -> str:
    if value is None:
        return ""
    return str(value).replace("\xa0", " ").strip()


def is_leaf_category(formula_value) -> bool:
    if not isinstance(formula_value, str):
        return False
    return bool(LEAF_SUM_RANGE_RE.match(formula_value.strip()))


# Le poste "63 – Impôts & taxes" ne suit pas le schéma habituel : ses 2
# catégories ("Impôts & taxes sur rémunération", "Autres impôts & taxes")
# sont saisies directement en valeur brute, sans ligne de sous-total SUM(plage)
# au-dessus d'elles (il n'y a jamais de détail de transactions en dessous).
# On les traite donc comme des feuilles même sans formule SUM.
FLAT_LEAF_POSTE_RE = re.compile(r"^\s*63\s*[–‒\-]")


def extract_axis(ws_formulas, ws_values) -> list[dict]:
    lignes: list[dict] = []
    poste_courant: str | None = None

    for row in range(1, ws_formulas.max_row + 1):
        label_raw = ws_formulas.cell(row=row, column=1).value
        label = clean_label(label_raw)
        if not label:
            continue

        upper = label.upper()
        if upper in STOP_LABELS:
            break  # tout ce qui suit (dons en nature, totaux) est hors périmètre

        if POSTE_RE.match(label):
            poste_courant = label
            continue

        if poste_courant is None:
            continue  # lignes d'en-tête avant le premier poste (titre, "CHARGES")

        c_formula = ws_formulas.cell(row=row, column=3).value
        d_formula = ws_formulas.cell(row=row, column=4).value

        is_leaf = is_leaf_category(c_formula) or is_leaf_category(d_formula)
        is_leaf = is_leaf or bool(FLAT_LEAF_POSTE_RE.match(poste_courant))

        if is_leaf:
            prevu_value = ws_values.cell(row=row, column=3).value
            prevu = round(float(prevu_value), 2) if isinstance(prevu_value, (int, float)) else 0.0
            lignes.append({
                "poste": poste_courant,
                "categorie": label,
                "prevu": prevu,
            })

    return lignes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("xlsx_path", help="Chemin vers le classeur Excel source")
    parser.add_argument("--annee", type=int, default=None, help="Année budgétaire (déduite du nom de fichier si absent)")
    parser.add_argument("--out", default="public/reference-budget.json", help="Fichier JSON de sortie")
    args = parser.parse_args()

    xlsx_path = Path(args.xlsx_path)
    if not xlsx_path.exists():
        print(f"Fichier introuvable : {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    annee = args.annee
    if annee is None:
        m = re.search(r"20\d{2}", xlsx_path.stem)
        annee = int(m.group(0)) if m else None
    if annee is None:
        print("Impossible de déduire l'année depuis le nom de fichier : précisez --annee.", file=sys.stderr)
        sys.exit(1)

    print(f"Lecture (lecture seule) de {xlsx_path} ...")
    # data_only=False : on veut les formules pour détecter les catégories feuilles.
    wb_formulas = openpyxl.load_workbook(xlsx_path, data_only=False, read_only=True)
    # data_only=True : on veut les valeurs mises en cache par Excel pour le Prévisionnel.
    wb_values = openpyxl.load_workbook(xlsx_path, data_only=True, read_only=True)

    result: dict = {"annee": annee}
    total_categories = 0

    for axe_label, sheet_name in AXES:
        if sheet_name not in wb_formulas.sheetnames:
            print(f"  ! Onglet '{sheet_name}' introuvable, ignoré.", file=sys.stderr)
            continue
        ws_formulas = wb_formulas[sheet_name]
        ws_values = wb_values[sheet_name]
        lignes = extract_axis(ws_formulas, ws_values)
        result[axe_label] = lignes
        total_categories += len(lignes)
        print(f"  - {axe_label}: {len(lignes)} catégories, prévu total = {sum(l['prevu'] for l in lignes):.2f} EUR")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n{total_categories} catégories extraites -> {out_path}")


if __name__ == "__main__":
    main()
