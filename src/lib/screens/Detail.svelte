<script lang="ts">
  import { db, uid } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { agregerParCategorie, agregerParPoste, agreger } from "../db/aggregate";
  import { formatMontant, formatPct, formatDate, statutSeuil } from "../util/format";
  import { naviguer } from "../util/router.svelte";
  import { afficherToast } from "../util/toast.svelte";

  let { axe }: { axe: string } = $props();

  const lignes = useLiveQuery(() => db.lignesBudget.where("axe").equals(axe).toArray(), []);
  const mouvementsAxe = useLiveQuery(() => db.mouvements.where("axe").equals(axe).toArray(), []);

  let categories = $derived(agregerParCategorie(lignes.value, mouvementsAxe.value));
  let postes = $derived(agregerParPoste(categories).sort((a, b) => a.poste.localeCompare(b.poste, "fr")));

  function categoriesDuPoste(poste: string) {
    return categories.filter((c) => c.poste === poste).sort((a, b) => a.categorie.localeCompare(b.categorie, "fr"));
  }

  let filtreCategorie = $state("");
  let filtreDebut = $state("");
  let filtreFin = $state("");
  let tri = $state<"date-desc" | "date-asc" | "montant-desc" | "montant-asc">("date-desc");

  let toutesCategories = $derived([...new Set(lignes.value.map((l) => l.categorie))].sort((a, b) => a.localeCompare(b, "fr")));

  let mouvementsFiltres = $derived(
    mouvementsAxe.value
      .filter((m) => !filtreCategorie || m.categorie === filtreCategorie)
      .filter((m) => !filtreDebut || m.date >= filtreDebut)
      .filter((m) => !filtreFin || m.date <= filtreFin)
      .sort((a, b) => {
        switch (tri) {
          case "date-asc":
            return a.date.localeCompare(b.date);
          case "montant-desc":
            return b.montant - a.montant;
          case "montant-asc":
            return a.montant - b.montant;
          default:
            return b.date.localeCompare(a.date);
        }
      }),
  );

  async function supprimer(id: string) {
    if (!confirm("Supprimer ce mouvement ?")) return;
    await db.mouvements.delete(id);
    afficherToast("Mouvement supprimé");
  }
</script>

<button class="btn btn-discret retour" onclick={() => naviguer({ nom: "dashboard" })}>← Tableau de bord</button>
<h1>{axe}</h1>

<section class="carte">
  <h2>Répartition par poste et catégorie</h2>
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
        {#each categoriesDuPoste(p.poste) as c (c.categorie)}
          {@const statutC = statutSeuil(c.pct)}
          <tr class="ligne-categorie">
            <td class="indent">{c.categorie}</td>
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
      <label for="d-cat">Catégorie</label>
      <select id="d-cat" bind:value={filtreCategorie}>
        <option value="">Toutes</option>
        {#each toutesCategories as c}
          <option value={c}>{c}</option>
        {/each}
      </select>
    </div>
    <div class="champ">
      <label for="d-debut">Depuis</label>
      <input id="d-debut" type="date" bind:value={filtreDebut} />
    </div>
    <div class="champ">
      <label for="d-fin">Jusqu'à</label>
      <input id="d-fin" type="date" bind:value={filtreFin} />
    </div>
    <div class="champ">
      <label for="d-tri">Tri</label>
      <select id="d-tri" bind:value={tri}>
        <option value="date-desc">Date (récent → ancien)</option>
        <option value="date-asc">Date (ancien → récent)</option>
        <option value="montant-desc">Montant (décroissant)</option>
        <option value="montant-asc">Montant (croissant)</option>
      </select>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Poste</th>
        <th>Catégorie</th>
        <th>Description</th>
        <th class="montant">Montant</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each mouvementsFiltres as m (m.id)}
        <tr>
          <td>{formatDate(m.date)}</td>
          <td>{m.poste}</td>
          <td>{m.categorie}</td>
          <td>{m.description ?? ""}</td>
          <td class="montant chiffre">{formatMontant(m.montant)}</td>
          <td><button class="btn btn-discret" onclick={() => supprimer(m.id)}>Supprimer</button></td>
        </tr>
      {:else}
        <tr><td colspan="6">Aucun mouvement pour ces filtres.</td></tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .retour {
    margin-bottom: var(--espace-3);
    padding-left: 0;
  }
  section.carte {
    margin-bottom: var(--espace-5);
    overflow-x: auto;
  }
  .ligne-poste td {
    background: var(--fond-releve);
  }
  .indent {
    padding-left: var(--espace-5);
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
</style>
