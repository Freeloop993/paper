const outputSize = 1024;

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("");
}

async function renderPng(svg) {
  const source = svg.cloneNode(true);
  source.querySelectorAll("[data-annotation]").forEach(node => node.remove());
  source.setAttribute("width", outputSize);
  source.setAttribute("height", outputSize);
  const xml = new XMLSerializer().serializeToString(source);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(img, 0, 0, outputSize, outputSize);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG 编码失败")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadLayout(svg, design, kind) {
  const { x, y, width, height } = svg.viewBox.baseVal;
  if (width !== height || width <= 0) throw new Error("定位图画布必须为正方形");
  const factor = outputSize / width;
  const g = design.geometry;
  const hubs = design.hubs.map(p => ({
    id: p.id, x_px: (p.x-x)*factor, y_px: (p.y-y)*factor, x_cm: p.x_cm, y_cm: p.y_cm,
  }));
  const rendered = Array.from(svg.querySelectorAll("circle[data-rotor]"));
  if (rendered.length !== hubs.length || rendered.some((node,i) => node.dataset.rotor !== hubs[i].id ||
      Math.abs((node.cx.baseVal.value-x)*factor-hubs[i].x_px) > .01 ||
      Math.abs((node.cy.baseVal.value-y)*factor-hubs[i].y_px) > .01)) {
    throw new Error("请等布局刷新后再导出");
  }
  const png = await renderPng(svg);
  const pngHash = await sha256(await png.arrayBuffer());
  const record = {
    schema: "desktop-drone-layout-v2", view: "top", brief: design.brief,
    parameters: g, prompt: design.prompt,
    image: { width_px: outputSize, height_px: outputSize, sha256: pngHash },
    coordinates: { origin: "top-left", cm_origin: "frame center", x_positive: "right (nose)",
      y_positive: "down", pixels_per_cm: design.scale*factor },
    motor_centers: hubs,
  };
  const tag = await sha256(new TextEncoder().encode(JSON.stringify(record)));
  const stem = "drone-" + g.rotorType + "-" + g.frameType + "-" + tag.slice(0, 12);
  record.image.filename = stem + ".png";
  const data = kind === "png" ? png : new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = stem + "." + kind;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
