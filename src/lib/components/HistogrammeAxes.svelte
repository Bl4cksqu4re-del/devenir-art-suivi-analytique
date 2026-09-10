<script lang="ts">
  import type { AxeAgregat } from "../db/aggregate";
  import { formatMontant } from "../util/format";
  import { statutSeuil } from "../util/format";

  let { axes, onSelect }: { axes: AxeAgregat[]; onSelect: (axe: string) => void } = $props();

  let echelleMax = $derived(Math.max(1, ...axes.map((a) => Math.max(a.prevu, a.realise))));
</script>

<div class="histogramme">
  {#each axes as a (a.axe)}
    {@const statut = statutSeuil(a.pct)}
    {@const pctRealise = Math.min(100, (a.realise / echelleMax) * 100)}
    {@const pctPrevu = Math.min(100, (a.prevu / echelleMax) * 100)}
    <button class="ligne" onclick={() => onSelect(a.axe)} aria-label={`Voir le détail de ${a.axe}`}>
      <span class="nom">{a.axe}</span>
      <span class="piste">
        <span class="barre statut-fond-{statut}" style="width: {pctRealise}%"></span>
        <span class="repere" style="left: {pctPrevu}%"></span>
      </span>
      <span class="valeurs chiffre">
        <span class="statut-{statut}">{formatMontant(a.realise, false)}</span>
        <span class="prevu-txt">/ {formatMontant(a.prevu, false)}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  .histogramme {
    display: flex;
    flex-direction: column;
    gap: var(--espace-3);
  }
  .ligne {
    display: grid;
    grid-template-columns: 11rem 1fr auto;
    align-items: center;
    gap: var(--espace-3);
    background: none;
    border: none;
    padding: var(--espace-1) 0;
    text-align: left;
    width: 100%;
    border-radius: var(--rayon);
  }
  .ligne:hover {
    background: var(--fond-releve);
  }
  .nom {
    font-size: 0.88rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .piste {
    position: relative;
    height: 14px;
    background: var(--fond-releve);
    border-radius: 3px;
    overflow: visible;
  }
  .barre {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    border-radius: 3px;
  }
  .statut-fond-normal {
    background: var(--vert);
  }
  .statut-fond-alerte {
    background: var(--ambre);
  }
  .statut-fond-depassement {
    background: var(--rouge);
  }
  .repere {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    background: var(--encre);
  }
  .valeurs {
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .prevu-txt {
    color: var(--encre-att);
  }
</style>
