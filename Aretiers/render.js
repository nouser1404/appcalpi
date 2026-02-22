import { sub, norm, vec } from "./geometry.js";

function projectIso(p){
  const x = p.x - p.y;
  const y = (p.x + p.y)*0.5 - p.z;
  return {x,y};
}

/** Polygone intérieur pour représenter l'épaisseur (recul vers le centre). */
function innerPolygon(vertices, center, radius, epaisseur) {
  if (epaisseur <= 0 || radius <= 1e-6) return null;
  const f = 1 - epaisseur / radius;
  if (f <= 0) return null;
  return vertices.map(v => ({
    x: center.x + (v.x - center.x) * f,
    y: center.y + (v.y - center.y) * f,
    z: center.z + (v.z - center.z) * f
  }));
}

export function draw(ctx, model, hoverIndex, epaisseur = 0){
  const {A, base, trunc, trunc2, radiusTrunc, radiusTrunc2, centerTrunc, centerTrunc2} = model;
  const R = norm(base[0] ? sub(base[0], {x:0,y:0,z:0}) : 1);
  const centerBase = vec(0,0,0);

  ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(ctx.canvas.width*0.5, ctx.canvas.height*0.62);

  const maxR = Math.max(...base.map(v => norm(sub(v, {x:0,y:0,z:0}))));
  const s = Math.min(ctx.canvas.width, ctx.canvas.height) / (maxR*4.2);
  ctx.scale(s,s);

  // Sections horizontales (base + troncatures), triées par z pour un rendu cohérent
  const sections = [
    { z: 0, outer: base, center: centerBase, radius: R, stroke: "rgba(255,255,255,.28)", fill: "rgba(255,255,255,.14)", strokeInner: "rgba(110,231,255,.5)", fillInner: "rgba(110,231,255,.18)" },
  ];
  if (trunc) {
    sections.push({ z: centerTrunc.z, outer: trunc, center: centerTrunc, radius: radiusTrunc, stroke: "rgba(110,231,255,.5)", fill: "rgba(110,231,255,.22)", strokeInner: "rgba(110,231,255,.45)", fillInner: "rgba(110,231,255,.15)" });
  }
  if (trunc2) {
    sections.push({ z: centerTrunc2.z, outer: trunc2, center: centerTrunc2, radius: radiusTrunc2, stroke: "rgba(167,139,250,.55)", fill: "rgba(167,139,250,.32)", strokeInner: "rgba(167,139,250,.5)", fillInner: "rgba(167,139,250,.2)" });
  }
  sections.sort((a, b) => a.z - b.z);

  for (const sec of sections) {
    const ptsOuter = sec.outer.map(projectIso);
    poly(ctx, ptsOuter, sec.stroke, sec.fill, 2);

    if (epaisseur > 0 && sec.radius > epaisseur) {
      const inner = innerPolygon(sec.outer, sec.center, sec.radius, epaisseur);
      if (inner) {
        const ptsInner = inner.map(projectIso);
        poly(ctx, ptsInner, sec.strokeInner, sec.fillInner, 2);
        // Arêtes reliant contour extérieur → contour intérieur (épaisseur visible)
        for (let i = 0; i < sec.outer.length; i++) {
          line(ctx, ptsOuter[i], ptsInner[i], "rgba(255,255,255,.25)", 1);
        }
      }
    }
  }

  // Arêtes latérales : base → trunc → trunc2 → A (pour voir les niveaux)
  for (let i = 0; i < base.length; i++) {
    const isHover = (i === hoverIndex);
    const col = isHover ? "rgba(167,139,250,.9)" : "rgba(255,255,255,.25)";
    const lw = isHover ? 3 : 1.5;

    let from = base[i];
    if (trunc) {
      line(ctx, projectIso(from), projectIso(trunc[i]), col, lw);
      from = trunc[i];
    }
    if (trunc2) {
      line(ctx, projectIso(from), projectIso(trunc2[i]), col, lw);
      from = trunc2[i];
    }
    line(ctx, projectIso(from), projectIso(A), col, lw);
  }

  // Apex et sommets de la base
  dot(ctx, projectIso(A), "rgba(255,255,255,.9)", 4);
  for (let i = 0; i < base.length; i++) {
    dot(ctx, projectIso(base[i]), i === hoverIndex ? "rgba(167,139,250,.95)" : "rgba(255,255,255,.6)", 3);
  }
  if (trunc) {
    for (let i = 0; i < trunc.length; i++) {
      dot(ctx, projectIso(trunc[i]), i === hoverIndex ? "rgba(167,139,250,.9)" : "rgba(110,231,255,.7)", 2.5);
    }
  }
  if (trunc2) {
    for (let i = 0; i < trunc2.length; i++) {
      dot(ctx, projectIso(trunc2[i]), i === hoverIndex ? "rgba(167,139,250,.95)" : "rgba(167,139,250,.85)", 3);
    }
  }

  ctx.restore();
}

function poly(ctx, pts, stroke, fill, lw){
  ctx.beginPath();
  pts.forEach((p,idx)=> idx===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function line(ctx, a,b, stroke, lw){
  ctx.beginPath();
  ctx.moveTo(a.x,a.y);
  ctx.lineTo(b.x,b.y);
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function dot(ctx, p, color, r){
  ctx.beginPath();
  ctx.arc(p.x,p.y,r,0,Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
}
