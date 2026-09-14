<script lang="ts">
  import type { LigneBudget, Nature } from "../db/types";
  import { AXES_ORDRE, POSTES_CHARGES, POSTES_PRODUITS } from "../db/types";
  import { ajouterCategorieManuelle } from "../db/seed";
  import { afficherToast } from "../util/toast.svelte";

  let {
    lignes,
    annee,
    nature = $bindable("charge"),
    axe = $bindable(null),
    poste = $bindable(""),
    categorie = $bindable(""),
  }: {
    lignes: LigneBudget[];
    annee: number;
    nature?: Nature;
    axe?: string | null;
    poste?: string;
    categorie?: string;
  } = $props();

  let recherche = $state("");
  let nouveauGroupe = $state("");

  let postesOfficiels = $derived(nature === "produit" ? POSTES_PRODUITS : POSTES_CHARGES);

  let lignesNature = $derived(lignes.filter((l) => (l.nature ?? "charge") === nature));

  let categoriesDisponibles = $derived(
    lignesNature
      .filter((l) => l.poste === poste)
      .filter((l) => (nature === "charge" ? l.axe === axe : true))
      .filter((l) => l.categorie.toLowerCase().includes(recherche.toLowerCase()))
      .sort(
        (a, b) =>
          (a.groupe ?? "").localeCompare(b.groupe ?? "", "fr") ||
          a.categorie.localeCompare(b.categorie, "fr"),
      ),
  );

  let groupesExistants = $derived([
    ...new Set(
      lignesNature
        .filter((l) => l.poste === poste)
        .map((l) => l.groupe)
        .filter((g): g is string => !!g),
    ),
  ]);

  let peutCreer = $derived(!!poste && !!recherche.trim() && categoriesDisponibles.length === 0);

  function choisirNature(n: Nature) {
    if (n === nature) return;
    nature = n;
    axe = n === "produit" ? null : (AXES_ORDRE[0] as string);
    poste = "";
    categorie = "";
    recherche = "";
  }

  function choisirPoste(p: string) {
    poste = p;
    categorie = "";
    recherche = "";
    nouveauGroupe = "";
  }

  async function creerCategorie() {
    const nom = recherche.trim();
    if (!poste || !nom) return;
    try {
      const nouvelle = await ajouterCategorieManuelle({
        annee,
        nature,
        axe: nature === "produit" ? null : axe,
        poste,
        groupe: nouveauGroupe.trim() || null,
        categorie: nom,
        prevu: 0,
      });
      categorie = nouvelle.categorie;
      afficherToast(`Catégorie « ${nouvelle.categorie} » créée`);
      nouveauGroupe = "";
    } catch (err) {
      afficherToast(err instanceof Error ? err.message : "Erreur lors de la création");
    }
  }
</script>

<div class="selecteur">
  <div class="champ">
    <label for="sc-nature">Type</label>
    <div class="bascule-nature" id="sc-nature">
      <button type="button" class:actif={nature === "charge"} onclick={() => choisirNature("charge")}>
        Dépense
      </button>
      <button type="button" class:actif={nature === "produit"} onclick={() => choisirNature("produit")}>
        Recette
      </button>
    </div>
  </div>

  {#if nature === "charge"}
    <div class="champ">
      <label for="sc-axe">Axe</label>
      <select id="sc-axe" value={axe} onchange={(e) => { axe = e.currentTarget.value; poste = ""; categorie = ""; }} required>
        {#each AXES_ORDRE as a}
          <option value={a}>{a}</option>
        {/each}
      </select>
    </div>
  {/if}

  <div class="champ">
    <label for="sc-poste">Poste</label>
    <select id="sc-poste" value={poste} onchange={(e) => choisirPoste(e.currentTarget.value)} required>
      <option value="" disabled>Choisir…</option>
      {#each postesOfficiels as p}
        <option value={p}>{p}</option>
      {/each}
    </select>
  </div>

  <div class="champ">
    <label for="sc-recherche">Catégorie</label>
    <input
      id="sc-recherche"
      type="text"
      placeholder="Rechercher une catégorie…"
      bind:value={recherche}
      disabled={!poste}
      autocomplete="off"
    />
    {#if poste}
      <div class="liste-categories" role="listbox" aria-label="Catégories">
        {#each categoriesDisponibles as c, i (c.categorie)}
          {#if c.groupe && c.groupe !== categoriesDisponibles[i - 1]?.groupe}
            <p class="entete-groupe">{c.groupe}</p>
          {/if}
          <button
            type="button"
            class="option-categorie"
            class:sous-groupe={!!c.groupe}
            class:selectionnee={categorie === c.categorie}
            onclick={() => (categorie = c.categorie)}
          >
            {c.categorie}
          </button>
        {/each}
        {#if peutCreer}
          <div class="bloc-creation">
            <button type="button" class="btn-creer" onclick={creerCategorie}>
              + Créer « {recherche.trim()} »
            </button>
            <input
              type="text"
              class="champ-groupe"
              placeholder="Regrouper sous… (optionnel)"
              bind:value={nouveauGroupe}
              list="sc-groupes-existants"
            />
            <datalist id="sc-groupes-existants">
              {#each groupesExistants as g}<option value={g}></option>{/each}
            </datalist>
          </div>
        {:else if categoriesDisponibles.length === 0}
          <p class="vide">Aucune catégorie ne correspond.</p>
        {/if}
      </div>
    {/if}
  </div>

  {#if nature === "produit"}
    <div class="champ">
      <label for="sc-axe-concerne">Axe concerné (optionnel)</label>
      <select id="sc-axe-concerne" value={axe ?? ""} onchange={(e) => (axe = e.currentTarget.value || null)}>
        <option value="">Non affecté</option>
        {#each AXES_ORDRE as a}
          <option value={a}>{a}</option>
        {/each}
      </select>
    </div>
  {/if}
</div>

<style>
  .champ {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: var(--espace-4);
  }
  .champ label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--encre-att);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .champ input,
  .champ select {
    padding: 12px 14px;
    border: 1px solid var(--ligne);
    border-radius: var(--rayon);
    background: #fff;
    font-size: 1.05rem;
    width: 100%;
  }
  .bascule-nature {
    display: flex;
    gap: 4px;
    background: var(--fond-releve);
    border-radius: var(--rayon);
    padding: 4px;
  }
  .bascule-nature button {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--encre-att);
  }
  .bascule-nature button.actif {
    background: #fff;
    color: var(--encre);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
  .liste-categories {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 260px;
    overflow-y: auto;
    border: 1px solid var(--ligne);
    border-radius: var(--rayon);
    padding: 6px;
    margin-top: 6px;
    background: #fff;
  }
  .entete-groupe {
    margin: 6px 0 0 0;
    padding: 6px 12px 2px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--encre-att);
  }
  .option-categorie {
    text-align: left;
    padding: 10px 12px;
    border: none;
    background: transparent;
    border-radius: 4px;
    font-size: 0.95rem;
  }
  .option-categorie.sous-groupe {
    margin-left: var(--espace-3);
    width: calc(100% - var(--espace-3));
  }
  .option-categorie:hover {
    background: var(--fond-releve);
  }
  .option-categorie.selectionnee {
    background: var(--vert-fond);
    color: var(--vert);
    font-weight: 600;
  }
  .vide {
    color: var(--encre-att);
    font-size: 0.85rem;
    padding: 8px;
    margin: 0;
  }
  .bloc-creation {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    margin-top: 4px;
    border-top: 1px dashed var(--ligne);
  }
  .btn-creer {
    text-align: left;
    padding: 8px 10px;
    border: 1px dashed var(--vert);
    border-radius: 4px;
    background: var(--vert-fond);
    color: var(--vert);
    font-weight: 600;
    font-size: 0.9rem;
  }
  .champ-groupe {
    padding: 8px 10px;
    border: 1px solid var(--ligne);
    border-radius: 4px;
    font-size: 0.85rem;
  }
</style>
