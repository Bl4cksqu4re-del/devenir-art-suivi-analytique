<script lang="ts">
  import { db } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { formatMontant, formatDate } from "../util/format";
  import { afficherToast } from "../util/toast.svelte";
  import { mouvementsVersCsv, telechargerFichier } from "../util/csv";
  import { estConfirme, estProduit } from "../db/aggregate";
  import { AXES_ORDRE } from "../db/types";
  import type { Mouvement, Nature } from "../db/types";
  import SelecteurCategorie from "../components/SelecteurCategorie.svelte";

  const mouvements = useLiveQuery(() => db.mouvements.toArray(), []);
  const lignes = useLiveQuery(() => db.lignesBudget.toArray(), []);

  let annee = $derived(lignes.value.reduce((max, l) => Math.max(max, l.annee), new Date().getFullYear()));

  let recherche = $state("");
  let filtreNature = $state<"" | Nature>("");
  let filtreAxe = $state("");
  let filtrePoste = $state("");
  let filtreCategorie = $state("");
  let filtreDebut = $state("");
  let filtreFin = $state("");
  let filtreStatut = $state<"" | "confirme" | "aConfirmer">("");

  let axesDisponibles = $derived(AXES_ORDRE.filter((a) => lignes.value.some((l) => l.axe === a)));
  let postesDisponibles = $derived(
    [
      ...new Set(
        lignes.value
          .filter((l) => !filtreNature || (l.nature ?? "charge") === filtreNature)
          .filter((l) => !filtreAxe || l.axe === filtreAxe)
          .map((l) => l.poste),
      ),
    ].sort(),
  );
  let categoriesDisponibles = $derived(
    [
      ...new Set(
        lignes.value
          .filter((l) => !filtreNature || (l.nature ?? "charge") === filtreNature)
          .filter((l) => !filtreAxe || l.axe === filtreAxe)
          .filter((l) => !filtrePoste || l.poste === filtrePoste)
          .map((l) => l.categorie),
      ),
    ].sort(),
  );

  let mouvementsFiltres = $derived(
    mouvements.value
      .filter((m) => !filtreNature || (m.nature ?? "charge") === filtreNature)
      .filter((m) => !filtreAxe || m.axe === filtreAxe)
      .filter((m) => !filtrePoste || m.poste === filtrePoste)
      .filter((m) => !filtreCategorie || m.categorie === filtreCategorie)
      .filter((m) => !filtreDebut || m.date >= filtreDebut)
      .filter((m) => !filtreFin || m.date <= filtreFin)
      .filter((m) => {
        if (filtreStatut === "confirme") return estConfirme(m);
        if (filtreStatut === "aConfirmer") return !estConfirme(m);
        return true;
      })
      .filter((m) => {
        if (!recherche.trim()) return true;
        const q = recherche.toLowerCase();
        return (
          m.description?.toLowerCase().includes(q) ||
          m.categorie.toLowerCase().includes(q) ||
          m.poste.toLowerCase().includes(q) ||
          (m.axe ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.creeLe.localeCompare(a.creeLe)),
  );

  let totalDepenses = $derived(
    mouvementsFiltres.filter(estConfirme).filter((m) => !estProduit(m)).reduce((s, m) => s + m.montant, 0),
  );
  let totalRecettes = $derived(
    mouvementsFiltres.filter(estConfirme).filter(estProduit).reduce((s, m) => s + m.montant, 0),
  );
  let nbAConfirmer = $derived(mouvementsFiltres.filter((m) => !estConfirme(m)).length);

  let idEnEdition = $state<string | null>(null);
  let editionEtaitAConfirmer = $state(false);
  let editionNature = $state<Nature>("charge");
  let editionAxe = $state<string | null>(null);
  let editionPoste = $state("");
  let editionCategorie = $state("");
  let editionDate = $state("");
  let editionMontant = $state("");
  let editionDescription = $state("");

  function commencerEdition(m: Mouvement) {
    idEnEdition = m.id;
    editionEtaitAConfirmer = !estConfirme(m);
    editionNature = m.nature ?? "charge";
    editionAxe = m.axe;
    editionPoste = m.poste;
    editionCategorie = m.categorie;
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
    if (!editionPoste || !editionCategorie) {
      afficherToast("Choisissez un poste et une catégorie");
      return;
    }
    await db.mouvements.update(idEnEdition, {
      nature: editionNature,
      axe: editionAxe,
      poste: editionPoste,
      categorie: editionCategorie,
      date: editionDate,
      montant,
      description: editionDescription.trim() || undefined,
      confirme: true,
    });
    afficherToast(editionEtaitAConfirmer ? "Échéance confirmée" : "Mouvement modifié");
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
      <label for="j-nature">Type</label>
      <select id="j-nature" bind:value={filtreNature}>
        <option value="">Tous</option>
        <option value="charge">Dépenses</option>
        <option value="produit">Recettes</option>
      </select>
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
    <div class="champ">
      <label for="j-statut">Statut</label>
      <select id="j-statut" bind:value={filtreStatut}>
        <option value="">Tous</option>
        <option value="confirme">Confirmés</option>
        <option value="aConfirmer">À confirmer</option>
      </select>
    </div>
  </div>
  <div class="resume">
    <span>
      {mouvementsFiltres.length} mouvement(s) — dépenses confirmées <strong class="chiffre">{formatMontant(totalDepenses)}</strong>
      · recettes confirmées <strong class="chiffre">{formatMontant(totalRecettes)}</strong>
      {#if nbAConfirmer > 0}<span class="statut-alerte"> · {nbAConfirmer} à confirmer</span>{/if}
    </span>
    <button class="btn" onclick={exporterCsv}>Exporter en CSV</button>
  </div>
</section>

<section class="carte">
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
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
            <td colspan="8">
              <div class="edition-panneau">
                <SelecteurCategorie
                  lignes={lignes.value}
                  {annee}
                  bind:nature={editionNature}
                  bind:axe={editionAxe}
                  bind:poste={editionPoste}
                  bind:categorie={editionCategorie}
                />
                <div class="edition-champs">
                  <div class="champ">
                    <label for="e-date">Date</label>
                    <input id="e-date" type="date" bind:value={editionDate} />
                  </div>
                  <div class="champ">
                    <label for="e-montant">Montant</label>
                    <input id="e-montant" type="text" inputmode="decimal" bind:value={editionMontant} />
                  </div>
                  <div class="champ champ-large">
                    <label for="e-description">Description</label>
                    <input id="e-description" type="text" bind:value={editionDescription} />
                  </div>
                </div>
                <div class="edition-actions">
                  <button class="btn btn-primaire" onclick={validerEdition}>
                    {editionEtaitAConfirmer ? "Confirmer" : "Enregistrer"}
                  </button>
                  <button class="btn btn-discret" onclick={annulerEdition}>Annuler</button>
                </div>
              </div>
            </td>
          </tr>
        {:else}
          <tr class:ligne-a-confirmer={!estConfirme(m)}>
            <td>{formatDate(m.date)}</td>
            <td class="type-cell" class:type-produit={estProduit(m)}>{estProduit(m) ? "Recette" : "Dépense"}</td>
            <td>{m.axe ?? "—"}</td>
            <td>{m.poste}</td>
            <td>{m.categorie}</td>
            <td>
              {m.description ?? ""}
              {#if !estConfirme(m)}<span class="badge-a-confirmer">à confirmer</span>{/if}
            </td>
            <td class="montant chiffre">{formatMontant(m.montant)}</td>
            <td class="actions">
              {#if estConfirme(m)}
                <button class="btn btn-discret btn-petit" onclick={() => commencerEdition(m)}>Modifier</button>
              {:else}
                <button class="btn btn-primaire btn-petit" onclick={() => commencerEdition(m)}>Confirmer</button>
              {/if}
              <button class="btn btn-discret btn-petit" onclick={() => supprimer(m.id)}>Supprimer</button>
            </td>
          </tr>
        {/if}
      {:else}
        <tr><td colspan="8">Aucun mouvement.</td></tr>
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
    flex-wrap: wrap;
    gap: var(--espace-2);
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
  .type-cell {
    font-size: 0.82rem;
    color: var(--encre-att);
  }
  .type-cell.type-produit {
    color: var(--vert);
    font-weight: 600;
  }
  .ligne-a-confirmer td {
    background: var(--ambre-fond);
  }
  .badge-a-confirmer {
    display: inline-block;
    margin-left: var(--espace-1);
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--ambre);
    color: #fff;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .edition-panneau {
    max-width: 560px;
    padding: var(--espace-3) 0;
  }
  .edition-champs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--espace-3);
  }
  .edition-champs .champ {
    min-width: 140px;
  }
  .edition-champs .champ-large {
    flex: 1 1 220px;
  }
  .edition-actions {
    display: flex;
    gap: var(--espace-2);
    margin-top: var(--espace-2);
  }
</style>
