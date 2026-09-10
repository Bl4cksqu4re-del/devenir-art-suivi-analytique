<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    valeur,
    statut = "normal",
    sousTexte,
  }: {
    label: string;
    valeur: string;
    statut?: "normal" | "alerte" | "depassement";
    sousTexte?: string;
  } = $props();
</script>

<div class="carte kpi">
  <p class="kpi-label">{label}</p>
  <p class="kpi-valeur chiffre statut-{statut}">{valeur}</p>
  {#if sousTexte}
    <p class="kpi-sous">{sousTexte}</p>
  {/if}
</div>

<style>
  .kpi {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kpi-label {
    margin: 0;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--encre-att);
    font-weight: 600;
  }
  .kpi-valeur {
    margin: 0;
    font-size: 1.9rem;
    font-weight: 700;
  }
  .kpi-sous {
    margin: 0;
    font-size: 0.82rem;
    color: var(--encre-att);
  }
</style>
