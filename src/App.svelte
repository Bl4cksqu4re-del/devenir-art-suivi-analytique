<script lang="ts">
  import { onMount } from "svelte";
  import { amorcerSiVide } from "./lib/db/seed";
  import { routeCourante, naviguer } from "./lib/util/router.svelte";
  import Toast from "./lib/components/Toast.svelte";
  import Dashboard from "./lib/screens/Dashboard.svelte";
  import Saisie from "./lib/screens/Saisie.svelte";
  import Detail from "./lib/screens/Detail.svelte";
  import Journal from "./lib/screens/Journal.svelte";
  import Parametres from "./lib/screens/Parametres.svelte";

  onMount(() => {
    amorcerSiVide();
  });

  let route = $derived(routeCourante());

  const liens = [
    { nom: "dashboard" as const, label: "Tableau de bord" },
    { nom: "saisie" as const, label: "Saisie" },
    { nom: "journal" as const, label: "Journal" },
    { nom: "parametres" as const, label: "Paramètres" },
  ];
</script>

<a href="#contenu" class="visually-hidden">Aller au contenu</a>

<header class="entete-app">
  <span class="marque">devenir·art — suivi analytique</span>
  <nav aria-label="Navigation principale">
    {#each liens as l}
      <button
        class="lien-nav"
        class:actif={route.nom === l.nom}
        onclick={() => naviguer({ nom: l.nom })}
      >
        {l.label}
      </button>
    {/each}
  </nav>
</header>

<main id="contenu">
  {#if route.nom === "dashboard"}
    <Dashboard />
  {:else if route.nom === "saisie"}
    <Saisie />
  {:else if route.nom === "detail"}
    <Detail axe={route.axe} />
  {:else if route.nom === "journal"}
    <Journal />
  {:else if route.nom === "parametres"}
    <Parametres />
  {/if}
</main>

<Toast />

<style>
  .entete-app {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--espace-3);
    padding: var(--espace-3) var(--espace-5);
    background: #fff;
    border-bottom: 1px solid var(--ligne);
  }
  .marque {
    font-family: var(--police-titre);
    font-weight: 600;
    font-size: 1.05rem;
    white-space: nowrap;
  }
  nav {
    display: flex;
    gap: var(--espace-1);
    overflow-x: auto;
  }
  .lien-nav {
    background: none;
    border: none;
    padding: 8px 14px;
    border-radius: var(--rayon);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--encre-att);
    white-space: nowrap;
  }
  .lien-nav:hover {
    background: var(--fond-releve);
    color: var(--encre);
  }
  .lien-nav.actif {
    background: var(--vert-fond);
    color: var(--vert);
  }
  main {
    max-width: 1080px;
    margin: 0 auto;
    padding: var(--espace-5);
  }
  @media (max-width: 640px) {
    main {
      padding: var(--espace-4) var(--espace-3);
    }
    .entete-app {
      padding: var(--espace-3);
    }
  }
</style>
