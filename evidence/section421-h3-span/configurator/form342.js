(() => {
  // src/design/design.ts
  function newInputs(task) {
    const quad = task === "quad";
    const target = quad ? "\u6574\u673A\u3001\u822A\u62CD\u76F8\u673A\u548C\u673A\u81C2" : "\u836F\u7BB1\u4E0E\u4E2D\u592E\u673A\u67B6\u3001\u55B7\u6D12\u7EC4\u4EF6\u4E0E\u652F\u81C2";
    const change = quad ? "\u63A2\u7D22\u9002\u5408\u65E5\u5E38\u643A\u5E26\u7684\u6574\u673A\u65B9\u6848\u3002" : "\u660E\u786E\u836F\u7BB1\u627F\u6258\u9762\uFF0C\u8BA9\u55B7\u6D12\u4EF6\u7684\u5B89\u88C5\u4F4D\u7F6E\u548C\u7BA1\u8DEF\u8FDE\u63A5\u53EF\u8FA8\u3002";
    const keep = quad ? "\u4FDD\u7559\u56DB\u4E2A\u7535\u673A\u8F74\u5FC3\u3001\u76F8\u8FDE\u7684\u673A\u81C2\u548C\u524D\u5411\u76F8\u673A\u3002" : "\u4FDD\u7559\u516D\u4E2A\u7535\u673A\u8F74\u5FC3\u3001\u4E2D\u592E\u836F\u7BB1\u548C\u55B7\u6D12\u7EC4\u4EF6\u3002";
    const free = quad ? "\u673A\u8EAB\u5916\u8F6E\u5ED3\u3001\u76F8\u673A\u5B89\u88C5\u4F4D\u7F6E\u4E0E\u63A5\u5408\u65B9\u5F0F\u3001\u673A\u81C2\u8FC7\u6E21\u3001\u58F3\u4F53\u66F2\u9762\u548C\u5206\u4EF6\u53EF\u63A2\u7D22\u3002" : "\u673A\u8EAB\u5916\u8F6E\u5ED3\u3001\u58F3\u4F53\u66F2\u9762\u3001\u5206\u4EF6\u548C\u914D\u8272\u53EF\u63A2\u7D22\u3002";
    return {
      task,
      need: quad ? "\u8BBE\u8BA1\u4E00\u53F0\u4FBF\u4E8E\u65E5\u5E38\u643A\u5E26\u7684\u822A\u62CD\u56DB\u65CB\u7FFC\u3002" : "\u8BBE\u8BA1\u4E00\u53F0\u7528\u4E8E\u7530\u95F4\u55B7\u6D12\u7684\u519C\u4E1A\u690D\u4FDD\u516D\u65CB\u7FFC\u3002",
      source: "\u4F5C\u8005\u786E\u8BA4\u7684\u8BBE\u8BA1\u7B80\u62A5",
      target,
      change,
      keep,
      free,
      method: "structured",
      instruction: [change, keep, free].join("\n"),
      view: "top",
      route: "guide",
      guideLines: quad,
      guideTips: quad,
      guideBladeLines: quad,
      applyCmf: quad,
      shellFinish: "matte",
      gaps: "",
      groups: []
    };
  }
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
        throw new Error("\u8BF7\u586B\u5199 " + n + " \u4E2A\u5927\u4E8E 0\xB0\u3001\u5C0F\u4E8E 180\xB0\u7684\u76F8\u90BB\u5939\u89D2\uFF0C\u603B\u548C\u987B\u4E3A 360\xB0\u3002");
      let a = frame === "+ Configuration" ? 0 : -gaps[0] / 2;
      angles = gaps.map((gap) => {
        const bearing = a;
        a += gap;
        return bearing;
      });
    }
    const span = parameters.frame.wheelbase_mm;
    if (!Number.isFinite(span) || span <= 0) throw new Error("\u6700\u5927\u7535\u673A\u4E2D\u5FC3\u8DDD\u987B\u4E3A\u6B63\u6570\u3002");
    const unit = angles.map((angle, i) => {
      const r = frame === "Deadcat" && i >= 2 ? 0.82 : 1;
      const a = angle * Math.PI / 180;
      return { x: r * Math.sin(a), y: -r * Math.cos(a) };
    });
    const maxDistance = Math.max(...unit.flatMap((a, i) => unit.slice(i + 1).map((b) => Math.hypot(b.x - a.x, b.y - a.y))));
    const mm = unit.map((p) => ({ x: p.x * span / maxDistance, y: p.y * span / maxDistance }));
    const pxPerMm = drawingScale ?? 800 / (n === 4 ? 500 : 3e3);
    if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) throw new Error("\u5B9A\u4F4D\u56FE\u6BD4\u4F8B\u5C3A\u987B\u4E3A\u6B63\u6570\u3002");
    if (mm.some((p) => Math.max(Math.abs(p.x), Math.abs(p.y)) * pxPerMm > 496))
      throw new Error("\u5F53\u524D\u53C2\u6570\u8D85\u51FA\u672C\u4EFB\u52A1\u5B9A\u4F4D\u56FE\u7684\u56FA\u5B9A\u6BD4\u4F8B\u5C3A\u3002");
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
      throw new Error("\u7B49\u8DDD\u53F6\u5C16\u5B9A\u4F4D\u9002\u7528\u4E8E 0\xB0 \u7535\u673A\u503E\u89D2\u3002\u8BF7\u8C03\u6574\u503E\u89D2\u6216\u53D6\u6D88\u53F6\u5C16\u5B9A\u4F4D\u3002");
    if (withTips && !(Number.isFinite(radius) && radius > 0)) throw new Error("\u6868\u5F84\u987B\u4E3A\u6B63\u6570\u3002");
    const bladeTips = withTips ? projectedTips(hubs, radius) : [];
    if (bladeTips.some((p) => Math.min(p.x_px, p.y_px, 1024 - p.x_px, 1024 - p.y_px) < 6))
      throw new Error("\u53F6\u5C16\u8D85\u51FA\u5B9A\u4F4D\u56FE\u3002\u8BF7\u8C03\u6574\u6868\u5F84\u6216\u8F74\u8DDD\uFF0C\u6216\u53D6\u6D88\u53F6\u5C16\u5B9A\u4F4D\u3002");
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
  function drawGuide(canvas2, layout, lines, bladeLines = false) {
    const ctx = canvas2.getContext("2d");
    if (!ctx) throw new Error("\u65E0\u6CD5\u7ED8\u5236\u5B9A\u4F4D\u56FE\u3002");
    canvas2.width = canvas2.height = layout.size;
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
    if (nearest < 4) throw new Error("\u6240\u8BBE\u5939\u89D2\u8BA9\u4E24\u4E2A\u8F74\u5FC3\u5728 1024 \u50CF\u7D20\u753B\u5E03\u4E0A\u8FC7\u8FD1\uFF0C\u8BF7\u589E\u5927\u95F4\u8DDD\u3002");
    for (const h of layout.hubs) {
      ctx.beginPath();
      ctx.arc(h.x_px, h.y_px, Math.min(10, nearest / 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // src/design/form342.ts
  var choices = {
    body: { "pod": ["\u6D41\u7EBF\u8231", "A rounded pod with a continuous curved outline."], "box": ["\u65B9\u6B63\u673A\u58F3", "A box-shaped shell with straight sides and clipped corners."] },
    ratio: { "1.4": ["1.4", ""], "1.8": ["1.8", ""], "2.4": ["2.4", ""] },
    arm: { "10": ["\u7EC6 \xB7 10 mm", ""], "15": ["\u4E2D \xB7 15 mm", ""], "20": ["\u5BBD \xB7 20 mm", ""] },
    root: {
      "shoulder": ["\u77ED\u80A9\u5305\u8986", "Each arm reaches its running width within one arm width of the shell, through a short, seamless, rounded shoulder."],
      "taper": ["\u957F\u6E10\u7F29\u878D\u5408", "Each arm tapers gradually out of the shell for at least two arm widths before reaching its running width, with no joint seam."],
      "socket": ["\u5916\u9732\u63A5\u5408", "Each arm enters a distinct socket at the shell, with a visible transverse joint seam."],
      "hinge": ["\u6298\u53E0\u94F0\u63A5", "Each arm meets the shell at an exposed hinge with a visible pivot and a joint gap."]
    },
    camera: { "inside": ["\u5185\u5D4C\u9F3B\u8231", "The camera housing lies within the nose outline."], "outside": ["\u524D\u4F38\u4E91\u53F0", "The camera gimbal projects beyond the nose outline."] },
    seams: { "one": ["\u5355\u76D6\u7F1D", "One top cover seam."], "few": ["\u5C11\u5206\u4EF6", "Two or three distinct top cover seams."], "many": ["\u591A\u5206\u4EF6", "Four or more distinct top cover seams."] }
  };
  var starting = { body: "pod", ratio: "1.8", arm: "15", root: "shoulder", camera: "inside", seams: "few" };
  var presets = {
    R1: { ...starting },
    R2: { ...starting, root: "taper" },
    A: { body: "pod", ratio: "1.4", arm: "20", root: "shoulder", camera: "inside", seams: "one" },
    B: { body: "pod", ratio: "2.4", arm: "10", root: "taper", camera: "inside", seams: "one" },
    C: { body: "box", ratio: "1.4", arm: "20", root: "socket", camera: "outside", seams: "many" },
    A421: { ...starting, root: "shoulder", seams: "one" },
    B250: { ...starting, root: "taper", seams: "one" },
    B421: { ...starting, root: "taper", seams: "one" },
    C421: { ...starting, body: "box", root: "socket", camera: "outside", seams: "many" }
  };
  var names = { body: "\u673A\u8EAB\u5E73\u9762\u5F62", ratio: "\u673A\u8EAB\u957F\u5BBD\u6BD4", arm: "\u673A\u81C2\u5BBD\u5EA6", root: "\u81C2\u6839\u8FC7\u6E21", camera: "\u76F8\u673A\u8231\u5F62\u5F0F", seams: "\u4E0A\u76D6\u5206\u4EF6" };
  var controls = document.querySelector("#parameters");
  var text = document.querySelector("#prompt");
  var canvas = document.querySelector("#guide");
  var draftSelect = document.querySelector("#preset");
  for (const key of Object.keys(names)) {
    const select = document.createElement("select");
    select.name = key;
    for (const [value, pair] of Object.entries(choices[key])) select.add(new Option(pair[0], value));
    const label = document.createElement("label");
    label.append(names[key], select);
    controls.append(label);
  }
  var bladeInput = document.querySelector("#blades");
  var spanInput = document.querySelector("#span421");
  var commonFinish = document.querySelector("#common421");
  function readShape() {
    return Object.fromEntries(Object.keys(names).map((k) => [k, controls.elements.namedItem(k).value]));
  }
  function exportSpec() {
    const shape = readShape();
    const blades = Number(bladeInput.value);
    const params = {
      frame: { frame_type: "True X", wheelbase_mm: Number(spanInput.value), arm_width_mm: shape.arm + "mm", arm_thickness_mm: "4mm", material_visual: "Carbon Fiber" },
      propulsion: { prop_diameter_inch: 5, prop_blade_count: blades + "\u53F6", motor_tilt_degree: 0 },
      fuselage: { fuselage_style: shape.body === "pod" ? "Aerodynamic Pod" : "Boxy Enclosure", fuselage_dimensions_mm: { length: Number(shape.ratio) * 50, width: 50, height: 40 } },
      landing_gear: { landing_gear_style: "\u65E0\u72EC\u7ACB\u8D77\u843D\u67B6", landing_gear_height_mm: 40 },
      accessories: { has_camera_gimbal: true, drone_primary_color: "", custom_prompt_additions: "" }
    };
    const inputs = { ...newInputs("quad"), guideTips: false, guideBladeLines: false, guideNose: false, applyCmf: false };
    const layout = layoutFor(params, inputs, 1024 * 0.41 / (250 / Math.sqrt(2)));
    const propWord = ["", "", "two", "three", "four", "five", "six"][blades];
    const prompt = [
      (commonFinish.checked ? "Design a quadcopter" : "Design a compact quadcopter") + " for everyday aerial photography. Strict orthographic top view, nose toward the top edge, arms fully unfolded.",
      "Match the four motor centres and arm directions in the layout. True X, " + params.frame.wheelbase_mm + " mm opposite-motor span, equal horizontal and vertical spacing. Each motor carries one stationary " + propWord + "-blade, 5-inch propeller. No propeller guards.",
      choices.body[shape.body][1] + (commonFinish.checked ? " Main shell plan envelope " + params.fuselage.fuselage_dimensions_mm.length + " mm long by 50 mm wide." : " The main shell is " + shape.ratio + " times as long as wide."),
      "Each arm is " + parseInt(params.frame.arm_width_mm, 10) + " mm wide at midspan.",
      choices.root[shape.root][1],
      choices.camera[shape.camera][1] + " The camera faces horizontally forward; its optical face is hidden from directly overhead.",
      choices.seams[shape.seams][1],
      ...commonFinish.checked ? ["One forward camera only; the tail ends in uninterrupted shell. Join each arm visibly to its motor mount. Satin neutral mid-gray shell and arms, charcoal rotors, soft overhead studio light on white. Preserve the layout scale and framing."] : [],
      "Show the complete product on a plain light background. Omit guide marks and lettering."
    ].join("\n");
    return { schema: commonFinish.checked ? "section421-h3/1" : "form342-h3/1", shape, layout, bladeCount: blades, designDimensionsMm: params.fuselage.fuselage_dimensions_mm, armWidthMm: Number(shape.arm), requestedPropDiameterMm: 127, prompt };
  }
  function refresh() {
    const spec = exportSpec();
    text.value = spec.prompt;
    drawGuide(canvas, spec.layout, true, false);
  }
  function applyPreset() {
    const s = presets[draftSelect.value];
    if (!s) return;
    commonFinish.checked = ["A421", "B250", "B421", "C421"].includes(draftSelect.value);
    spanInput.value = draftSelect.value === "B421" ? "300" : "250";
    for (const k of Object.keys(s)) controls.elements.namedItem(k).value = s[k];
    bladeInput.value = "2";
    refresh();
  }
  function save(file, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = file;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  document.querySelector("#save-text").addEventListener("click", () => save("prompt.txt", new Blob([exportSpec().prompt], { type: "text/plain;charset=utf-8" })));
  document.querySelector("#save-spec").addEventListener("click", () => save("spec.json", new Blob([JSON.stringify(exportSpec(), null, 2)], { type: "application/json" })));
  document.querySelector("#save-guide").addEventListener("click", () => canvas.toBlob((b) => {
    if (b) save("guide.png", b);
  }, "image/png"));
  draftSelect.addEventListener("change", applyPreset);
  function edited() {
    draftSelect.value = "custom";
    refresh();
  }
  controls.addEventListener("change", edited);
  bladeInput.addEventListener("change", edited);
  applyPreset();
  spanInput.addEventListener("change", edited);
  commonFinish.addEventListener("change", edited);
})();
