<script lang="ts">
  import { db } from "../db/db";
  import { useLiveQuery } from "../util/live.svelte";
  import { agregerParCategorie, agregerParAxe, agregerGlobal, serieTendance } from "../db/aggregate";
  import { formatMontant, formatPct, statutSeuil } from "../util/format";
  import KpiCard from "../components/KpiCard.svelte";
  import HistogrammeAxes from "../components/HistogrammeAxes.svelte";
  import TendanceChart from "../components/TendanceChart.svelte";
  import { naviguer } from "../util/router.svelte";

  const lignes = useLiveQuery(() => db.lignesBudget.toArray(), []);
  const mouvements = useLiveQuery(() => db.mouvements.toArray(), []);

  let annee = $derived(lignes.value.reduce((max, l) => Math.max(max, l.annee), new Date().getFullYear()));
  let categories = $derived(agregerParCategorie(lignes.value, mouvements.value));
  let axes = $derived(agregerParAxe(categories).sort((a, b) => b.prevu - a.prevu));
  let global = $derived(agregerGlobal(axes));
  let points = $derived(serieTendance(annee, global.prevu, mouvements.value));

  let statutGlobal = $derived(statutSeuil(global.pct));
</script>

<section class="entete">
  <h1>Tableau de bord {annee}</h1>
</section>

<section class="kpis">
  <KpiCard label="Réalisé total" valeur={formatMontant(global.realise, false)} statut={statutGlobal} />
  <KpiCard label="% du BP consommé" valeur={formatPct(global.pct)} statut={statutGlobal} />
  <KpiCard
    label="Écart net"
    valeur={formatMontant(global.ecart, false)}
    statut={global.ecart < 0 ? "depassement" : statutGlobal}
    sousTexte={global.ecart >= 0 ? "reste disponible" : "dépassement"}
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
