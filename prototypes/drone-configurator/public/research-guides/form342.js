(() => {
  // src/design/design.ts
  function newInputs(task) {
    const quad = task === "quad";
    const target = quad ? "整机、航拍相机和机臂" : "药箱与中央机架、喷洒组件与支臂";
    const change = quad ? "探索适合日常携带的整机方案。" : "明确药箱承托面，让喷洒件的安装位置和管路连接可辨。";
    const keep = quad ? "保留四个电机轴心、相连的机臂和前向相机。" : "保留六个电机轴心、中央药箱和喷洒组件。";
    const free = quad ? "机身外轮廓、相机安装位置与接合方式、机臂过渡、壳体曲面和分件可探索。" : "机身外轮廓、壳体曲面、分件和配色可探索。";
    return {
      task,
      need: quad ? "设计一台便于日常携带的航拍四旋翼。" : "设计一台用于田间喷洒的农业植保六旋翼。",
      source: "作者确认的设计简报",
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
  function drawGuide(canvas2, layout, lines, bladeLines = false) {
    const ctx = canvas2.getContext("2d");
    if (!ctx) throw new Error("无法绘制定位图。");
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
    if (nearest < 4) throw new Error("所设夹角让两个轴心在 1024 像素画布上过近，请增大间距。");
    for (const h of layout.hubs) {
      ctx.beginPath();
      ctx.arc(h.x_px, h.y_px, Math.min(10, nearest / 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // src/design/form342.ts
  var choices = {
    body: { "pod": ["流线舱", "A rounded pod with a continuous curved outline."], "box": ["方正机壳", "A box-shaped shell with straight sides and clipped corners."] },
    ratio: { "1.4": ["1.4", ""], "1.8": ["1.8", ""], "2.4": ["2.4", ""] },
    arm: { "10": ["细 · 10 mm", ""], "15": ["中 · 15 mm", ""], "20": ["宽 · 20 mm", ""] },
    root: {
      "shoulder": ["短肩包覆", "Each arm reaches its running width within one arm width of the shell, through a short, seamless, rounded shoulder."],
      "taper": ["长渐缩融合", "Each arm tapers gradually out of the shell for at least two arm widths before reaching its running width, with no joint seam."],
      "socket": ["外露接合", "Each arm enters a distinct socket at the shell, with a visible transverse joint seam."],
      "hinge": ["折叠铰接", "Each arm meets the shell at an exposed hinge with a visible pivot and a joint gap."]
    },
    camera: { "inside": ["内嵌鼻舱", "The camera housing lies within the nose outline."], "outside": ["前伸云台", "The camera gimbal projects beyond the nose outline."] },
    seams: { "one": ["单盖缝", "One top cover seam."], "few": ["少分件", "Two or three distinct top cover seams."], "many": ["多分件", "Four or more distinct top cover seams."] }
  };
  var starting = { body: "pod", ratio: "1.8", arm: "15", root: "shoulder", camera: "inside", seams: "few" };
  var presets = {
    R1: { ...starting },
    R2: { ...starting, root: "taper" },
    A: { body: "pod", ratio: "1.4", arm: "20", root: "shoulder", camera: "inside", seams: "one" },
    B: { body: "pod", ratio: "2.4", arm: "10", root: "taper", camera: "inside", seams: "one" },
    C: { body: "box", ratio: "1.4", arm: "20", root: "socket", camera: "outside", seams: "many" }
  };
  var names = { body: "机身平面形", ratio: "机身长宽比", arm: "机臂宽度", root: "臂根过渡", camera: "相机舱形式", seams: "上盖分件" };
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
  function readShape() {
    return Object.fromEntries(Object.keys(names).map((k) => [k, controls.elements.namedItem(k).value]));
  }
  function exportSpec() {
    const shape = readShape();
    const blades = Number(bladeInput.value);
    const params = {
      frame: { frame_type: "True X", wheelbase_mm: 250, arm_width_mm: shape.arm + "mm", arm_thickness_mm: "4mm", material_visual: "Carbon Fiber" },
      propulsion: { prop_diameter_inch: 5, prop_blade_count: blades + "叶", motor_tilt_degree: 0 },
      fuselage: { fuselage_style: shape.body === "pod" ? "Aerodynamic Pod" : "Boxy Enclosure", fuselage_dimensions_mm: { length: Number(shape.ratio) * 50, width: 50, height: 40 } },
      landing_gear: { landing_gear_style: "无独立起落架", landing_gear_height_mm: 40 },
      accessories: { has_camera_gimbal: true, drone_primary_color: "", custom_prompt_additions: "" }
    };
    const inputs = { ...newInputs("quad"), guideTips: false, guideBladeLines: false, guideNose: false, applyCmf: false };
    const layout = layoutFor(params, inputs, 1024 * 0.41 / (250 / Math.sqrt(2)));
    const propWord = ["", "", "two", "three", "four", "five", "six"][blades];
    const prompt = [
      "Design a compact quadcopter for everyday aerial photography. Strict orthographic top view, nose toward the top edge, arms fully unfolded.",
      "Match the four motor centres and arm directions in the layout. True X, 250 mm opposite-motor span, equal horizontal and vertical spacing. Each motor carries one stationary " + propWord + "-blade, 5-inch propeller. No propeller guards.",
      choices.body[shape.body][1] + " The main shell is " + shape.ratio + " times as long as wide.",
      "Each arm is " + parseInt(params.frame.arm_width_mm, 10) + " mm wide at midspan.",
      choices.root[shape.root][1],
      choices.camera[shape.camera][1] + " The camera faces horizontally forward; its optical face is hidden from directly overhead.",
      choices.seams[shape.seams][1],
      "Show the complete product on a plain light background. Omit guide marks and lettering."
    ].join("\n");
    return { schema: "form342-h3/1", shape, layout, bladeCount: blades, designDimensionsMm: params.fuselage.fuselage_dimensions_mm, armWidthMm: Number(shape.arm), requestedPropDiameterMm: 127, prompt };
  }
  function refresh() {
    const spec = exportSpec();
    text.value = spec.prompt;
    drawGuide(canvas, spec.layout, true, false);
  }
  function applyPreset() {
    const s = presets[draftSelect.value];
    if (!s) return;
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
})();
