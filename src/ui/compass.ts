// Crinkled bottle-cap ring (Grain Belt motif): scalloped outer edge minus an
// inner circle, drawn with fill-rule evenodd so the compass face shows through.
function ringPath(): string {
  const C = 256;
  const peaks = 21;
  const rPeak = 254;
  const rValley = 236;
  const rInner = 218;
  const n = peaks * 2;
  let d = "";
  for (let i = 0; i < n; i++) {
    const r = i % 2 === 0 ? rPeak : rValley;
    const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
    d += (i === 0 ? "M" : "L") + (C + r * Math.cos(a)).toFixed(1) + "," + (C + r * Math.sin(a)).toFixed(1) + " ";
  }
  d += "Z";
  d += `M ${C - rInner},${C} a ${rInner},${rInner} 0 1,0 ${2 * rInner},0 a ${rInner},${rInner} 0 1,0 ${-2 * rInner},0 Z`;
  return d;
}

export function mountCompass(root: HTMLElement): void {
  root.innerHTML = `
    <div class="compass" role="img" aria-label="Compass pointing to the nearest Premium">
      <svg class="compass-ring" viewBox="0 0 512 512" aria-hidden="true">
        <path d="${ringPath()}" fill="#c8102e" fill-rule="evenodd"/>
      </svg>
      <div class="needle"></div>
    </div>`;
}

export function setNeedle(root: HTMLElement, rotationDeg: number): void {
  const needle = root.querySelector<HTMLElement>(".needle");
  if (needle) needle.style.transform = `translate(-50%, -100%) rotate(${rotationDeg}deg)`;
}
