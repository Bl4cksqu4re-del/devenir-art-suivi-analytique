<script lang="ts">
  import { db } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { importerReference } from "../db/seed";
  import { exporterSauvegarde, importerSauvegarde } from "../db/backup";
  import { formatMontant } from "../util/format";
  import { telechargerFichier } from "../util/csv";
  import { afficherToast } from "../util/toast.svelte";
  import { AXES_ORDRE, type Nature } from "../db/types";
  import { estCharge, estProduit } from "../db/aggregate";
  import SelecteurCategorie from "../components/SelecteurCategorie.svelte";

  const lignes = useLiveQuery(() => db.lignesBudget.toArray(), []);

  let creationNature = $state<Nature>("charge");
  let creationAxe = $state<string | null>(AXES_ORDRE[0]);
  let creationPoste = $state("");
  let creationCategorie = $state("");

  let annee = $derived(lignes.value.reduce((max, l) => Math.max(max, l.annee), 0));
  let lignesCharges = $derived(lignes.value.filter(estCharge));
  let lignesRecettes = $derived(
    lignes.value
      .filter(estProduit)
      .sort(
        (a, b) =>
          a.poste.localeCompare(b.poste, "fr") ||
          (a.groupe ?? "").localeCompare(b.groupe ?? "", "fr") ||
          a.categorie.localeCompare(b.categorie, "fr"),
      ),
  );
  let totalRecettes = $derived(lignesRecettes.reduce((s, l) => s + l.prevu, 0));
  let axesPresents = $derived(AXES_ORDRE.filter((a) => lignesCharges.some((l) => l.axe === a)));

  function lignesDeLAxe(axe: string) {
    return lignesCharges
      .filter((l) => l.axe === axe)
      .sort(
        (a, b) =>
          a.poste.localeCompare(b.poste, "fr") ||
          (a.groupe ?? "").localeCompare(b.groupe ?? "", "fr") ||
          a.categorie.localeCompare(b.categorie, "fr"),
      );
  }
  function totalAxe(axe: string) {
    return lignesDeLAxe(axe).reduce((s, l) => s + l.prevu, 0);
  }

  let inputRef: HTMLInputElement;
  let inputBackupRef: HTMLInputElement;
  let messageErreur = $state("");

  async function surImportReference(e: Event) {
    messageErreur = "";
    const fichier = (e.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    if (!confirm(`Remplacer le Prévisionnel actuel par le contenu de "${fichier.name}" ? Les mouvements déjà saisis ne sont pas affectés.`)) {
      inputRef.value = "";
      return;
    }
    try {
      const texte = await fichier.text();
      const data = JSON.parse(texte);
      const n = await importerReference(data);
      afficherToast(`Référence importée : ${n} catégories`);
    } catch (err) {
      messageErreur = "Fichier invalide : " + (err instanceof Error ? err.message : String(err));
    } finally {
      inputRef.value = "";
    }
  }

  async function surImportSauvegarde(e: Event) {
    messageErreur = "";
    const fichier = (e.target as HTMLInputElement).files?.[0];
    if (!fichier) return;
    if (!confirm(`Remplacer TOUTES les données locales (référence + mouvements) par le contenu de "${fichier.name}" ? Cette action est irréversible.`)) {
      inputBackupRef.value = "";
      return;
    }
    try {
      const texte = await fichier.text();
      const data = JSON.parse(texte);
      const { lignes: n, mouvements: m } = await importerSauvegarde(data);
      afficherToast(`Sauvegarde restaurée : ${n} lignes de budget, ${m} mouvements`);
    } catch (err) {
      messageErreur = "Fichier invalide : " + (err instanceof Error ? err.message : String(err));
    } finally {
      inputBackupRef.value = "";
    }
  }

  async function exporterBackup() {
    const data = await exporterSauvegarde();
    const date = new Date().toISOString().slice(0, 10);
    telechargerFichier(JSON.stringify(data, null, 2), `devenir-art-sauvegarde-${date}.json`, "application/json");
  }
</script>

<h1>Paramètres — Budget prévisionnel</h1>

<section class="carte">
  <h2>Importer / mettre à jour le Prévisionnel</h2>
  <p>
    Chargez le fichier <code>reference-budget.json</code> généré par le script
    <code>scripts/extract_reference.py</code> à partir du classeur Excel. Le
    Prévisionnel de l'année contenue dans le fichier est remplacé ; les
    mouvements déjà saisis restent intacts.
  </p>
  <input
    bind:this={inputRef}
    type="file"
    accept="application/json"
    onchange={surImportReference}
  />
  {#if messageErreur}<p class="erreur">{messageErreur}</p>{/if}
</section>

<section class="carte">
  <h2>Ajouter une catégorie</h2>
  <p>
    Pour une catégorie qui n'existe pas (encore) dans le classeur source —
    utile en particulier pour détailler les recettes (ex. « Subvention
    DRAC ») dont le classeur ne fournit pour l'instant que le niveau poste.
    Créée avec un Prévisionnel à 0 € (à corriger dans le classeur puis
    réextraire, ou laisser tel quel si elle n'est pas budgétée).
  </p>
  <SelecteurCategorie
    lignes={lignes.value}
    {annee}
    bind:nature={creationNature}
    bind:axe={creationAxe}
    bind:poste={creationPoste}
    bind:categorie={creationCategorie}
  />
</section>

<section class="carte">
  <h2>Sauvegarde complète</h2>
  <p>Exportez ou restaurez l'intégralité des données locales (référence + mouvements) — utile pour changer d'ordinateur ou faire une sauvegarde manuelle.</p>
  <div class="actions-sauvegarde">
    <button class="btn btn-primaire" onclick={exporterBackup}>Exporter la sauvegarde (JSON)</button>
    <label class="btn">
      Importer une sauvegarde (JSON)
      <input bind:this={inputBackupRef} type="file" accept="application/json" onchange={surImportSauvegarde} class="visually-hidden" />
    </label>
  </div>
</section>

<section class="carte">
  <h2>Budget prévisionnel chargé{annee ? ` — ${annee}` : ""}</h2>
  {#if axesPresents.length === 0}
    <p>Aucune référence chargée pour le moment.</p>
  {/if}
  {#each axesPresents as axe}
    <details class="axe-detail">
      <summary>
        <strong>{axe}</strong>
        <span class="chiffre">{formatMontant(totalAxe(axe), false)}</span>
      </summary>
      <table>
        <thead>
          <tr><th>Poste</th><th>Groupe</th><th>Catégorie</th><th class="montant">Prévisionnel</th></tr>
        </thead>
        <tbody>
          {#each lignesDeLAxe(axe) as l (l.id)}
            <tr>
              <td>{l.poste}</td>
              <td class="groupe">{l.groupe ?? "—"}</td>
              <td>{l.categorie}</td>
              <td class="montant chiffre">{formatMontant(l.prevu, false)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </details>
  {/each}

  {#if lignesRecettes.length > 0}
    <details class="axe-detail">
      <summary>
        <strong>Recettes</strong>
        <span class="chiffre">{formatMontant(totalRecettes, false)}</span>
      </summary>
      <table>
        <thead>
          <tr><th>Poste</th><th>Groupe</th><th>Catégorie</th><th class="montant">Prévisionnel</th></tr>
        </thead>
        <tbody>
          {#each lignesRecettes as l (l.id)}
            <tr>
              <td>{l.poste}</td>
              <td class="groupe">{l.groupe ?? "—"}</td>
              <td>{l.categorie}</td>
              <td class="montant chiffre">{formatMontant(l.prevu, false)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </details>
  {/if}
</section>

<style>
  section.carte {
    margin-bottom: var(--espace-5);
  }
  code {
    background: var(--fond-releve);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.9em;
  }
  input[type="file"] {
    margin-top: var(--espace-2);
  }
  td.groupe {
    color: var(--encre-att);
    font-size: 0.85em;
  }
  .actions-sauvegarde {
    display: flex;
    gap: var(--espace-3);
    flex-wrap: wrap;
    margin-top: var(--espace-3);
  }
  .actions-sauvegarde label.btn {
    position: relative;
  }
  .erreur {
    color: var(--rouge);
    font-size: 0.88rem;
  }
  .axe-detail {
    border-top: 1px solid var(--ligne);
    padding: var(--espace-2) 0;
  }
  .axe-detail summary {
    display: flex;
    justify-content: space-between;
    cursor: pointer;
    padding: var(--espace-2) 0;
    list-style: none;
  }
  .axe-detail summary::-webkit-details-marker {
    display: none;
  }
</style>
