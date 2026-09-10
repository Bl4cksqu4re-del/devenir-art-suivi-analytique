# devenir·art — Suivi analytique

Application web installable (PWA), **locale-first** (aucun backend, aucun
compte), pour le pilotage budgétaire analytique de l'association
**devenir·art** — comparaison Prévisionnel / Réalisé par action.

Cet outil sert au pilotage interne et ne remplace en rien la comptabilité
officielle de l'association, tenue par un cabinet comptable externe.

**Application en ligne :**
https://bl4cksqu4re-del.github.io/devenir-art-suivi-analytique/

## Pourquoi cette application

Le suivi se faisait jusqu'ici dans un classeur Excel de 13 onglets, un par
action, où les mêmes catégories de dépense (« carburant », « Fournitures
bureau », etc.) réapparaissaient à des lignes différentes selon l'onglet —
source fréquente d'erreurs de saisie. Ici :

- Le plan de postes (60 à 68) et les catégories de dépense de chaque axe sont
  **extraits automatiquement** du classeur Excel par un script (voir plus
  bas), une fois par an.
- La saisie se fait sur un **formulaire unique** : Axe → Poste → Catégorie →
  Date/Montant/Description — une catégorie n'existe qu'à un seul endroit.
- Le Prévisionnel est une donnée de référence figée pour l'année ; le Réalisé,
  l'Écart et les % sont **recalculés à la volée** depuis le détail des
  mouvements saisis — ils ne peuvent donc jamais se désynchroniser du détail,
  contrairement à des totaux figés en formules ligne par ligne.
- Toutes les données (mouvements) vivent dans IndexedDB, **dans le
  navigateur** ; un export/import JSON permet de sauvegarder ou de changer
  d'ordinateur.

## Écrans

1. **Tableau de bord** — KPI (Réalisé total, % du BP consommé, Écart net),
   courbe de consommation cumulée avec Prévisionnel théorique en pointillé,
   histogramme Réalisé/Prévisionnel par axe (clic → détail de l'axe).
2. **Saisie rapide** — Axe → Poste → Catégorie (recherche) → Date → Montant →
   Description, avec rappel du Prévisionnel et du déjà consommé en temps
   réel. Pensé pour aller vite sur mobile.
3. **Détail par action** — répartition Prévisionnel/Réalisé/Écart par poste
   puis catégorie, liste des mouvements de l'axe (filtrable/triable).
4. **Journal** — historique complet, recherche libre, filtres (axe, poste,
   catégorie, période), édition/suppression, export CSV.
5. **Paramètres** — import du budget prévisionnel (`reference-budget.json`),
   vue en lecture seule du BP chargé, export/import de sauvegarde complète.

## Démarrer en local

Prérequis : [Node.js](https://nodejs.org/) 20+.

```bash
npm install
npm run dev
```

Ouvrez l'URL affichée (par défaut `http://localhost:5173`). Au premier
chargement, l'application initialise sa base IndexedDB à partir de
`public/reference-budget.json` (déjà généré pour le budget 2026 fourni).

## Build de production

```bash
npm run build
```

Le résultat est généré dans `dist/` : un site statique autonome (HTML/CSS/JS
+ manifest PWA + service worker), à héberger sur n'importe quel hébergeur
statique (y compris en local, sans serveur applicatif).

Pour prévisualiser le build de production localement :

```bash
npm run preview
```

## Déploiement (GitHub Pages)

Le dépôt est configuré pour se déployer automatiquement sur GitHub Pages à
chaque `push` sur `main`, via `.github/workflows/deploy.yml` (build + publie
le contenu de `dist/`).

**Étape unique à faire manuellement** après le tout premier push : dans le
dépôt GitHub, **Settings → Pages → Build and deployment → Source**, choisir
**« GitHub Actions »** (au lieu de « Deploy from a branch »). Les push
suivants se déploient ensuite sans autre intervention.

Le chemin de base (`base` dans `vite.config.ts`) est fixé sur
`/devenir-art-suivi-analytique/` pour le build de production, car GitHub
Pages sert un dépôt de projet sous `<compte>.github.io/<nom-du-dépôt>/`. En
développement (`npm run dev`), l'application reste servie à la racine. **Si
le dépôt est renommé**, pensez à mettre à jour cette valeur en conséquence.

## Installer comme PWA

Une fois l'application ouverte dans Chrome (en local ou déployée sur un
hébergement HTTPS) :

1. Cliquez sur l'icône d'installation dans la barre d'adresse (ou menu ⋮ →
   « Installer l'application »).
2. L'application s'installe comme une app native, avec son icône, et
   fonctionne **hors-ligne** après le premier chargement (service worker).

Sur mobile (Chrome Android), utilisez le menu ⋮ → « Ajouter à l'écran
d'accueil ».

## Sauvegarder / changer d'ordinateur

Toutes les données vivent dans le navigateur (IndexedDB) : rien n'est
envoyé sur un serveur. Pour transporter vos données :

1. **Paramètres → Sauvegarde complète → Exporter la sauvegarde (JSON)** :
   télécharge un fichier contenant le Prévisionnel *et* tous les mouvements
   saisis.
2. Sur le nouvel ordinateur, ouvrez l'application puis **Paramètres →
   Importer une sauvegarde (JSON)** et sélectionnez ce fichier. Cette
   opération remplace intégralement les données locales.

Le **Journal** permet en complément d'exporter en CSV le détail des
mouvements filtrés (utile pour une analyse externe ponctuelle, sans faire
office de sauvegarde complète).

## Ré-exécuter l'extraction du budget prévisionnel (chaque nouvel exercice)

Le Prévisionnel n'est **jamais codé en dur** dans l'application : il vient
du fichier `public/reference-budget.json`, lui-même généré depuis le
classeur Excel par le script `scripts/extract_reference.py`.

Quand un nouveau classeur budgétaire est prêt pour l'année suivante (même
gabarit — 7 onglets d'action, mêmes colonnes A/C/D — mais nouveaux
montants) :

1. Assurez-vous d'avoir Python 3 avec `openpyxl` :

   ```bash
   py -m pip install openpyxl
   ```

   (remplacez `py` par `python3` selon votre installation)

2. Lancez le script sur le nouveau classeur :

   ```bash
   py scripts/extract_reference.py "chemin/vers/BP_devenir_art_2027.xlsx" --annee 2027 --out public/reference-budget.json
   ```

   - `--annee` peut être omis si le nom de fichier contient déjà l'année
     (ex. `BP_..._2027.xlsx`).
   - Le script **ouvre le classeur en lecture seule et ne le modifie
     jamais** ; il ne fait qu'écrire un nouveau `reference-budget.json`.

3. Rechargez l'application, puis allez dans **Paramètres → Importer / mettre
   à jour le Prévisionnel**, et sélectionnez le fichier régénéré. Le
   Prévisionnel de l'année qu'il contient est remplacé ; **les mouvements
   déjà saisis ne sont jamais touchés**.

4. Si vous préférez repartir d'une base vierge (nouvelle installation),
   remplacez directement `public/reference-budget.json` par le fichier
   régénéré avant de builder l'application : il servira d'amorçage initial
   au premier lancement.

### Comment le script reconnaît une catégorie

Dans chaque onglet, la colonne A porte les libellés, la colonne C le
Prévisionnel. Une ligne « poste comptable » commence par un nombre à deux
chiffres suivi d'un tiret (ex. `60 – Achats`) et sert uniquement de
séparateur. Une ligne « catégorie » (ex. `carburant`) est repérée par une
formule `=SUM(plage)` sur une **plage contiguë** (ex. `=SUM(C11:C18)`) dans
sa cellule Prévisionnel ou Réalisé — cette plage additionne les lignes de
transaction individuelles juste en dessous. Les lignes de regroupement
intermédiaire (ex. « Achats matières & fournitures », qui agrège plusieurs
catégories) ont elles une formule qui additionne des cellules isolées
(`=C10+C19+C36`, sans plage) : elles sont ignorées. Le script a été validé
en comparant le total de chaque axe extrait avec le « TOTAL DES CHARGES »
du classeur d'origine (correspondance exacte sur les 7 axes).

## Choix techniques

- **Vite + Svelte 5 (runes) + TypeScript** — pas de framework serveur, build
  statique.
- **Dexie.js** sur IndexedDB — deux tables : `lignesBudget` (référence,
  figée pour l'année) et `mouvements` (le détail réel). Les agrégats
  (Réalisé, Écart, %) sont calculés à la demande depuis `mouvements`, jamais
  stockés.
- **Chart.js** pour la courbe de tendance ; l'histogramme par axe est en SVG
  fait main (barre Réalisé + repère Prévisionnel).
- **vite-plugin-pwa** pour le manifest et le service worker (cache des
  assets, fonctionnement hors-ligne après le premier chargement).
- Aucune dépendance pour l'export Excel côté navigateur : la bibliothèque
  `xlsx` (SheetJS) porte des vulnérabilités connues non corrigées côté npm ;
  l'export CSV (ouverture native dans Excel) couvre le même besoin sans ce
  risque. L'import du Prévisionnel se fait via `reference-budget.json`
  (généré par le script Python), qui est le mécanisme documenté et
  reproductible chaque année.

## Structure du projet

```
scripts/extract_reference.py   Script d'extraction Excel → JSON (à ré-exécuter chaque année)
public/reference-budget.json   Référence budgétaire courante (Prévisionnel 2026)
src/lib/db/                    Types, Dexie, agrégats, import/export de sauvegarde
src/lib/util/                  Formatage, routeur (hash), liveQuery ↔ runes, CSV, toasts
src/lib/components/            KPI, histogramme par axe, courbe de tendance, toast
src/lib/screens/                Dashboard, Saisie, Detail, Journal, Parametres
```
