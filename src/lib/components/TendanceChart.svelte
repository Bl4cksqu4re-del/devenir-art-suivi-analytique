<script lang="ts">
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Filler,
    Tooltip,
  } from "chart.js";
  import type { PointTendance } from "../db/aggregate";
  import { formatMontant } from "../util/format";

  Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

  let { points }: { points: PointTendance[] } = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | undefined;

  function creerOuMettreAJour() {
    const labels = points.map((p) => p.date);
    const data = {
      labels,
      datasets: [
        {
          label: "Réalisé cumulé",
          data: points.map((p) => p.cumulRealise),
          borderColor: "#2f6f4e",
          backgroundColor: "rgba(47, 111, 78, 0.12)",
          fill: true,
          tension: 0.15,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: "Prévisionnel théorique cumulé",
          data: points.map((p) => p.cumulPrevuTheorique),
          borderColor: "#5b6660",
          borderDash: [5, 4],
          fill: false,
          tension: 0,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    };

    if (chart) {
      chart.data = data;
      chart.update();
      return;
    }

    chart = new Chart(canvas, {
      type: "line",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ticks: { maxTicksLimit: 8, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            ticks: {
              font: { size: 11 },
              callback: (v) => formatMontant(Number(v), false),
            },
            grid: { color: "#dedad0" },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatMontant(ctx.parsed.y ?? 0)}`,
            },
          },
        },
      },
    });
  }

  $effect(() => {
    points;
    if (canvas) creerOuMettreAJour();
  });

  $effect(() => () => chart?.destroy());
</script>

<div class="conteneur-graphique">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .conteneur-graphique {
    position: relative;
    height: 260px;
    width: 100%;
  }
</style>
