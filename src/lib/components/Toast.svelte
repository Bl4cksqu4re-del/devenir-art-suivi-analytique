<script lang="ts">
  import { toastCourant } from "../util/toast.svelte";
</script>

{#if toastCourant()}
  <div class="toast" role="status">{toastCourant()}</div>
{/if}
