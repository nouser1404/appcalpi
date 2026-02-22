import { sub, norm, mul, vec } from "./geometry.js";

function projectIso(p){
  // projection isométrique simple
  const x = p.x - p.y;
  const y = (p.x + p.y)*0.5 - p.z;
  return {x,y};
}

/** Retourne les sommets d'un polygone "intérieur" en reculant de epaisseur vers le centre. */
function innerPolygon(vertices, center, radius, epaisseur) {
  if (epaisseur <= 0 || radius <= 1e-6) return vertices;
  const f = 1 - epaisseur / radius;
  if (f <= 0) return vertices;
  return vertices.map(v => ({
    x: center.x + (v.x - center.x) * f,
    y: center.y + (v.y - center.y) * f,
    z: center.z + (v.z - center.z) * f
  }));
}

export function draw(ctx, model, hoverIndex, epaisseur = 0){
  const {A, base, trunc, trunc2, radiusTrunc, radiusTrunc2, centerTrunc, centerTrunc2} = model;
  const R = norm(base[0] ? sub(base[0], {x:0,y:0,z:0}) : 1);

  // clear
  ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);

  // frame
  ctx.save();
  ctx.translate(ctx.canvas.width*0.5, ctx.canvas.height*0.62);

  // scale to fit
  const maxR = Math.max(...base.map(v => norm(sub(v, {x:0,y:0,z:0}))));
  const s = Math.min(ctx.canvas.width, ctx.canvas.height) / (maxR*4.2);
  ctx.scale(s,s);

  const centerBase = vec(0,0,0);

  // base: contour extérieur puis intérieur (épaisseur)
  poly(ctx, base.map(projectIso), "rgba(255,255,255,.22)", "rgba(255,255,255,.12)", 2);
  if (epaisseur > 0 && R > epaisseur) {
    const baseInner = innerPolygon(base, centerBase, R, epaisseur);
    poly(ctx, baseInner.map(projectIso), "rgba(255,255,255,.08)", "rgba(110,231,255,.12)", 1.5);
  }

  // première troncature
  if(trunc){
    poly(ctx, trunc.map(projectIso), "rgba(110,231,255,.30)", "rgba(110,231,255,.14)", 2);
    if (epaisseur > 0 && centerTrunc && radiusTrunc > epaisseur) {
      const truncInner = innerPolygon(trunc, centerTrunc, radiusTrunc, epaisseur);
      poly(ctx, truncInner.map(projectIso), "rgba(110,231,255,.12)", "rgba(110,231,255,.08)", 1.5);
    }
  }

  // deuxième troncature
  if(trunc2){
    poly(ctx, trunc2.map(projectIso), "rgba(167,139,250,.35)", "rgba(167,139,250,.18)", 2);
    if (epaisseur > 0 && centerTrunc2 && radiusTrunc2 > epaisseur) {
      const trunc2Inner = innerPolygon(trunc2, centerTrunc2, radiusTrunc2, epaisseur);
      poly(ctx, trunc2Inner.map(projectIso), "rgba(167,139,250,.14)", "rgba(167,139,250,.10)", 1.5);
    }
  }

  // draw edges A->Vi
  for(let i=0;i<base.length;i++){
    const pA = projectIso(A);
    const pV = projectIso(base[i]);
    const isHover = (i === hoverIndex);
    line(ctx, pA, pV, isHover ? "rgba(167,139,250,.95)" : "rgba(255,255,255,.20)", isHover ? 3 : 1.5);
  }

  // apex
  dot(ctx, projectIso(A), "rgba(255,255,255,.85)", 4);

  // vertices
  for(let i=0;i<base.length;i++){
    dot(ctx, projectIso(base[i]), i===hoverIndex ? "rgba(167,139,250,.95)" : "rgba(255,255,255,.55)", 3);
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
