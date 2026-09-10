let message = $state<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

export function afficherToast(texte: string, dureeMs = 2400) {
  message = texte;
  clearTimeout(timer);
  timer = setTimeout(() => {
    message = null;
  }, dureeMs);
}

export function toastCourant() {
  return message;
}
