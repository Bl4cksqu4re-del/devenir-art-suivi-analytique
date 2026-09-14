<script lang="ts">
  import { db } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { agregerParCategorie, agregerParPoste, agregerParGroupe, agreger, estConfirme } from "../db/aggregate";
  import { formatMontant, formatPct, formatDate, statutSeuil } from "../util/format";
  import { naviguer } from "../util/router.svelte";
  import { afficherToast } from "../util/toast.svelte";

  const lignes = useLiveQuery(
    () => db.lignesBudget.where("nature").equals("produit").toArray(),
    [],
  );
  const mouvementsRecettes = useLiveQuery(
    () => db.mouvements.where("nature").equals("produit").toArray(),
    [],
  );

  let categories = $derived(agregerParCategorie(lignes.value, mouvementsRecettes.value));
  let postes = $derived(agregerParPoste(categories).sort((a, b) => a.poste.localeCompare(b.poste, "fr")));
  let groupes = $derived(agregerParGroupe(categories));
  let global = $derived(agreger(categories.reduce((s, c) => s + c.prevu, 0), categories.reduce((s, c) => s + c.realise, 0)));

  function categoriesSansGroupe(poste: string) {
    return categories
      .filter((c) => c.poste === poste && !c.groupe)
      .sort((a, b) => a.categorie.localeCompare(b.categorie, "fr"));
  }

  function groupesDuPoste(poste: string) {
    return groupes.filter((g) => g.poste === poste).sort((a, b) => a.groupe.localeCompare(b.groupe, "fr"));
  }

  function categoriesDuGroupe(poste: string, groupe: string) {
    return categories
      .filter((c) => c.poste === poste && c.groupe === groupe)
      .sort((a, b) => a.categorie.localeCompare(b.categorie, "fr"));
  }

  let filtreCategorie = $state("");
  let filtreDebut = $state("");
  let filtreFin = $state("");

  let toutesCategories = $derived(
    [...new Set(lignes.value.map((l) => l.categorie))].sort((a, b) => a.localeCompare(b, "fr")),
  );

  let mouvementsFiltres = $derived(
    mouvementsRecettes.value
      .filter((m) => !filtreCategorie || m.categorie === filtreCategorie)
      .filter((m) => !filtreDebut || m.date >= filtreDebut)
      .filter((m) => !filtreFin || m.date <= filtreFin)
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  async function supprimer(id: string) {
    if (!confirm("Supprimer ce mouvement ?")) return;
    await db.mouvements.delete(id);
    afficherToast("Mouvement supprimé");
  }
</script>

<h1>Recettes</h1>

<section class="carte resume-global">
  <span>Prévisionnel <strong class="chiffre">{formatMontant(global.prevu, false)}</strong></span>
  <span>Réalisé <strong class="chiffre">{formatMontant(global.realise, false)}</strong></span>
  <span>Écart <strong class="chiffre">{formatMontant(global.ecart, false)}</strong></span>
</section>

<section class="carte">
  <h2>Répartition par poste et catégorie</h2>
  {#if postes.length === 0}
    <p>Aucune recette dans la référence budgétaire chargée. Importez un fichier contenant un onglet "produits" depuis Paramètres, ou créez une catégorie de recette depuis la Saisie.</p>
  {/if}
  <table>
    <thead>
      <tr>
        <th>Poste / Catégorie</th>
        <th class="montant">Prévisionnel</th>
        <th class="montant">Réalisé</th>
        <th class="montant">Écart</th>
        <th class="montant">%</th>
      </tr>
    </thead>
    <tbody>
      {#each postes as p (p.poste)}
        {@const statutP = statutSeuil(p.pct)}
        <tr class="ligne-poste">
          <td><strong>{p.poste}</strong></td>
          <td class="montant chiffre">{formatMontant(p.prevu, false)}</td>
          <td class="montant chiffre">{formatMontant(p.realise, false)}</td>
          <td class="montant chiffre">{formatMontant(p.ecart, false)}</td>
          <td class="montant chiffre statut-{statutP}">{formatPct(p.pct)}</td>
        </tr>
        {#each groupesDuPoste(p.poste) as g (g.groupe)}
          {@const statutG = statutSeuil(g.pct)}
          <tr class="ligne-groupe">
            <td class="indent-1"><em>{g.groupe}</em></td>
            <td class="montant chiffre">{formatMontant(g.prevu, false)}</td>
            <td class="montant chiffre">{formatMontant(g.realise, false)}</td>
            <td class="montant chiffre">{formatMontant(g.ecart, false)}</td>
            <td class="montant chiffre statut-{statutG}">{formatPct(g.pct)}</td>
          </tr>
          {#each categoriesDuGroupe(p.poste, g.groupe) as c (c.categorie)}
            {@const statutC = statutSeuil(c.pct)}
            <tr class="ligne-categorie">
              <td class="indent-2">{c.categorie}</td>
              <td class="montant chiffre">{formatMontant(c.prevu, false)}</td>
              <td class="montant chiffre">{formatMontant(c.realise, false)}</td>
              <td class="montant chiffre">{formatMontant(c.ecart, false)}</td>
              <td class="montant chiffre statut-{statutC}"><span class="pastille statut-{statutC}"></span> {formatPct(c.pct)}</td>
            </tr>
          {/each}
        {/each}
        {#each categoriesSansGroupe(p.poste) as c (c.categorie)}
          {@const statutC = statutSeuil(c.pct)}
          <tr class="ligne-categorie">
            <td class="indent-1">{c.categorie}</td>
            <td class="montant chiffre">{formatMontant(c.prevu, false)}</td>
            <td class="montant chiffre">{formatMontant(c.realise, false)}</td>
            <td class="montant chiffre">{formatMontant(c.ecart, false)}</td>
            <td class="montant chiffre statut-{statutC}"><span class="pastille statut-{statutC}"></span> {formatPct(c.pct)}</td>
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</section>

<section class="carte">
  <h2>Mouvements</h2>
  <div class="filtres">
    <div class="champ">
      <label for="r-cat">Catégorie</label>
      <select id="r-cat" bind:value={filtreCategorie}>
        <option value="">Toutes</option>
        {#each toutesCategories as c}
          <option value={c}>{c}</option>
        {/each}
      </select>
    </div>
    <div class="champ">
      <label for="r-debut">Depuis</label>
      <input id="r-debut" type="date" bind:value={filtreDebut} />
    </div>
    <div class="champ">
      <label for="r-fin">Jusqu'à</label>
      <input id="r-fin" type="date" bind:value={filtreFin} />
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Poste</th>
        <th>Catégorie</th>
        <th>Axe concerné</th>
        <th>Description</th>
        <th class="montant">Montant</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each mouvementsFiltres as m (m.id)}
        <tr class:ligne-a-confirmer={!estConfirme(m)}>
          <td>{formatDate(m.date)}</td>
          <td>{m.poste}</td>
          <td>{m.categorie}</td>
          <td>{m.axe ?? "—"}</td>
          <td>
            {m.description ?? ""}
            {#if !estConfirme(m)}<span class="badge-a-confirmer">à confirmer</span>{/if}
          </td>
          <td class="montant chiffre">{formatMontant(m.montant)}</td>
          <td class="actions">
            <button class="btn btn-discret btn-petit" onclick={() => naviguer({ nom: "journal" })}>Modifier</button>
            <button class="btn btn-discret btn-petit" onclick={() => supprimer(m.id)}>Supprimer</button>
          </td>
        </tr>
      {:else}
        <tr><td colspan="7">Aucun mouvement pour ces filtres.</td></tr>
      {/each}
    </tbody>
  </table>
  <p class="aide">Pour modifier date, montant ou catégorie d'un mouvement, direction le Journal.</p>
</section>

<style>
  .resume-global {
    display: flex;
    gap: var(--espace-5);
    margin-bottom: var(--espace-4);
    font-size: 0.92rem;
  }
  section.carte {
    margin-bottom: var(--espace-5);
    overflow-x: auto;
  }
  .ligne-poste td {
    background: var(--fond-releve);
  }
  .ligne-groupe td {
    background: color-mix(in srgb, var(--fond-releve) 55%, #fff);
    color: var(--encre-att);
  }
  .indent-1 {
    padding-left: var(--espace-5);
  }
  .indent-2 {
    padding-left: calc(var(--espace-5) + var(--espace-4));
  }
  .filtres {
    display: flex;
    flex-wrap: wrap;
    gap: var(--espace-3);
    margin-bottom: var(--espace-3);
  }
  .filtres .champ {
    min-width: 160px;
    margin-bottom: 0;
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
  .actions {
    display: flex;
    gap: var(--espace-1);
    white-space: nowrap;
  }
  .btn-petit {
    padding: 6px 10px;
    font-size: 0.82rem;
  }
  .aide {
    margin: var(--espace-2) 0 0 0;
    font-size: 0.8rem;
    color: var(--encre-att);
  }
</style>
