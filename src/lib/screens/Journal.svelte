<script lang="ts">
  import { db } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { formatMontant, formatDate } from "../util/format";
  import { afficherToast } from "../util/toast.svelte";
  import { mouvementsVersCsv, telechargerFichier } from "../util/csv";
  import { AXES_ORDRE } from "../db/types";
  import type { Mouvement } from "../db/types";

  const mouvements = useLiveQuery(() => db.mouvements.toArray(), []);
  const lignes = useLiveQuery(() => db.lignesBudget.toArray(), []);

  let recherche = $state("");
  let filtreAxe = $state("");
  let filtrePoste = $state("");
  let filtreCategorie = $state("");
  let filtreDebut = $state("");
  let filtreFin = $state("");

  let axesDisponibles = $derived(AXES_ORDRE.filter((a) => lignes.value.some((l) => l.axe === a)));
  let postesDisponibles = $derived(
    [...new Set(lignes.value.filter((l) => !filtreAxe || l.axe === filtreAxe).map((l) => l.poste))].sort(),
  );
  let categoriesDisponibles = $derived(
    [
      ...new Set(
        lignes.value
          .filter((l) => !filtreAxe || l.axe === filtreAxe)
          .filter((l) => !filtrePoste || l.poste === filtrePoste)
          .map((l) => l.categorie),
      ),
    ].sort(),
  );

  let mouvementsFiltres = $derived(
    mouvements.value
      .filter((m) => !filtreAxe || m.axe === filtreAxe)
      .filter((m) => !filtrePoste || m.poste === filtrePoste)
      .filter((m) => !filtreCategorie || m.categorie === filtreCategorie)
      .filter((m) => !filtreDebut || m.date >= filtreDebut)
      .filter((m) => !filtreFin || m.date <= filtreFin)
      .filter((m) => {
        if (!recherche.trim()) return true;
        const q = recherche.toLowerCase();
        return (
          m.description?.toLowerCase().includes(q) ||
          m.categorie.toLowerCase().includes(q) ||
          m.poste.toLowerCase().includes(q) ||
          m.axe.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.creeLe.localeCompare(a.creeLe)),
  );

  let total = $derived(mouvementsFiltres.reduce((s, m) => s + m.montant, 0));

  let idEnEdition = $state<string | null>(null);
  let editionDate = $state("");
  let editionMontant = $state("");
  let editionDescription = $state("");

  function commencerEdition(m: Mouvement) {
    idEnEdition = m.id;
    editionDate = m.date;
    editionMontant = String(m.montant).replace(".", ",");
    editionDescription = m.description ?? "";
  }

  function annulerEdition() {
    idEnEdition = null;
  }

  async function validerEdition() {
    if (!idEnEdition) return;
    const montant = Number(editionMontant.replace(",", "."));
    if (Number.isNaN(montant) || montant <= 0) {
      afficherToast("Montant invalide");
      return;
    }
    await db.mouvements.update(idEnEdition, {
      date: editionDate,
      montant,
      description: editionDescription.trim() || undefined,
    });
    afficherToast("Mouvement modifié");
    idEnEdition = null;
  }

  async function supprimer(id: string) {
    if (!confirm("Supprimer ce mouvement ?")) return;
    await db.mouvements.delete(id);
    afficherToast("Mouvement supprimé");
  }

  function exporterCsv() {
    const csv = mouvementsVersCsv(mouvementsFiltres);
    const date = new Date().toISOString().slice(0, 10);
    telechargerFichier(csv, `journal-devenir-art-${date}.csv`, "text/csv;charset=utf-8");
  }
</script>

<h1>Journal des mouvements</h1>

<section class="carte filtres-carte">
  <div class="filtres">
    <div class="champ recherche">
      <label for="j-recherche">Recherche libre</label>
      <input id="j-recherche" type="text" placeholder="Description, catégorie…" bind:value={recherche} />
    </div>
    <div class="champ">
      <label for="j-axe">Axe</label>
      <select id="j-axe" bind:value={filtreAxe}>
        <option value="">Tous</option>
        {#each axesDisponibles as a}<option value={a}>{a}</option>{/each}
      </select>
    </div>
    <div class="champ">
      <label for="j-poste">Poste</label>
      <select id="j-poste" bind:value={filtrePoste}>
        <option value="">Tous</option>
        {#each postesDisponibles as p}<option value={p}>{p}</option>{/each}
      </select>
    </div>
    <div class="champ">
      <label for="j-categorie">Catégorie</label>
      <select id="j-categorie" bind:value={filtreCategorie}>
        <option value="">Toutes</option>
        {#each categoriesDisponibles as c}<option value={c}>{c}</option>{/each}
      </select>
    </div>
    <div class="champ">
      <label for="j-debut">Depuis</label>
      <input id="j-debut" type="date" bind:value={filtreDebut} />
    </div>
    <div class="champ">
      <label for="j-fin">Jusqu'à</label>
      <input id="j-fin" type="date" bind:value={filtreFin} />
    </div>
  </div>
  <div class="resume">
    <span>{mouvementsFiltres.length} mouvement(s) — total <strong class="chiffre">{formatMontant(total)}</strong></span>
    <button class="btn" onclick={exporterCsv}>Exporter en CSV</button>
  </div>
</section>

<section class="carte">
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Axe</th>
        <th>Poste</th>
        <th>Catégorie</th>
        <th>Description</th>
        <th class="montant">Montant</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each mouvementsFiltres as m (m.id)}
        {#if idEnEdition === m.id}
          <tr class="ligne-edition">
            <td><input type="date" bind:value={editionDate} /></td>
            <td>{m.axe}</td>
            <td>{m.poste}</td>
            <td>{m.categorie}</td>
            <td><input type="text" bind:value={editionDescription} /></td>
            <td class="montant"><input type="text" inputmode="decimal" bind:value={editionMontant} /></td>
            <td class="actions">
              <button class="btn btn-primaire btn-petit" onclick={validerEdition}>OK</button>
              <button class="btn btn-discret btn-petit" onclick={annulerEdition}>Annuler</button>
            </td>
          </tr>
        {:else}
          <tr>
            <td>{formatDate(m.date)}</td>
            <td>{m.axe}</td>
            <td>{m.poste}</td>
            <td>{m.categorie}</td>
            <td>{m.description ?? ""}</td>
            <td class="montant chiffre">{formatMontant(m.montant)}</td>
            <td class="actions">
              <button class="btn btn-discret btn-petit" onclick={() => commencerEdition(m)}>Modifier</button>
              <button class="btn btn-discret btn-petit" onclick={() => supprimer(m.id)}>Supprimer</button>
            </td>
          </tr>
        {/if}
      {:else}
        <tr><td colspan="7">Aucun mouvement.</td></tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .filtres-carte {
    margin-bottom: var(--espace-4);
  }
  .filtres {
    display: flex;
    flex-wrap: wrap;
    gap: var(--espace-3);
  }
  .filtres .champ {
    min-width: 160px;
    margin-bottom: 0;
  }
  .filtres .recherche {
    flex: 1 1 240px;
  }
  .resume {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--espace-4);
    padding-top: var(--espace-3);
    border-top: 1px solid var(--ligne);
  }
  section.carte {
    overflow-x: auto;
  }
  .actions {
    display: flex;
    gap: var(--espace-1);
    white-space: nowrap;
  }
  .btn-petit {
    padding: 6px 10px;
    font-size: 0.82rem;
  }
  .ligne-edition input {
    padding: 6px 8px;
    border: 1px solid var(--ligne);
    border-radius: 4px;
    width: 100%;
  }
</style>
