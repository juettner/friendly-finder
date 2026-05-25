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

// Mirrors the favicon: red north arm, gray south arm, navy center hub. The
// needle group rotates around the center; the ring and hub stay fixed.
export function mountCompass(root: HTMLElement): void {
  root.innerHTML = `
    <div class="compass" role="img" aria-label="Compass pointing to the nearest Premium">
      <svg class="compass-svg" viewBox="0 0 512 512" aria-hidden="true">
        <path class="compass-ring" d="${ringPath()}" fill="#c8102e" fill-rule="evenodd"/>
        <g class="needle">
          <polygon points="256,120 290,256 222,256" fill="#c8102e"/>
          <polygon points="256,392 290,256 222,256" fill="#d9dde3"/>
        </g>
        <circle cx="256" cy="256" r="16" fill="#16233a" stroke="#ffffff" stroke-width="4"/>
      </svg>
    </div>`;
}

export function setNeedle(root: HTMLElement, rotationDeg: number): void {
  // SVG transform attribute (not CSS transform): rotates reliably on iOS Safari,
  // where CSS transform-box on an SVG <g> does not apply.
  const needle = root.querySelector<SVGGElement>(".needle");
  if (needle) needle.setAttribute("transform", `rotate(${rotationDeg} 256 256)`);
}
