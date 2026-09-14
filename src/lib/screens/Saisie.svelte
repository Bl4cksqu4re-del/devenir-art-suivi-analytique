<script lang="ts">
  import { db, uid } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { formatMontant, aujourdHuiISO } from "../util/format";
  import { afficherToast } from "../util/toast.svelte";
  import { naviguer } from "../util/router.svelte";
  import type { Nature } from "../db/types";
  import { estConfirme } from "../db/aggregate";
  import { MOIS_LABELS, dateDansLeMois, parseISO } from "../util/recurrence";
  import SelecteurCategorie from "../components/SelecteurCategorie.svelte";

  const CLEF_DERNIER_AXE = "devenir-art:dernier-axe";

  const lignes = useLiveQuery(() => db.lignesBudget.toArray(), []);
  const mouvements = useLiveQuery(() => db.mouvements.toArray(), []);

  let annee = $derived(lignes.value.reduce((max, l) => Math.max(max, l.annee), new Date().getFullYear()));

  let nature = $state<Nature>("charge");
  let axe = $state<string | null>(localStorage.getItem(CLEF_DERNIER_AXE) ?? "");
  let poste = $state("");
  let categorie = $state("");
  let date = $state(aujourdHuiISO());
  let montant = $state("");
  let description = $state("");
  let recurrenceActive = $state(false);
  let moisSelectionnes = $state<Set<number>>(new Set());

  let ligneSelectionnee = $derived(
    lignes.value.find(
      (l) => (l.nature ?? "charge") === nature && l.axe === axe && l.poste === poste && l.categorie === categorie,
    ),
  );

  let dejaConsomme = $derived(
    mouvements.value
      .filter(
        (m) =>
          (m.nature ?? "charge") === nature &&
          m.axe === axe &&
          m.poste === poste &&
          m.categorie === categorie &&
          estConfirme(m),
      )
      .reduce((s, m) => s + m.montant, 0),
  );

  let moisCourant = $derived(date ? parseISO(date).moisIndex : -1);

  function basculerMois(i: number) {
    if (i === moisCourant) return;
    const copie = new Set(moisSelectionnes);
    if (copie.has(i)) copie.delete(i);
    else copie.add(i);
    moisSelectionnes = copie;
  }

  function selectionnerMoisRestants() {
    const copie = new Set(moisSelectionnes);
    for (let i = moisCourant + 1; i < 12; i++) copie.add(i);
    moisSelectionnes = copie;
  }

  let montantValide = $derived(!!montant && !Number.isNaN(Number(montant.replace(",", "."))) && Number(montant.replace(",", ".")) > 0);
  let formulaireValide = $derived(!!poste && !!categorie && !!date && montantValide && (nature === "produit" || !!axe));

  async function enregistrer() {
    if (!formulaireValide) return;
    const montantNombre = Number(montant.replace(",", "."));
    const descriptionNettoyee = description.trim() || undefined;
    const { annee: anneeDate, jour } = parseISO(date);
    const creeLe = new Date().toISOString();

    const aCreer = [
      {
        id: uid(),
        date,
        nature,
        axe,
        poste,
        categorie,
        montant: montantNombre,
        description: descriptionNettoyee,
        creeLe,
      },
      ...(recurrenceActive
        ? [...moisSelectionnes].map((moisIndex) => ({
            id: uid(),
            date: dateDansLeMois(anneeDate, moisIndex, jour),
            nature,
            axe,
            poste,
            categorie,
            montant: montantNombre,
            description: descriptionNettoyee,
            creeLe,
            confirme: false,
          }))
        : []),
    ];

    await db.mouvements.bulkAdd(aCreer);
    if (nature === "charge" && axe) localStorage.setItem(CLEF_DERNIER_AXE, axe);

    const nbEnAttente = aCreer.length - 1;
    afficherToast(
      nbEnAttente > 0
        ? `Mouvement enregistré (${formatMontant(montantNombre)}) + ${nbEnAttente} échéance(s) à confirmer`
        : `Mouvement enregistré : ${formatMontant(montantNombre)}`,
    );
    montant = "";
    description = "";
    recurrenceActive = false;
    moisSelectionnes = new Set();
    naviguer({ nom: "dashboard" });
  }
</script>

<h1>Saisie rapide</h1>

<form class="formulaire" onsubmit={(e) => { e.preventDefault(); enregistrer(); }}>
  <SelecteurCategorie lignes={lignes.value} {annee} bind:nature bind:axe bind:poste bind:categorie />

  {#if ligneSelectionnee}
    <div class="rappel-budget">
      <span>Prévisionnel : <strong class="chiffre">{formatMontant(ligneSelectionnee.prevu, false)}</strong></span>
      <span>Déjà {nature === "produit" ? "reçu" : "consommé"} : <strong class="chiffre">{formatMontant(dejaConsomme, false)}</strong></span>
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

  <label class="case-recurrence">
    <input type="checkbox" bind:checked={recurrenceActive} />
    {nature === "produit" ? "Recette récurrente" : "Dépense récurrente"} : générer d'autres mois à confirmer
  </label>

  {#if recurrenceActive}
    <div class="bloc-recurrence">
      <div class="grille-mois">
        {#each MOIS_LABELS as label, i}
          <button
            type="button"
            class="bouton-mois"
            class:actif={moisSelectionnes.has(i)}
            class:mois-courant={i === moisCourant}
            disabled={i === moisCourant}
            onclick={() => basculerMois(i)}
          >
            {label}
          </button>
        {/each}
      </div>
      <button type="button" class="btn btn-discret btn-petit" onclick={selectionnerMoisRestants}>
        Sélectionner les mois restants de l'année
      </button>
      <p class="aide-recurrence">
        Le mois de la date ci-dessus ({MOIS_LABELS[moisCourant] ?? ""}) est déjà enregistré comme mouvement réel.
        Les mois sélectionnés ici seront créés avec le même montant, à confirmer (date et montant ajustables) dans le Journal — ils ne compteront dans le Réalisé qu'une fois confirmés.
      </p>
    </div>
  {/if}

  <button type="submit" class="btn btn-primaire btn-large" disabled={!formulaireValide}>
    Enregistrer le mouvement
  </button>
</form>

<style>
  .formulaire {
    max-width: 480px;
    margin: 0 auto;
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
  .case-recurrence {
    display: flex;
    align-items: center;
    gap: var(--espace-2);
    font-size: 0.92rem;
    margin-bottom: var(--espace-3);
    cursor: pointer;
  }
  .case-recurrence input {
    width: 18px;
    height: 18px;
  }
  .bloc-recurrence {
    background: var(--fond-releve);
    border-radius: var(--rayon);
    padding: var(--espace-3);
    margin-bottom: var(--espace-4);
  }
  .grille-mois {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--espace-1);
    margin-bottom: var(--espace-2);
  }
  .bouton-mois {
    padding: 8px 4px;
    border: 1px solid var(--ligne);
    border-radius: 4px;
    background: #fff;
    font-size: 0.82rem;
  }
  .bouton-mois.actif {
    background: var(--ambre-fond);
    border-color: var(--ambre);
    color: var(--ambre);
    font-weight: 600;
  }
  .bouton-mois.mois-courant {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .btn-petit {
    padding: 6px 10px;
    font-size: 0.82rem;
  }
  .aide-recurrence {
    margin: var(--espace-2) 0 0 0;
    font-size: 0.78rem;
    color: var(--encre-att);
  }
</style>
