(function () {
  "use strict";

  var DPI = 150; // render resolution used for both screen preview and PDF export
  var MM_PER_IN = 25.4;
  function mm2px(mm) { return (mm / MM_PER_IN) * DPI; }

  var PAPER_MM = {
    letter: { w: 215.9, h: 279.4 },
    a4:     { w: 210,   h: 297   },
    legal:  { w: 215.9, h: 355.6 }
  };

  var PRESETS = {
    broadedge: {
      unitHeight: 24,
      showSlant: false,
      slantAngle: 55,
      lines: [
        { name: "Ascender",  offset: 14, style: "dashed", color: "#2f6fed", thickness: 0.3 },
        { name: "Waistline", offset: 7,  style: "dashed", color: "#2f6fed", thickness: 0.3 },
        { name: "Baseline",  offset: 0,  style: "solid",  color: "#2f6fed", thickness: 0.5 },
        { name: "Descender", offset: -7, style: "dashed", color: "#2f6fed", thickness: 0.3 }
      ]
    },
    copperplate: {
      unitHeight: 26,
      showSlant: true,
      slantAngle: 55,
      lines: [
        { name: "Waistline", offset: 6, style: "dashed", color: "#2f6fed", thickness: 0.3 },
        { name: "Baseline",  offset: 0, style: "solid",  color: "#2f6fed", thickness: 0.5 }
      ]
    },
    simple: {
      unitHeight: 20,
      showSlant: false,
      slantAngle: 55,
      lines: [
        { name: "Baseline", offset: 0, style: "solid", color: "#2f6fed", thickness: 0.5 }
      ]
    }
  };

  var nextLineId = 1;
  function withIds(lines) {
    return lines.map(function (l) {
      return Object.assign({ id: nextLineId++ }, l);
    });
  }

  var state = {
    paperSize: "a4",
    orientation: "portrait",
    marginLR: 15,
    marginTB: 15,
    pageCount: 1,

    unitHeight: 24,
    lines: withIds(PRESETS.broadedge.lines),

    showSlant: false,
    slantAngle: 55,
    slantSpacing: 12,
    slantStyle: "dashed",
    slantColor: "#9aa3af",
    slantThickness: 0.3,

    showPhoto: false,
    photo: {
      img: null,
      opacity: 60,
      scale: 100,
      rotation: 0,
      x: 0,
      y: 0
    }
  };

  var canvas = document.getElementById("sheetCanvas");
  var ctx = canvas.getContext("2d");

  // ---------- element refs ----------
  var el = {};
  [
    "paperSize", "orientation", "marginLR", "marginTB", "pageCount",
    "showPhoto", "photoInput", "photoOpacity", "photoScale", "photoRotation", "fitPhotoBtn",
    "preset", "unitHeight", "linesList", "addLineBtn",
    "showSlant", "slantAngle", "slantAngleOut", "slantSpacing", "slantStyle", "slantColor", "slantThickness",
    "downloadBtn", "pageInfo"
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  var lineRowTemplate = document.getElementById("lineRowTemplate");

  // ---------- geometry ----------
  function pageSizeMM() {
    var base = PAPER_MM[state.paperSize];
    if (state.orientation === "landscape") {
      return { w: base.h, h: base.w };
    }
    return { w: base.w, h: base.h };
  }

  function layoutCanvas() {
    var mm = pageSizeMM();
    canvas.width = Math.round(mm2px(mm.w));
    canvas.height = Math.round(mm2px(mm.h));
  }

  // ---------- drawing ----------
  function drawHLine(y, x, w, color, style, thicknessMm) {
    if (y < -1 || y > canvas.height + 1) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.6, mm2px(thicknessMm));
    if (style === "dashed") ctx.setLineDash([mm2px(2), mm2px(1.2)]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawGuideLines() {
    var mm = pageSizeMM();
    var marginL = mm2px(state.marginLR);
    var marginR = mm2px(state.marginLR);
    var marginT = mm2px(state.marginTB);
    var marginB = mm2px(state.marginTB);

    var pageW = canvas.width;
    var pageH = canvas.height;
    var drawX = marginL;
    var drawY = marginT;
    var drawW = pageW - marginL - marginR;
    var drawH = pageH - marginT - marginB;

    if (drawW <= 0 || drawH <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX, drawY, drawW, drawH);
    ctx.clip();

    // slant guide lines (drawn first, underneath horizontal lines)
    if (state.showSlant) {
      var angleRad = (state.slantAngle * Math.PI) / 180;
      var dxTotal = drawH / Math.tan(angleRad);
      var spacingPx = mm2px(state.slantSpacing);
      ctx.strokeStyle = state.slantColor;
      ctx.lineWidth = Math.max(0.6, mm2px(state.slantThickness));
      if (state.slantStyle === "dashed") ctx.setLineDash([mm2px(2), mm2px(1.2)]);
      else ctx.setLineDash([]);
      var startX = drawX - Math.abs(dxTotal) - spacingPx;
      var endX = drawX + drawW + Math.abs(dxTotal) + spacingPx;
      for (var x0 = startX; x0 <= endX; x0 += spacingPx) {
        ctx.beginPath();
        ctx.moveTo(x0, drawY + drawH);
        ctx.lineTo(x0 + dxTotal, drawY);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // horizontal rule sets, built from the user's custom line list
    if (state.lines.length > 0) {
      var unitHeightPx = mm2px(Math.max(1, state.unitHeight));
      var maxAbove = 0, maxBelow = 0;
      state.lines.forEach(function (l) {
        if (l.offset > maxAbove) maxAbove = l.offset;
        if (-l.offset > maxBelow) maxBelow = -l.offset;
      });
      var maxAbovePx = mm2px(maxAbove);
      var maxBelowPx = mm2px(maxBelow);

      var baselineY = drawY + maxAbovePx;
      while (baselineY - maxBelowPx <= drawY + drawH + 1) {
        state.lines.forEach(function (l) {
          var y = baselineY - mm2px(l.offset);
          drawHLine(y, drawX, drawW, l.color, l.style, l.thickness);
        });
        baselineY += unitHeightPx;
      }
    }

    ctx.restore();
  }

  function drawPhoto() {
    var p = state.photo;
    if (!p.img) return;
    ctx.save();
    var cx = canvas.width / 2 + p.x;
    var cy = canvas.height / 2 + p.y;
    ctx.translate(cx, cy);
    ctx.rotate((p.rotation * Math.PI) / 180);
    var scale = p.scale / 100;
    var iw = p.img.width * scale;
    var ih = p.img.height * scale;
    ctx.globalAlpha = p.opacity / 100;
    ctx.drawImage(p.img, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  }

  function render() {
    layoutCanvas();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.showPhoto) drawPhoto();
    drawGuideLines();

    var mm = pageSizeMM();
    el.pageInfo.textContent =
      "Preview — page 1 of " + state.pageCount +
      " · " + mm.w.toFixed(0) + " × " + mm.h.toFixed(0) + " mm";
  }

  // ---------- lines list UI ----------
  function renderLinesList() {
    el.linesList.innerHTML = "";
    state.lines.forEach(function (line) {
      var frag = lineRowTemplate.content.cloneNode(true);
      var row = frag.querySelector(".line-row");
      var nameInput = row.querySelector(".line-name");
      var offsetInput = row.querySelector(".line-offset");
      var styleSelect = row.querySelector(".line-style");
      var colorInput = row.querySelector(".line-color");
      var thicknessInput = row.querySelector(".line-thickness");
      var deleteBtn = row.querySelector(".line-delete");

      nameInput.value = line.name;
      offsetInput.value = line.offset;
      styleSelect.value = line.style;
      colorInput.value = line.color;
      thicknessInput.value = line.thickness;

      nameInput.addEventListener("input", function () { line.name = nameInput.value; });
      offsetInput.addEventListener("input", function () {
        line.offset = parseFloat(offsetInput.value) || 0;
        render();
      });
      styleSelect.addEventListener("change", function () {
        line.style = styleSelect.value;
        render();
      });
      colorInput.addEventListener("input", function () {
        line.color = colorInput.value;
        render();
      });
      thicknessInput.addEventListener("input", function () {
        line.thickness = parseFloat(thicknessInput.value) || 0.3;
        render();
      });
      deleteBtn.addEventListener("click", function () {
        state.lines = state.lines.filter(function (l) { return l.id !== line.id; });
        renderLinesList();
        render();
      });

      el.linesList.appendChild(row);
    });
  }

  el.addLineBtn.addEventListener("click", function () {
    state.lines.push({
      id: nextLineId++,
      name: "New line",
      offset: 0,
      style: "solid",
      color: "#2f6fed",
      thickness: 0.3
    });
    renderLinesList();
    render();
  });

  // ---------- UI wiring ----------
  function bindNumber(id, key, isFloat) {
    el[id].addEventListener("input", function () {
      state[key] = isFloat ? parseFloat(this.value) || 0 : parseInt(this.value, 10) || 0;
      render();
    });
  }
  function bindSelect(id, key) {
    el[id].addEventListener("change", function () {
      state[key] = this.value;
      render();
    });
  }

  bindSelect("paperSize", "paperSize");
  bindSelect("orientation", "orientation");
  bindNumber("marginLR", "marginLR", true);
  bindNumber("marginTB", "marginTB", true);
  bindNumber("pageCount", "pageCount", false);
  bindNumber("unitHeight", "unitHeight", true);

  el.showSlant.addEventListener("change", function () {
    state.showSlant = this.checked;
    render();
  });
  bindNumber("slantSpacing", "slantSpacing", true);
  bindSelect("slantStyle", "slantStyle");
  el.slantColor.addEventListener("input", function () {
    state.slantColor = this.value;
    render();
  });
  el.slantThickness.addEventListener("input", function () {
    state.slantThickness = parseFloat(this.value) || 0.3;
    render();
  });
  el.slantAngle.addEventListener("input", function () {
    state.slantAngle = parseInt(this.value, 10);
    el.slantAngleOut.textContent = state.slantAngle + "°";
    render();
  });

  el.preset.addEventListener("change", function () {
    var p = PRESETS[this.value];
    if (!p) return;
    state.unitHeight = p.unitHeight;
    state.showSlant = p.showSlant;
    state.slantAngle = p.slantAngle;
    state.lines = withIds(p.lines);

    el.unitHeight.value = state.unitHeight;
    el.showSlant.checked = state.showSlant;
    el.slantAngle.value = state.slantAngle;
    el.slantAngleOut.textContent = state.slantAngle + "°";
    renderLinesList();
    render();
  });

  // photo toggle + upload
  el.showPhoto.addEventListener("change", function () {
    state.showPhoto = this.checked;
    render();
  });

  el.photoInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (evt) {
      var img = new Image();
      img.onload = function () {
        state.photo.img = img;
        state.photo.x = 0;
        state.photo.y = 0;
        state.showPhoto = true;
        el.showPhoto.checked = true;
        fitPhoto();
        render();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  el.photoOpacity.addEventListener("input", function () {
    state.photo.opacity = parseInt(this.value, 10);
    render();
  });
  el.photoScale.addEventListener("input", function () {
    state.photo.scale = parseInt(this.value, 10);
    render();
  });
  el.photoRotation.addEventListener("input", function () {
    state.photo.rotation = parseInt(this.value, 10);
    render();
  });

  function fitPhoto() {
    var p = state.photo;
    if (!p.img) return;
    var mm = pageSizeMM();
    var marginL = mm2px(state.marginLR);
    var marginT = mm2px(state.marginTB);
    var drawW = mm2px(mm.w) - marginL * 2;
    var drawH = mm2px(mm.h) - marginT * 2;
    var scale = Math.min(drawW / p.img.width, drawH / p.img.height) * 100;
    p.scale = Math.max(10, Math.min(300, Math.round(scale)));
    p.rotation = 0;
    p.x = 0;
    p.y = 0;
    el.photoScale.value = p.scale;
    el.photoRotation.value = 0;
  }

  el.fitPhotoBtn.addEventListener("click", function () {
    fitPhoto();
    render();
  });

  // drag photo on canvas
  var dragging = false;
  var dragStart = { x: 0, y: 0, px: 0, py: 0, f: 1 };

  function canvasScaleFactor() {
    var rect = canvas.getBoundingClientRect();
    return canvas.width / rect.width;
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (!state.showPhoto || !state.photo.img) return;
    dragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragStart.px = state.photo.x;
    dragStart.py = state.photo.y;
    dragStart.f = canvasScaleFactor();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = (e.clientX - dragStart.x) * dragStart.f;
    var dy = (e.clientY - dragStart.y) * dragStart.f;
    state.photo.x = dragStart.px + dx;
    state.photo.y = dragStart.py + dy;
    render();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (evt) {
    canvas.addEventListener(evt, function () { dragging = false; });
  });

  // ---------- PDF export ----------
  el.downloadBtn.addEventListener("click", function () {
    render();
    var mm = pageSizeMM();
    var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFCtor) {
      alert("PDF library failed to load. Please check your internet connection and try again.");
      return;
    }
    var doc = new jsPDFCtor({
      orientation: "portrait",
      unit: "mm",
      format: [mm.w, mm.h]
    });

    var dataUrl = canvas.toDataURL("image/png", 1.0);
    doc.addImage(dataUrl, "PNG", 0, 0, mm.w, mm.h);

    var count = Math.max(1, Math.min(30, state.pageCount || 1));
    for (var i = 1; i < count; i++) {
      doc.addPage([mm.w, mm.h], "portrait");
      doc.addImage(dataUrl, "PNG", 0, 0, mm.w, mm.h);
    }

    doc.save("calligraphy-guide-sheet.pdf");
  });

  // ---------- init ----------
  el.slantAngleOut.textContent = state.slantAngle + "°";
  renderLinesList();
  render();
})();
