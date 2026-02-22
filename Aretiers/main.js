// js/main.js
import { computeModel } from "./geometry.js";
import { draw, projectIso } from "./render.js";
import { renderSummary, renderTable, renderDetails, formatDeg, formatMm } from "./ui.js";
import {
  buildTriangleTemplate2D,
  buildFrustumTemplate2D,
  templateToSVG,
  downloadSVG
} from "./templates.js";

const els = {
  n: document.getElementById("n"),
  R: document.getElementById("R"),
  H: document.getElementById("H"),
  zCut: document.getElementById("zCut"),
  zCut2: document.getElementById("zCut2"),
  epaisseur: document.getElementById("epaisseur"),
  dx: document.getElementById("dx"),
  dy: document.getElementById("dy"),
  showToolAngle: document.getElementById("showToolAngle"),
  recalc: document.getElementById("recalc"),
  canvas: document.getElementById("view"),
  canvasTooltip: document.getElementById("canvasTooltip"),
  summary: document.getElementById("summary"),
  tbody: document.querySelector("#results tbody"),
  details: document.getElementById("details"),

  // (ajout gabarits)
  faceIndex: document.getElementById("faceIndex"),
  exportFaceSvg: document.getElementById("exportFaceSvg"),
  exportAllSvg: document.getElementById("exportAllSvg"),
  preferHoveredFace: document.getElementById("preferHoveredFace"),
  svgAnnot: document.getElementById("svgAnnot"),
  svgShowEdges: document.getElementById("svgShowEdges"),

};

const ctx = els.canvas.getContext("2d");
let hoverIndex = null;
let lastModel = null;
let lastParams = null;

function readParams() {
  const n = Math.max(3, parseInt(els.n.value, 10) || 3);
  const R = Math.max(0, Number(els.R.value) || 0);
  const H = Math.max(0, Number(els.H.value) || 0);
  let zCut = Number(els.zCut.value) || 0;
  let zCut2 = Number(els.zCut2.value);
  if (Number.isNaN(zCut2)) zCut2 = zCut;
  const epaisseur = Math.max(0, Number(els.epaisseur?.value) || 0);
  const dx = Number(els.dx.value) || 0;
  const dy = Number(els.dy.value) || 0;

  zCut = Math.max(0, Math.min(H, zCut));
  zCut2 = Math.max(0, Math.min(H, zCut2));
  return { n, R, H, zCut, zCut2, epaisseur, dx, dy };
}

function syncFaceSelect(n) {
  if (!els.faceIndex) return;

  const prev = els.faceIndex.value;
  els.faceIndex.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Face ${i}`;
    els.faceIndex.appendChild(opt);
  }
  if (prev !== "") {
    els.faceIndex.value = String(Math.min(n - 1, Number(prev)));
  }
}

function recalc() {
  const p = readParams();
  const model = computeModel(p);

  lastModel = model;
  lastParams = p;

  syncFaceSelect(model.base.length);

  renderSummary(els.summary, model, p);
  renderTable(els.tbody, model, els.showToolAngle.checked);
  renderDetails(els.details, p);
  draw(ctx, model, hoverIndex, p.epaisseur || 0);
}

els.recalc.addEventListener("click", recalc);
[els.n, els.R, els.H, els.zCut, els.zCut2, els.epaisseur, els.dx, els.dy, els.showToolAngle].forEach(inp => {
  if (inp) inp.addEventListener("input", recalc);
});

// Hover table -> highlight edge
els.tbody.addEventListener("mousemove", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  hoverIndex = Number(tr.dataset.index);
  draw(ctx, lastModel, hoverIndex, lastParams?.epaisseur || 0);

  // si on préfère la face survolée, on met à jour le select
  if (els.faceIndex && els.preferHoveredFace?.checked) {
    els.faceIndex.value = String(hoverIndex);
  }
});

els.tbody.addEventListener("mouseleave", () => {
  hoverIndex = null;
  draw(ctx, lastModel, hoverIndex, lastParams?.epaisseur || 0);
});

// --- Survol du canvas : infobulle longueur / dièdre / biseau ---
const TOOLTIP_DIST_THRESHOLD = 0.35; // en unités projetées (sensibilité au survol)

function distPointToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const wx = px - x1, wy = py - y1;
  const d2 = vx * vx + vy * vy || 1e-12;
  let t = (wx * vx + wy * vy) / d2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * vx, cy = y1 + t * vy;
  return Math.hypot(px - cx, py - cy);
}

function getCanvasCoords(e) {
  const canvas = els.canvas;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    mx: (e.clientX - rect.left) * scaleX,
    my: (e.clientY - rect.top) * scaleY
  };
}

function showCanvasTooltip(aretierIndex, clientX, clientY) {
  const tip = els.canvasTooltip;
  if (!tip || !lastModel) return;
  const it = lastModel.items[aretierIndex];
  if (!it) return;
  tip.innerHTML = `<strong>Arêtier ${aretierIndex}</strong>\nLongueur : ${formatMm(it.L)}\nDièdre δ : ${formatDeg(it.delta)}\nBiseau (δ/2) : ${formatDeg(it.bevelFace)}\nRéglage outil : ${formatDeg(it.bevelTool)}`;
  tip.setAttribute("aria-hidden", "false");
  const offset = 14;
  let left = clientX + offset;
  let top = clientY + offset;
  const pad = 8;
  const maxLeft = window.innerWidth - tip.offsetWidth - pad;
  const maxTop = window.innerHeight - tip.offsetHeight - pad;
  if (left > maxLeft) left = clientX - tip.offsetWidth - offset;
  if (top > maxTop) top = maxTop;
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function hideCanvasTooltip() {
  const tip = els.canvasTooltip;
  if (tip) {
    tip.setAttribute("aria-hidden", "true");
  }
}

els.canvas.addEventListener("mousemove", (e) => {
  if (!lastModel) return;
  const { base, trunc, trunc2, A } = lastModel;
  const { mx, my } = getCanvasCoords(e);
  const cx = els.canvas.width * 0.5;
  const cy = els.canvas.height * 0.62;
  const maxR = Math.max(...base.map(v => {
    const d = Math.hypot(v.x, v.y, v.z);
    return d;
  })) || 1;
  const s = Math.min(els.canvas.width, els.canvas.height) / (maxR * 4.2);
  const px = (mx - cx) / s;
  const py = (my - cy) / s;

  let bestI = null;
  let bestD = TOOLTIP_DIST_THRESHOLD;

  for (let i = 0; i < base.length; i++) {
    let from = base[i];
    const segs = [];
    if (trunc) {
      segs.push([from, trunc[i]]);
      from = trunc[i];
    }
    if (trunc2) {
      segs.push([from, trunc2[i]]);
      from = trunc2[i];
    }
    segs.push([from, A]);
    for (const [a, b] of segs) {
      const p1 = projectIso(a);
      const p2 = projectIso(b);
      const d = distPointToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
  }

  if (bestI !== null) {
    hoverIndex = bestI;
    showCanvasTooltip(bestI, e.clientX, e.clientY);
  } else {
    hoverIndex = null;
    hideCanvasTooltip();
  }
  draw(ctx, lastModel, hoverIndex, lastParams?.epaisseur || 0);
});

els.canvas.addEventListener("mouseleave", () => {
  hideCanvasTooltip();
  hoverIndex = null;
  draw(ctx, lastModel, hoverIndex, lastParams?.epaisseur || 0);
});

function getActiveFaceIndex() {
  if (els.preferHoveredFace?.checked && hoverIndex !== null && Number.isFinite(hoverIndex)) {
    return hoverIndex;
  }
  if (els.faceIndex) return Number(els.faceIndex.value || 0);
  return 0;
}

function exportFaceSVG(i) {
  if (!lastModel) return;

  const isFrustum = !!lastModel.trunc;
  const tpl = isFrustum
    ? buildFrustumTemplate2D(lastModel, i)
    : buildTriangleTemplate2D(lastModel, i);

  const annotMode = els.svgAnnot?.value ?? "none";
  const showEdges = els.svgShowEdges?.checked ?? true;
  
  const svg = templateToSVG(tpl, {
    units: "mm",
    marginMm: 10,
    // 👇 nouvelles options
    annotMode,
    showEdges,
    model: lastModel, // pour accéder aux angles de corroyage
  });
  





  const filename = isFrustum
    ? `gabarit_face_${i}_tronque.svg`
    : `gabarit_face_${i}.svg`;

  downloadSVG(filename, svg);
}

function exportAllSVG() {
  if (!lastModel) return;
  const n = lastModel.base.length;
  for (let i = 0; i < n; i++) exportFaceSVG(i);
}

els.exportFaceSvg?.addEventListener("click", () => exportFaceSVG(getActiveFaceIndex()));
els.exportAllSvg?.addEventListener("click", exportAllSVG);

// au changement du select, on force un redraw (optionnel)
els.faceIndex?.addEventListener("change", () => {
  const idx = Number(els.faceIndex.value || 0);
  hoverIndex = idx; // petit confort: surligne la face sélectionnée
  draw(ctx, lastModel, hoverIndex, lastParams?.epaisseur || 0);
});

recalc();

// PWA: register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
