import { sub, norm, vec } from "./geometry.js";

/** Rotation autour de l'axe Z (vertical) — azimuth. */
export function rotateZ(p, angle) {
  if (!angle) return p;
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

/** Rotation autour de l'axe X (horizontal) — élévation / inclinaison. */
export function rotateX(p, angle) {
  if (!angle) return p;
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

/** Projection isométrique 3D → 2D (exportée pour hit-test survol). */
export function projectIso(p) {
  const x = p.x - p.y;
  const y = (p.x + p.y) * 0.5 - p.z;
  return { x, y };
}

/** Projette un point 3D avec rotation (azimuth + élévation). */
function project(p, viewAngle, viewElevation) {
  let q = rotateZ(p, viewAngle);
  q = rotateX(q, viewElevation);
  return projectIso(q);
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

export function draw(ctx, model, hoverIndex, epaisseur = 0, viewAngle = 0, viewElevation = 0, hoverFaceIndex = null, hoverSection = null) {
  const { A, base, trunc, trunc2, radiusTrunc, radiusTrunc2, centerTrunc, centerTrunc2, items } = model;
  const R = norm(base[0] ? sub(base[0], { x: 0, y: 0, z: 0 }) : 1);
  const centerBase = vec(0, 0, 0);

  const proj = (p) => project(p, viewAngle, viewElevation);

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(ctx.canvas.width * 0.5, ctx.canvas.height * 0.62);

  const maxR = Math.max(...base.map(v => norm(sub(v, { x: 0, y: 0, z: 0 }))));
  const s = Math.min(ctx.canvas.width, ctx.canvas.height) / (maxR * 4.2);
  ctx.scale(s, s);

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
    const ptsOuter = sec.outer.map(proj);
    poly(ctx, ptsOuter, sec.stroke, sec.fill, 2);

    if (epaisseur > 0 && sec.radius > epaisseur) {
      const inner = innerPolygon(sec.outer, sec.center, sec.radius, epaisseur);
      if (inner) {
        const ptsInner = inner.map(proj);
        poly(ctx, ptsInner, "rgba(255,255,255,.45)", sec.fillInner, 2);
        for (let i = 0; i < sec.outer.length; i++) {
          line(ctx, ptsOuter[i], ptsInner[i], "rgba(255,255,255,.42)", 1.5);
        }
      }
    }
  }

  for (let i = 0; i < base.length; i++) {
    const isHover = (i === hoverIndex);
    const col = isHover ? "rgba(167,139,250,.9)" : "rgba(255,255,255,.25)";
    const lw = isHover ? 3 : 1.5;
    let from = base[i];
    if (trunc) {
      line(ctx, proj(from), proj(trunc[i]), col, lw);
      from = trunc[i];
    }
    if (trunc2) {
      line(ctx, proj(from), proj(trunc2[i]), col, lw);
      from = trunc2[i];
    }
    line(ctx, proj(from), proj(A), col, lw);
  }

  dot(ctx, proj(A), "rgba(255,255,255,.9)", 4);
  for (let i = 0; i < base.length; i++) {
    dot(ctx, proj(base[i]), i === hoverIndex ? "rgba(167,139,250,.95)" : "rgba(255,255,255,.6)", 3);
  }
  if (trunc) {
    for (let i = 0; i < trunc.length; i++) {
      dot(ctx, proj(trunc[i]), i === hoverIndex ? "rgba(167,139,250,.9)" : "rgba(110,231,255,.7)", 2.5);
    }
  }
  if (trunc2) {
    for (let i = 0; i < trunc2.length; i++) {
      dot(ctx, proj(trunc2[i]), i === hoverIndex ? "rgba(167,139,250,.95)" : "rgba(167,139,250,.85)", 3);
    }
  }

  // Surlignage face ou section au survol
  if (hoverFaceIndex != null) {
    const n = base.length;
    const i = (hoverFaceIndex + n) % n;
    const j = (i + 1) % n;
    const pts = [proj(base[i]), proj(base[j])];
    if (trunc2) pts.push(proj(trunc2[j]), proj(trunc2[i]));
    else if (trunc) pts.push(proj(trunc[j]), proj(trunc[i]));
    else pts.push(proj(A));
    poly(ctx, pts, "rgba(167,139,250,.35)", "rgba(167,139,250,.12)", 2);
  }
  if (hoverSection === "base") {
    poly(ctx, base.map(proj), "rgba(110,231,255,.4)", "rgba(110,231,255,.15)", 2);
  } else if (hoverSection === "trunc" && trunc) {
    poly(ctx, trunc.map(proj), "rgba(110,231,255,.5)", "rgba(110,231,255,.2)", 2);
  } else if (hoverSection === "trunc2" && trunc2) {
    poly(ctx, trunc2.map(proj), "rgba(167,139,250,.5)", "rgba(167,139,250,.2)", 2);
  }

  // Rapporteur (dièdre δ) au survol d'un arêtier
  if (hoverIndex != null && items && items[hoverIndex]) {
    const center = proj(base[hoverIndex]);
    const delta = items[hoverIndex].delta;
    const radius = maxR * 0.22;
    drawProtractor(ctx, center.x, center.y, delta, radius);
  }

  ctx.restore();
}

function drawProtractor(ctx, cx, cy, angleRad, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(167,139,250,.85)";
  ctx.fillStyle = "rgba(167,139,250,.12)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let deg = 0; deg <= 180; deg += 15) {
    const a = (-90 + deg) * Math.PI / 180;
    const r1 = radius - (deg % 30 === 0 ? 0.12 * radius : 0.05 * radius);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.stroke();
  }
  const lineAngle = -Math.PI / 2 + angleRad;
  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(lineAngle) * radius, Math.sin(lineAngle) * radius);
  ctx.stroke();
  const deg = (angleRad * 180 / Math.PI).toFixed(1);
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.textAlign = "center";
  ctx.fillText("δ = " + deg + "°", 0, -radius - 4);
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
