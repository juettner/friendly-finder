export function renderLanding(root: HTMLElement, onStart: () => void): void {
  root.innerHTML = `
    <section class="screen landing">
      <p class="tagline">Find the nearest Grain Belt Premium.</p>
      <button type="button" class="primary start">Find me a Premium</button>
    </section>`;
  root.querySelector<HTMLButtonElement>(".start")!.addEventListener("click", onStart);
}

export interface MessageOptions {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function renderMessage(root: HTMLElement, opts: MessageOptions): void {
  root.innerHTML = `
    <section class="screen message">
      <h2 class="msg-title"></h2>
      <p class="msg-body"></p>
    </section>`;
  root.querySelector<HTMLElement>(".msg-title")!.textContent = opts.title;
  root.querySelector<HTMLElement>(".msg-body")!.textContent = opts.body;
  if (opts.actionLabel && opts.onAction) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary";
    btn.textContent = opts.actionLabel;
    btn.addEventListener("click", opts.onAction);
    root.querySelector(".message")!.appendChild(btn);
  }
}
