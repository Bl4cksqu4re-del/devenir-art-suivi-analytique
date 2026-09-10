export type Route =
  | { nom: "dashboard" }
  | { nom: "saisie" }
  | { nom: "detail"; axe: string }
  | { nom: "journal" }
  | { nom: "parametres" };

function lireHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [page, param] = hash.split("/");

  switch (page) {
    case "saisie":
      return { nom: "saisie" };
    case "detail":
      return { nom: "detail", axe: decodeURIComponent(param ?? "") };
    case "journal":
      return { nom: "journal" };
    case "parametres":
      return { nom: "parametres" };
    default:
      return { nom: "dashboard" };
  }
}

let route = $state<Route>(lireHash());

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    route = lireHash();
  });
}

export function naviguer(cible: Route) {
  const hash =
    cible.nom === "detail"
      ? `#/detail/${encodeURIComponent(cible.axe)}`
      : cible.nom === "dashboard"
        ? "#/"
        : `#/${cible.nom}`;
  window.location.hash = hash;
}

export function routeCourante() {
  return route;
}
