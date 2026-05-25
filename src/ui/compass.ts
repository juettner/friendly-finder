export function mountCompass(root: HTMLElement): void {
  root.innerHTML = `
    <div class="compass" role="img" aria-label="Compass pointing to the nearest Premium">
      <div class="needle"></div>
    </div>`;
}

export function setNeedle(root: HTMLElement, rotationDeg: number): void {
  const needle = root.querySelector<HTMLElement>(".needle");
  if (needle) needle.style.transform = `translate(-50%, -100%) rotate(${rotationDeg}deg)`;
}
