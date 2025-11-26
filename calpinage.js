function round2(x) {
    return Math.round(x * 100) / 100;
  }
  
  // Optimisation 2D simple (algo "shelf" / rayonnage)
  // On remplit le panneau de haut en bas par bandes horizontales.
  // Les pièces ne sont PAS tournées : longueur = sens vertical, largeur = horizontal.
  function optimizePanels2D(pieces, stockWidth, stockLength) {
    // pieces = [{id, label, length, width}]
    // On trie par longueur décroissante (on place les grandes d'abord)
    const sorted = pieces.slice().sort((a, b) => b.length - a.length);
  
    const panels = []; // { shelves: [{y, height, usedWidth}], usedHeight, pieces: [{...placement...}] }
  
    sorted.forEach(p => {
      let placed = false;
  
      for (const panel of panels) {
        if (placed) break;
  
        // Tenter de placer sur une étagère existante
        for (const shelf of panel.shelves) {
          if (p.length <= shelf.height && shelf.usedWidth + p.width <= stockWidth) {
            // place la pièce sur cette étagère
            const placement = {
              id: p.id,
              label: p.label,
              length: p.length,
              width: p.width,
              panelIndex: panels.indexOf(panel),
              x: shelf.usedWidth,
              y: shelf.y
            };
            panel.pieces.push(placement);
            shelf.usedWidth += p.width;
            placed = true;
            break;
          }
        }
  
        if (placed) break;
  
        // Tenter de créer une nouvelle étagère dans ce panneau
        const remainingHeight = stockLength - panel.usedHeight;
        if (p.length <= remainingHeight) {
          const shelf = {
            y: panel.usedHeight,
            height: p.length,
            usedWidth: p.width
          };
          panel.shelves.push(shelf);
          panel.usedHeight += p.length;
  
          const placement = {
            id: p.id,
            label: p.label,
            length: p.length,
            width: p.width,
            panelIndex: panels.indexOf(panel),
            x: 0,
            y: shelf.y
          };
          panel.pieces.push(placement);
          placed = true;
          break;
        }
      }
  
      // Si aucune place trouvée, on crée un nouveau panneau
      if (!placed) {
        const newPanel = {
          shelves: [],
          usedHeight: 0,
          pieces: []
        };
  
        const shelf = {
          y: 0,
          height: p.length,
          usedWidth: p.width
        };
        newPanel.shelves.push(shelf);
        newPanel.usedHeight = p.length;
  
        const placement = {
          id: p.id,
          label: p.label,
          length: p.length,
          width: p.width,
          panelIndex: panels.length,
          x: 0,
          y: 0
        };
        newPanel.pieces.push(placement);
  
        panels.push(newPanel);
      }
    });
  
    return panels;
  }
  
  // Dessin du calepinage des panneaux dans un SVG
  function drawPanelsLayout(svg, panels, stockWidth, stockLength) {
    if (!svg) return;
    const NS = "http://www.w3.org/2000/svg";
  
    const panelCount = panels.length;
    const width = 800;
    const height = Math.max(120, Math.min(panelCount * 260, 2000));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  
    // Nettoyage
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  
    if (panelCount === 0) {
      return;
    }
  
    const marginX = 40;
    const marginYTop = 20;
    const panelSpacing = 40; // espace vertical entre panneaux
  
    const availableHeight = height - marginYTop - panelSpacing;
    const perPanelHeight = availableHeight / panelCount;
    const panelDrawingHeight = perPanelHeight * 0.7; // 70% de la hauteur pour le panneau
    const panelDrawingWidth = width - 2 * marginX;
  
    const scaleX = panelDrawingWidth / stockWidth;
    const scaleY = panelDrawingHeight / stockLength;
  
    panels.forEach((panel, idx) => {
      const topY = marginYTop + idx * perPanelHeight;
  
      // Groupe pour ce panneau
      const g = document.createElementNS(NS, "g");
  
      // Label "Panneau n"
      const labelText = document.createElementNS(NS, "text");
      labelText.setAttribute("x", 10);
      labelText.setAttribute("y", topY + 10);
      labelText.setAttribute("font-size", "10");
      labelText.textContent = `Panneau ${idx + 1}`;
      g.appendChild(labelText);
  
      const panelRectY = topY + 20;
      const panelRect = document.createElementNS(NS, "rect");
      panelRect.setAttribute("x", marginX);
      panelRect.setAttribute("y", panelRectY);
      panelRect.setAttribute("width", panelDrawingWidth);
      panelRect.setAttribute("height", panelDrawingHeight);
      panelRect.setAttribute("fill", "#fdfdfd");
      panelRect.setAttribute("stroke", "#777");
      panelRect.setAttribute("stroke-width", "0.8");
      g.appendChild(panelRect);
  
      // Pièces dans ce panneau
      panel.pieces.forEach(piece => {
        const px = marginX + piece.width * scaleX;
        const py = panelRectY + piece.y * scaleY;
        const w = piece.width * scaleX;
        const h = piece.length * scaleY;
  
        const rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", marginX + piece.x * scaleX);
        rect.setAttribute("y", panelRectY + piece.y * scaleY);
        rect.setAttribute("width", w);
        rect.setAttribute("height", h);
        rect.setAttribute("fill", "#e0e0e0");
        rect.setAttribute("stroke", "#999");
        rect.setAttribute("stroke-width", "0.5");
        g.appendChild(rect);
  
        const text = document.createElementNS(NS, "text");
        text.setAttribute("x", marginX + piece.x * scaleX + w / 2);
        text.setAttribute("y", panelRectY + piece.y * scaleY + h / 2);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "9");
        text.textContent = `#${piece.id}`;
        g.appendChild(text);
      });
  
      svg.appendChild(g);
    });
  
    const footer = document.createElementNS(NS, "text");
    footer.setAttribute("x", width / 2);
    footer.setAttribute("y", height - 4);
    footer.setAttribute("text-anchor", "middle");
    footer.setAttribute("font-size", "10");
    footer.textContent = "Calepinage indicatif – proportions longueur/largeur respectées (sans trait de scie explicite).";
    svg.appendChild(footer);
  }
  
  // Gestion des lignes de pièces (formulaire)
  function attachPieceRemoveHandler(row) {
    const btn = row.querySelector(".piece-remove-btn");
    if (!btn) return;
  
    btn.addEventListener("click", () => {
      const container = document.getElementById("piecesContainer");
      const rows = container.querySelectorAll(".piece-row");
      if (rows.length <= 1) return; // garder au moins une ligne
      row.remove();
      // Re-numérotation
      Array.from(container.querySelectorAll(".piece-row")).forEach((r, i) => {
        const title = r.querySelector(".piece-title");
        const nameInput = r.querySelector(".piece-name");
        const index = i + 1;
        if (title) title.textContent = `Pièce ${index}`;
        if (nameInput && !nameInput.value) {
          nameInput.placeholder = `Pièce ${index}`;
        }
      });
    });
  }
  
  function addPieceRow() {
    const container = document.getElementById("piecesContainer");
    const index = container.querySelectorAll(".piece-row").length + 1;
  
    const div = document.createElement("div");
    div.className = "piece-row";
    div.innerHTML = `
      <div class="piece-header">
        <span class="piece-title">Pièce ${index}</span>
        <button type="button" class="piece-remove-btn">Supprimer</button>
      </div>
      <div class="grid piece-grid">
        <div>
          <label>Nom de la pièce</label>
          <input type="text" class="piece-name" placeholder="Pièce ${index}">
        </div>
        <div>
          <label>Longueur (sens principal) <span class="unit">(mm)</span></label>
          <input type="number" class="piece-length" value="800" min="1" required>
        </div>
        <div>
          <label>Largeur <span class="unit">(mm)</span></label>
          <input type="number" class="piece-width" value="400" min="1" required>
        </div>
        <div>
          <label>Quantité</label>
          <input type="number" class="piece-qty" value="1" min="1" required>
        </div>
      </div>
    `;
    container.appendChild(div);
    attachPieceRemoveHandler(div);
  }
  
  // Initialisation
  document.getElementById("addPieceBtn").addEventListener("click", addPieceRow);
  attachPieceRemoveHandler(document.querySelector(".piece-row"));
  
  document.getElementById("calpinageForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const errorDiv = document.getElementById("error");
    const resultsCard = document.getElementById("resultsCard");
    errorDiv.textContent = "";
    resultsCard.style.display = "none";
  
    const stockLength = parseFloat(document.getElementById("stockLength").value);
    const stockWidth = parseFloat(document.getElementById("stockWidth").value);
    const kerf = parseFloat(document.getElementById("kerf").value);
  
    if ([stockLength, stockWidth, kerf].some(v => isNaN(v) || v <= 0)) {
      errorDiv.textContent = "Vérifie que les dimensions du panneau et le trait de scie sont valides.";
      return;
    }
  
    const pieceRows = document.querySelectorAll(".piece-row");
    if (pieceRows.length === 0) {
      errorDiv.textContent = "Ajoute au moins une pièce.";
      return;
    }
  
    const pieceTypes = [];
    pieceRows.forEach((row, i) => {
      const nameInput = row.querySelector(".piece-name");
      const lenInput = row.querySelector(".piece-length");
      const widInput = row.querySelector(".piece-width");
      const qtyInput = row.querySelector(".piece-qty");
  
      const length = parseFloat(lenInput.value);
      const width = parseFloat(widInput.value);
      const qty = parseInt(qtyInput.value, 10);
      const baseLabel = `Pièce ${i + 1}`;
      const name = (nameInput.value || baseLabel).trim();
      const label = name || baseLabel;
  
      if ([length, width].some(v => isNaN(v) || v <= 0) || isNaN(qty) || qty <= 0) {
        errorDiv.textContent = `La ligne "${label}" a des dimensions ou une quantité invalides.`;
        throw new Error("Invalid piece row");
      }
  
      pieceTypes.push({
        label,
        length,
        width,
        qty
      });
    });
  
    if (errorDiv.textContent) {
      return;
    }
  
    // Génération des pièces individuelles
    let pieceId = 1;
    const allPieces = []; // pour la liste détaillée
    const piecesForPacking = []; // pour l'optimisation (avec largeur/longueur + kerf)
  
    pieceTypes.forEach(pt => {
      for (let i = 0; i < pt.qty; i++) {
        const finishedLength = pt.length;
        const finishedWidth = pt.width;
  
        // On intègre le trait de scie comme jeu autour de la pièce :
        const packedLength = finishedLength + kerf;
        const packedWidth = finishedWidth + kerf;
  
        allPieces.push({
          id: pieceId,
          label: pt.label,
          length: finishedLength,
          width: finishedWidth
        });
  
        piecesForPacking.push({
          id: pieceId,
          label: pt.label,
          length: packedLength,
          width: packedWidth
        });
  
        pieceId++;
      }
    });
  
    // Résumé
    const totalPieces = allPieces.length;
    const totalArea = allPieces.reduce((s, p) => s + p.length * p.width, 0);
    const panelArea = stockLength * stockWidth;
  
    const summaryDiv = document.getElementById("summary");
    summaryDiv.innerHTML = `
      <p>
        <strong>Types de pièces :</strong> ${pieceTypes.length}<br>
        <strong>Nombre total de pièces :</strong> ${totalPieces}<br>
        <strong>Dimension panneau brut :</strong> ${stockLength} × ${stockWidth} mm<br>
        <strong>Trait de scie / jeu :</strong> ${kerf} mm (ajouté en longueur et largeur pour le calepinage)
      </p>
      <p class="muted">
        Surface totale des pièces (sans jeu) : ${round2(totalArea / 1_000_000)} m²<br>
        Surface d'un panneau : ${round2(panelArea / 1_000_000)} m²
      </p>
    `;
  
    // Liste détaillée
    const cutListDetailedDiv = document.getElementById("cutListDetailed");
    if (allPieces.length === 0) {
      cutListDetailedDiv.innerHTML = "";
    } else {
      let rowsDet = "";
      allPieces.forEach(p => {
        rowsDet += `
          <tr>
            <td>${p.id}</td>
            <td>${p.label}</td>
            <td>${p.length.toFixed(0)} × ${p.width.toFixed(0)} mm</td>
          </tr>
        `;
      });
  
      cutListDetailedDiv.innerHTML = `
        <h3>Liste des pièces</h3>
        <p class="muted">
          Chaque pièce est numérotée (#N°). Les dimensions indiquées sont les dimensions finies,
          sans le jeu / trait de scie.
        </p>
        <table>
          <tr>
            <th>N° pièce</th>
            <th>Nom</th>
            <th>Dimensions finies</th>
          </tr>
          ${rowsDet}
        </table>
      `;
    }
  
    // Optimisation 2D
    const optimizationDiv = document.getElementById("optimization");
    if (piecesForPacking.length === 0) {
      optimizationDiv.innerHTML = `
        <h3>Optimisation des panneaux</h3>
        <p>Aucune pièce à placer.</p>
      `;
      drawPanelsLayout(document.getElementById("boardsSvg"), [], stockWidth, stockLength);
    } else {
      const panels = optimizePanels2D(piecesForPacking, stockWidth, stockLength);
  
      let totalUsedArea = 0;
      panels.forEach(panel => {
        panel.pieces.forEach(p => {
          totalUsedArea += p.length * p.width;
        });
      });
      const totalPanels = panels.length;
      const totalPanelArea = panelArea * totalPanels;
      const wasteArea = totalPanelArea - totalUsedArea;
      const efficiency = totalPanelArea > 0 ? (totalUsedArea / totalPanelArea) * 100 : 0;
  
      let rowsBoards = "";
      panels.forEach((panel, idx) => {
        const desc = panel.pieces
          .map(p => `#${p.id} (${p.label} : ${p.length.toFixed(0)}×${p.width.toFixed(0)})`)
          .join(" | ");
        rowsBoards += `
          <tr>
            <td>${idx + 1}</td>
            <td class="text-left">${desc || "-"}</td>
          </tr>
        `;
      });
  
      optimizationDiv.innerHTML = `
        <h3>Optimisation des panneaux</h3>
        <p class="muted">
          Algorithme de calepinage simplifié (placement par bandes horizontales, sans rotation des pièces).
          Les panneaux sont remplis de haut en bas et de gauche à droite.
        </p>
        <table>
          <tr>
            <th># Panneau</th>
            <th class="text-left">Pièces contenues</th>
          </tr>
          ${rowsBoards}
        </table>
        <p>
          <strong>Nombre de panneaux nécessaires :</strong> ${totalPanels}
        </p>
        <p class="muted">
          Surface utilisée (avec jeu) : ${round2(totalUsedArea / 1_000_000)} m²<br>
          Surface totale des panneaux : ${round2(totalPanelArea / 1_000_000)} m²<br>
          Rendement approximatif : ${round2(efficiency)} %
        </p>
      `;
  
      // Dessin
      const svg = document.getElementById("boardsSvg");
      drawPanelsLayout(svg, panels, stockWidth, stockLength);
    }
  
    resultsCard.style.display = "block";
  });
  