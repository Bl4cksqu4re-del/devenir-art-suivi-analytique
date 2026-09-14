<script lang="ts">
  import { db, uid } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { formatMontant, aujourdHuiISO } from "../util/format";
  import { afficherToast } from "../util/toast.svelte";
  import { naviguer } from "../util/router.svelte";
  import { AXES_ORDRE } from "../db/types";

  const CLEF_DERNIER_AXE = "devenir-art:dernier-axe";

  const lignes = useLiveQuery(() => db.lignesBudget.toArray(), []);
  const mouvements = useLiveQuery(() => db.mouvements.toArray(), []);

  let axe = $state(localStorage.getItem(CLEF_DERNIER_AXE) ?? "");
  let poste = $state("");
  let categorie = $state("");
  let recherche = $state("");
  let date = $state(aujourdHuiISO());
  let montant = $state("");
  let description = $state("");

  let axesDisponibles = $derived(
    AXES_ORDRE.filter((a) => lignes.value.some((l) => l.axe === a)),
  );

  let postesDisponibles = $derived(
    [...new Set(lignes.value.filter((l) => l.axe === axe).map((l) => l.poste))].sort(),
  );

  let categoriesDisponibles = $derived(
    lignes.value
      .filter((l) => l.axe === axe && l.poste === poste)
      .filter((l) => l.categorie.toLowerCase().includes(recherche.toLowerCase()))
      .sort(
        (a, b) =>
          (a.groupe ?? "").localeCompare(b.groupe ?? "", "fr") ||
          a.categorie.localeCompare(b.categorie, "fr"),
      ),
  );

  let ligneSelectionnee = $derived(
    lignes.value.find((l) => l.axe === axe && l.poste === poste && l.categorie === categorie),
  );

  let dejaConsomme = $derived(
    mouvements.value
      .filter((m) => m.axe === axe && m.poste === poste && m.categorie === categorie)
      .reduce((s, m) => s + m.montant, 0),
  );

  $effect(() => {
    if (axe && !postesDisponibles.includes(poste)) poste = postesDisponibles[0] ?? "";
  });
  $effect(() => {
    if (poste && !categoriesDisponibles.some((c) => c.categorie === categorie)) {
      categorie = "";
    }
  });

  let montantValide = $derived(!!montant && !Number.isNaN(Number(montant.replace(",", "."))) && Number(montant.replace(",", ".")) > 0);
  let formulaireValide = $derived(!!axe && !!poste && !!categorie && !!date && montantValide);

  async function enregistrer() {
    if (!formulaireValide) return;
    await db.mouvements.add({
      id: uid(),
      date,
      axe,
      poste,
      categorie,
      montant: Number(montant.replace(",", ".")),
      description: description.trim() || undefined,
      creeLe: new Date().toISOString(),
    });
    localStorage.setItem(CLEF_DERNIER_AXE, axe);
    afficherToast(`Mouvement enregistré : ${formatMontant(Number(montant.replace(",", ".")))}`);
    montant = "";
    description = "";
    recherche = "";
    naviguer({ nom: "dashboard" });
  }
</script>

<h1>Saisie rapide</h1>

<form class="formulaire" onsubmit={(e) => { e.preventDefault(); enregistrer(); }}>
  <div class="champ">
    <label for="f-axe">Axe</label>
    <select id="f-axe" bind:value={axe} required>
      <option value="" disabled>Choisir…</option>
      {#each axesDisponibles as a}
        <option value={a}>{a}</option>
      {/each}
    </select>
  </div>

  <div class="champ">
    <label for="f-poste">Poste</label>
    <select id="f-poste" bind:value={poste} required disabled={!axe}>
      <option value="" disabled>Choisir…</option>
      {#each postesDisponibles as p}
        <option value={p}>{p}</option>
      {/each}
    </select>
  </div>

  <div class="champ">
    <label for="f-recherche">Catégorie</label>
    <input
      id="f-recherche"
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
        {:else}
          <p class="vide">Aucune catégorie ne correspond.</p>
        {/each}
      </div>
    {/if}
  </div>

  {#if ligneSelectionnee}
    <div class="rappel-budget">
      <span>Prévisionnel : <strong class="chiffre">{formatMontant(ligneSelectionnee.prevu, false)}</strong></span>
      <span>Déjà consommé : <strong class="chiffre">{formatMontant(dejaConsomme, false)}</strong></span>
    </div>
  {/if}

  <div class="champ">
    <label for="f-date">Date</label>
    <input id="f-date" type="date" bind:value={date} required />
  </div>

  <div class="champ">
    <label for="f-montant">Montant (TTC)</label>
    <input id="f-montant" type="text" inputmode="decimal" placeholder="0,00" bind:value={montant} required />
  </div>

  <div class="champ">
    <label for="f-description">Description (optionnel)</label>
    <input id="f-description" type="text" bind:value={description} />
  </div>

  <button type="submit" class="btn btn-primaire btn-large" disabled={!formulaireValide}>
    Enregistrer le mouvement
  </button>
</form>

<style>
  .formulaire {
    max-width: 480px;
    margin: 0 auto;
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
  .rappel-budget {
    display: flex;
    justify-content: space-between;
    background: var(--fond-releve);
    border-radius: var(--rayon);
    padding: 10px 14px;
    margin-bottom: var(--espace-4);
    font-size: 0.88rem;
  }
  .btn-large {
    width: 100%;
    padding: 16px;
    font-size: 1.05rem;
  }
</style>
