var Form342 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    download: () => download,
    drawGuide: () => drawGuide,
    imageAsset: () => imageAsset,
    layoutFor: () => layoutFor
  });

  // src/design/design.ts
  function projectedTips(hubs, radius) {
    return hubs.flatMap((hub) => {
      const distance = Math.hypot(hub.x_mm, hub.y_mm);
      const dx = -hub.y_mm / distance * radius;
      const dy = hub.x_mm / distance * radius;
      return [-1, 1].map((sign) => ({
        hub: hub.id,
        x_px: hub.x_px + sign * dx,
        y_px: hub.y_px + sign * dy
      }));
    });
  }
  function layoutFor(parameters, inputs, drawingScale) {
    const frame = parameters.frame.frame_type;
    const n = inputs.task === "quad" ? 4 : 6;
    const half = frame === "Wide X" ? 58 : frame === "Stretch X" ? 32 : frame === "Deadcat" ? 65 : 45;
    const preset = n === 6 ? [-30, 30, 90, 150, 210, 270] : frame === "+ Configuration" ? [0, 90, 180, 270] : [-half, half, frame === "Deadcat" ? 145 : 180 - half, frame === "Deadcat" ? 215 : 180 + half];
    let angles = preset;
    if (inputs.gaps.trim()) {
      const parts = inputs.gaps.trim().split(/[\s,，、;；-]+/);
      const gaps = parts.map(Number);
      if (parts.length !== n || parts.some((s) => !/^\d+(?:\.\d+)?$/.test(s)) || gaps.some((v) => v <= 0 || v >= 180) || Math.abs(gaps.reduce((s, v) => s + v, 0) - 360) > 1e-5)
        throw new Error("请填写 " + n + " 个大于 0°、小于 180°的相邻夹角，总和须为 360°。");
      let a = frame === "+ Configuration" ? 0 : -gaps[0] / 2;
      angles = gaps.map((gap) => {
        const bearing = a;
        a += gap;
        return bearing;
      });
    }
    const span = parameters.frame.wheelbase_mm;
    if (!Number.isFinite(span) || span <= 0) throw new Error("最大电机中心距须为正数。");
    const unit = angles.map((angle, i) => {
      const r = frame === "Deadcat" && i >= 2 ? 0.82 : 1;
      const a = angle * Math.PI / 180;
      return { x: r * Math.sin(a), y: -r * Math.cos(a) };
    });
    const maxDistance = Math.max(...unit.flatMap((a, i) => unit.slice(i + 1).map((b) => Math.hypot(b.x - a.x, b.y - a.y))));
    const mm = unit.map((p) => ({ x: p.x * span / maxDistance, y: p.y * span / maxDistance }));
    const pxPerMm = drawingScale ?? 800 / (n === 4 ? 500 : 3e3);
    if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) throw new Error("定位图比例尺须为正数。");
    if (mm.some((p) => Math.max(Math.abs(p.x), Math.abs(p.y)) * pxPerMm > 496))
      throw new Error("当前参数超出本任务定位图的固定比例尺。");
    const hubs = mm.map((p, i) => ({
      id: "R" + (i + 1),
      x_mm: p.x,
      y_mm: p.y,
      x_px: 512 + p.x * pxPerMm,
      y_px: 512 + p.y * pxPerMm
    }));
    const withTips = n === 4 && inputs.route === "guide" && inputs.guideTips;
    const radius = parameters.propulsion.prop_diameter_inch * 25.4 * pxPerMm / 2;
    if (withTips && parameters.propulsion.motor_tilt_degree !== 0)
      throw new Error("等距叶尖定位适用于 0° 电机倾角。请调整倾角或取消叶尖定位。");
    if (withTips && !(Number.isFinite(radius) && radius > 0)) throw new Error("桨径须为正数。");
    const bladeTips = withTips ? projectedTips(hubs, radius) : [];
    if (bladeTips.some((p) => Math.min(p.x_px, p.y_px, 1024 - p.x_px, 1024 - p.y_px) < 6))
      throw new Error("叶尖超出定位图。请调整桨径或轴距，或取消叶尖定位。");
    let links = hubs.map((p) => [512, 512, p.x_px, p.y_px]);
    if (frame === "H-Frame") {
      const [fl, fr, rr, rl] = hubs;
      links = [
        [fl.x_px, fl.y_px, rl.x_px, rl.y_px],
        [fr.x_px, fr.y_px, rr.x_px, rr.y_px],
        [(fl.x_px + rl.x_px) / 2, (fl.y_px + rl.y_px) / 2, (fr.x_px + rr.x_px) / 2, (fr.y_px + rr.y_px) / 2]
      ];
    }
    return {
      ...inputs.task === "quad" && inputs.route === "guide" && inputs.guideNose ? { noseMarker: true } : {},
      size: 1024,
      nose: "up",
      origin: "top-left",
      mm_origin: "frame-center",
      pxPerMm,
      max_motor_distance_mm: span,
      hubs,
      links,
      bladeTips,
      adjacent_deg: angles.map((a, i) => (angles[(i + 1) % n] - a + 360) % 360),
      r1_clockwise_from_nose_deg: (angles[0] + 360) % 360
    };
  }
  function drawGuide(canvas, layout, lines, bladeLines = false) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法绘制定位图。");
    canvas.width = canvas.height = layout.size;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, layout.size, layout.size);
    if (lines) {
      ctx.strokeStyle = "#205cff";
      ctx.lineWidth = 3;
      for (const [x, y, u, v] of layout.links) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(u, v);
        ctx.stroke();
      }
    }
    if (layout.noseMarker) {
      const center = layout.size / 2;
      ctx.strokeStyle = "#eeeeee";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(center, center - 18);
      ctx.lineTo(center, center - 64);
      ctx.moveTo(center - 10, center - 49);
      ctx.lineTo(center, center - 64);
      ctx.lineTo(center + 10, center - 49);
      ctx.stroke();
    }
    if (bladeLines) {
      ctx.strokeStyle = "#00b6bc";
      ctx.lineWidth = 3;
      for (const hub of layout.hubs) {
        const pair = layout.bladeTips.filter((t) => t.hub === hub.id);
        if (pair.length !== 2) continue;
        ctx.beginPath();
        ctx.moveTo(pair[0].x_px, pair[0].y_px);
        ctx.lineTo(pair[1].x_px, pair[1].y_px);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#00ffff";
    for (const tip of layout.bladeTips) {
      ctx.beginPath();
      ctx.arc(tip.x_px, tip.y_px, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ff0000";
    const nearest = Math.min(...layout.hubs.flatMap((a, i) => layout.hubs.slice(i + 1).map((b) => Math.hypot(a.x_px - b.x_px, a.y_px - b.y_px))));
    if (nearest < 4) throw new Error("所设夹角让两个轴心在 1024 像素画布上过近，请增大间距。");
    for (const h of layout.hubs) {
      ctx.beginPath();
      ctx.arc(h.x_px, h.y_px, Math.min(10, nearest / 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // src/design/versions.ts
  async function hash(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  async function imageAsset(file) {
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error("请选择 12 MB 以内的 PNG 或 JPEG。");
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("文件读取失败。"));
      r.readAsDataURL(file);
    });
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    return { dataUrl, mime: file.type, width: img.naturalWidth, height: img.naturalHeight, sha256: await hash(await file.arrayBuffer()) };
  }
  function download(file, url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    document.body.append(a);
    a.click();
    a.remove();
  }
  return __toCommonJS(stdin_exports);
})();
