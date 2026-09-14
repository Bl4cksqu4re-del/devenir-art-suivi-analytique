<script lang="ts">
  import { db } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { agregerParCategorie, agregerParAxe, agregerGlobal, serieTendance, estConfirme, estCharge, estProduit } from "../db/aggregate";
  import { formatMontant, formatPct, statutSeuil } from "../util/format";
  import KpiCard from "../components/KpiCard.svelte";
  import HistogrammeAxes from "../components/HistogrammeAxes.svelte";
  import TendanceChart from "../components/TendanceChart.svelte";
  import { naviguer } from "../util/router.svelte";

  const lignes = useLiveQuery(() => db.lignesBudget.toArray(), []);
  const mouvements = useLiveQuery(() => db.mouvements.toArray(), []);

  let annee = $derived(lignes.value.reduce((max, l) => Math.max(max, l.annee), new Date().getFullYear()));
  let lignesCharges = $derived(lignes.value.filter(estCharge));
  let mouvementsCharges = $derived(mouvements.value.filter(estCharge));
  let categories = $derived(agregerParCategorie(lignesCharges, mouvementsCharges));
  let axes = $derived(agregerParAxe(categories).sort((a, b) => b.prevu - a.prevu));
  let global = $derived(agregerGlobal(axes));
  let points = $derived(serieTendance(annee, global.prevu, mouvementsCharges));

  let recettesRealisees = $derived(
    mouvements.value.filter(estProduit).filter(estConfirme).reduce((s, m) => s + m.montant, 0),
  );
  let solde = $derived(recettesRealisees - global.realise);

  let statutGlobal = $derived(statutSeuil(global.pct));
  let nbAConfirmer = $derived(mouvements.value.filter((m) => !estConfirme(m)).length);
</script>

<section class="entete">
  <h1>Tableau de bord {annee}</h1>
</section>

{#if nbAConfirmer > 0}
  <button class="alerte-confirmation" onclick={() => naviguer({ nom: "journal" })}>
    {nbAConfirmer} mouvement{nbAConfirmer > 1 ? "s" : ""} récurrent{nbAConfirmer > 1 ? "s" : ""} à confirmer → Journal
  </button>
{/if}

<section class="kpis">
  <KpiCard label="Réalisé total (dépenses)" valeur={formatMontant(global.realise, false)} statut={statutGlobal} />
  <KpiCard label="% du BP consommé" valeur={formatPct(global.pct)} statut={statutGlobal} />
  <KpiCard
    label="Écart net"
    valeur={formatMontant(global.ecart, false)}
    statut={global.ecart < 0 ? "depassement" : statutGlobal}
    sousTexte={global.ecart >= 0 ? "reste disponible" : "dépassement"}
  />
  <KpiCard
    label="Solde (recettes − dépenses)"
    valeur={formatMontant(solde, false)}
    statut={solde >= 0 ? "normal" : "depassement"}
    sousTexte={`Recettes réalisées : ${formatMontant(recettesRealisees, false)}`}
  />
</section>

<section class="carte">
  <h2>Consommation cumulée</h2>
  <TendanceChart {points} />
</section>

<section class="carte">
  <h2>Réalisé par axe</h2>
  <HistogrammeAxes {axes} onSelect={(axe) => naviguer({ nom: "detail", axe })} />
</section>

<style>
  .entete {
    margin-bottom: var(--espace-2);
  }
  .alerte-confirmation {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--ambre-fond);
    border: 1px solid var(--ambre);
    color: var(--ambre);
    border-radius: var(--rayon);
    padding: 10px 14px;
    font-size: 0.88rem;
    font-weight: 600;
    margin-bottom: var(--espace-4);
  }
  .kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--espace-4);
    margin-bottom: var(--espace-5);
  }
  section.carte {
    margin-bottom: var(--espace-5);
  }
</style>
