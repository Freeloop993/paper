// Generated with node src/design/c1Bundle.mjs. Edit src/design/c1*.ts.
var C1Selection = (() => {
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

  // src/design/c1Selection.ts
  var c1Selection_exports = {};
  __export(c1Selection_exports, {
    mount: () => mount
  });

  // src/design/partPrompt.ts
  var partOrder = ["frame", "propulsion", "fuselage", "landing_gear", "accessories"];
  function componentPhrases(p, groups) {
    const { frame, propulsion, fuselage, landing_gear: gear, accessories } = p;
    const size = fuselage.fuselage_dimensions_mm;
    const skids = { "无独立起落架": "integrated landing system", "低矮滑撬/支腿": "low-profile skids", "高脚起落架": "tall landing gear" };
    const byGroup = {
      frame: `Arms: ${frame.material_visual}, ${frame.arm_width_mm} wide and ${frame.arm_thickness_mm} thick.`,
      propulsion: `Propulsion: ${propulsion.prop_diameter_inch}-inch ${parseInt(propulsion.prop_blade_count, 10)}-blade propellers; motor tilt ${propulsion.motor_tilt_degree}°.`,
      fuselage: `Body: ${fuselage.fuselage_style}; design envelope ${size.length} × ${size.width} × ${size.height} mm (length × width × height).`,
      landing_gear: gear.landing_gear_style === "无独立起落架" ? "Integrated landing system." : `Landing gear: ${skids[gear.landing_gear_style]}, ${gear.landing_gear_height_mm} mm ground clearance.`,
      accessories: [accessories.has_camera_gimbal ? "Camera gimbal fitted." : "No separate camera gimbal.", `Primary colour ${accessories.drone_primary_color}.`].join(" ")
    };
    return partOrder.filter((group) => groups.includes(group)).map((group) => byGroup[group]);
  }

  // src/design/design.ts
  var quadBladeCount = "2叶";
  var quadRotorConstraint = "四个电机各装一副静止、完全展开的双叶螺旋桨，每个电机只装两片桨叶。";
  var shellFinishes = {
    matte: "细砂哑光聚合物，细密纹理与柔和宽高光",
    satin: "缎面涂装聚合物，平滑表面与清晰的柔亮反光带"
  };
  var frameSurfaces = {
    "Carbon Fiber": "炭灰碳纤维，细编织纹与半哑光清漆",
    Aluminum: "银灰铝合金，细拉丝与窄条高光",
    "ABS Plastic": "深灰 ABS，均匀细砂纹与低光泽",
    "PLA Plastic": "深灰 PLA，可见层纹与低光泽"
  };
  var propSurface = "石墨黑模塑桨叶，低光泽，平滑无编织纹";
  var titles = { quad: "日常随行航拍", hexa: "农业植保喷洒" };
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
      const raw = inputs.gaps.trim();
      const hyphenList = /^\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)+$/.test(raw);
      const parts = raw.split(hyphenList ? /\s*-\s*/ : /[\s,，、;；]+/);
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
  function compile(parameters, profile, d, layout, hasParent) {
    const text = d.method === "free" ? [d.instruction] : [d.target, d.change, d.keep, d.free];
    if ([d.need, d.source, ...text].some((v) => !v.trim())) throw new Error("请补全任务、依据和当前方式下的设计要求。");
    const { frame, propulsion, accessories: parts } = parameters;
    const intent = d.method === "free" ? d.instruction.trim() : ["目标部位：" + d.target.trim(), "本次改变：" + d.change.trim(), "保持：" + d.keep.trim(), "自由项：" + d.free.trim()].join("\n");
    const bladeSpec = d.task === "quad" && propulsion.prop_blade_count === quadBladeCount ? quadRotorConstraint : "每个电机一副桨，每桨 " + propulsion.prop_blade_count + "。";
    const cmf = d.applyCmf && d.task === "quad" ? "CMF 外观：上壳主色 " + parts.drone_primary_color + "，" + shellFinishes[d.shellFinish ?? "matte"] + "；外露机架为" + frameSurfaces[frame.material_visual] + "；" + propSurface + "。同一中性侧光下清楚表现部件交界、细纹与高光差异，整机清晰对焦。" : "";
    return [
      titles[d.task] + "。" + d.need.trim(),
      bladeSpec,
      profile ? "面向" + profile + "。" : "",
      intent,
      ...componentPhrases(parameters, d.groups),
      cmf,
      parts.custom_prompt_additions.trim(),
      layout.hubs.length + " 个电机，" + (frame.frame_type === "True X" && d.gaps.trim() ? "径向 X 型" : frame.frame_type) + " 布局。最大电机中心距设计值 " + frame.wheelbase_mm + " mm，相邻夹角从 R1 起顺时针为 " + layout.adjacent_deg.map((a) => Number(a.toFixed(2))).join("、") + "°。",
      d.route === "guide" ? "随附正交俯视定位图，机头朝上，红点定位电机轴心。" + (d.guideLines ? "蓝线表示机架连接。" : "") : "",
      layout.bladeTips.length ? "每个红色桨毂旁的两个青色点是这副桨的两个叶尖。" + (d.guideBladeLines ? "青线穿过桨毂，两端对应同一副桨的叶尖。" : "") + "双叶连线垂直于该轴心和机架中心的连线，桨径 " + propulsion.prop_diameter_inch + " 英寸。绘制完整展开的桨，保留桨与机身之间的可见边界。" : "",
      hasParent ? "外观父图用于延续已有方案，按本次指令修订目标部位。" : "",
      d.view === "top" ? "输出正交俯视产品图，制图观察方向从无人机正上方垂直向下，机头指向画面上沿，完整显示所有电机轴心和桨叶。" + (d.route === "guide" ? "保持各轴心在定位图画幅内的归一化位置和留白。" : "") : "输出斜前上视产品图，展示部件厚度、支撑和连接，按该视角投影平面布局。",
      "浅色中性背景，照片级工业产品设计渲染，柔和棚拍侧光与接触阴影，画面无辅助线、刻度或文字。"
    ].filter(Boolean).join("\n");
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

  // src/design/quadDirections.ts
  var quadDirections = {
    A: { label: "A · 紧凑舱式", style: "Aerodynamic Pod", length: 100, width: 75 },
    B: { label: "B · 纵长舱式", style: "Aerodynamic Pod", length: 145, width: 55 },
    C: { label: "C · 分体箱式", style: "Boxy Enclosure", length: 100, width: 75 }
  };
  function directionDraft(id, current) {
    const card = quadDirections[id];
    const parameters = {
      ...current,
      frame: { ...current.frame, frame_type: "True X", wheelbase_mm: 250 },
      fuselage: {
        fuselage_style: card.style,
        fuselage_dimensions_mm: { length: card.length, width: card.width, height: 40 }
      },
      propulsion: { prop_diameter_inch: 5, prop_blade_count: "2叶", motor_tilt_degree: 0 },
      accessories: { ...current.accessories, has_camera_gimbal: true }
    };
    const inputs = {
      ...newInputs("quad"),
      preset: id,
      groups: [...partOrder],
      source: "既定随行航拍四旋任务；构型与机身包络为可编辑的设计示例。",
      change: id === "C" ? "在箱式机身与独立机架之间组织分件。" : "以所选舱体包络组织机身和机臂。",
      keep: "四轴布局、双叶和前向航拍功能。",
      free: "机鼻轮廓、相机安装方式、臂根过渡、壳面曲率和接缝走向。",
      guideTips: false,
      guideBladeLines: false
    };
    inputs.instruction = [inputs.change, inputs.keep, inputs.free].join("\n");
    return { parameters, inputs };
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
  async function freeze(draft, layout, prompt, compiledPrompt, textOrigin, parent, basedOn, reason) {
    if (basedOn && !reason.trim()) throw new Error("请记录沿用或修改上一版的理由。");
    if (draft.inputs.task === "quad") {
      if (draft.parameters.propulsion.prop_blade_count !== quadBladeCount)
        throw new Error("此旧规格的叶数与当前四旋基线不同。新版本请先在动力页选用双叶桨。");
      if (!prompt.split("\n").includes(quadRotorConstraint))
        throw new Error("四旋研究的共同旋翼条件缺失或被修改。请从当前规格重新编译后确认。");
    }
    if (!prompt.trim()) throw new Error("请先填写准备提交的文本。");
    const canvas = document.createElement("canvas");
    drawGuide(canvas, layout, draft.inputs.guideLines, draft.inputs.guideBladeLines);
    const png = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG 导出失败。")), "image/png"));
    const guide = await imageAsset(png);
    const assets = draft.inputs.route === "guide" ? [guide, ...parent ? [parent] : []] : [];
    return {
      schema: "uav-configurator-e/2",
      id: crypto.randomUUID(),
      basedOn,
      reason,
      confirmedAt: (/* @__PURE__ */ new Date()).toISOString(),
      draft,
      layout,
      guide,
      compiledPrompt,
      textOrigin,
      parent: draft.inputs.route === "guide" ? parent : null,
      request: {
        route: draft.inputs.route,
        prompt,
        promptSha256: await hash(new TextEncoder().encode(prompt)),
        provider: null,
        model: null,
        textBody: null,
        references: assets.map((image, i) => ({ role: i ? "appearance-parent" : "top-layout", sha256: image.sha256, mime: image.mime }))
      }
    };
  }

  // src/design/c1Model.ts
  var studyGuide = { mime: "image/png", width: 1024, height: 1024, dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAYAAAB/HSuDAAAQAElEQVR4Aezdfcxtb3oX9P0DLCJ0IlMH09ogwqiMElsk1EljE8EQkGANNRMEYyvj/KMWGaJASgyFGOoLKoSXarRO6WjSUoSGhFAC4SUpkIEC4Z00GZoWAqWUKaUvgRTaH/d1zlnnnOd59rP3Xmvf91r3fd0f8uyzn7X3Wve6rs+1O/vc3/nNjx9xOp3e9WDgM+Az4DPgM+Az4DPgM+Az4DPgM+Az4DPgM5D6M/BuBABlxn4IECBAgAABAgQIECBAgACBvAKnkwAg83T1RoAAAQIECBAgQIAAAQIEQqA8BAAFwQ8BAgQIECBAgAABAgQIEMgsEL0JAELBgwABAgQIECBAgAABAgQI5BV40ZkA4AWDPwgQIECAAAECBAgQIECAQFaBl30JAF46+JMAAQIECBAgQIAAAQIECOQUeNWVAOAVhCcCBAgQIECAAAECBAgQIJBRYOlJALBIeCZAgAABAgQIECBAgAABAvkEXnckAHhN4RcCBAgQIECAAAECBAgQIJBN4E0/AoA3Fn4jQIAAAQIECBAgQIAAAQK5BN7qRgDwFoZfCRAgQIAAAQIECBAgQIBAJoG3exEAvK3hdwIECBAgQIAAAQIECBAgkEfgQScCgAccDggQIECAAAECBAgQIECAQBaBh30IAB56OCJAgAABAgQIECBAgAABAjkEHnUhAHgE4pAAAQIECBAgQIAAAQIECGQQeNyDAOCxiGMCBAgQIECAAAECBAgQIDC+wJMOBABPSLxAgAABAgQIECBAgAABAgRGF3havwDgqYlXCBAgQIAAAQIECBAgQIDA2AJnqhcAnEHxEgECBAgQIECAAAECBAgQGFngXO0CgHMqXiNAgAABAgQIECBAgAABAuMKnK1cAHCWxYsECBAgQIAAAQIECBAgQGBUgfN1CwDOu3iVAAECBAgQIECAAAECBAiMKfBM1QKAZ2C8TIAAAQIECBAgQIAAAQIERhR4rmYBwHMyXidAgAABAgQIECBAgAABAuMJPFuxAOBZGm8QIECAAAECBAgQIECAAIHRBJ6vVwDwvI13CBAgQIAAAQIECBAgQIDAWAIXqhUAXMDxFgECBAgQIECAAAECBAgQGEngUq0CgEs63iNAgAABAgQIECBAgAABAuMIXKxUAHCRx5sECBAgQIAAAQIECBAgQGAUgct1CgAu+3iXAAECBAgQIECAAAECBAiMIXClSgHAFSBvEyBAgAABAgQIECBAgACBEQSu1SgAuCbkfQIECBAgQIAAAQIECBAg0L/A1QoFAFeJnECAAAECBAgQIECAAAECBHoXuF6fAOC6kTMIECBAgAABAgQIECBAgEDfAjdUJwC4AckpBAgQIECAAAECBAgQIECgZ4FbahMA3KLkHAIECBAgQIAAAQIECBAg0K/ATZUJAG5ichIBAgQIECBAgAABAgQIEOhV4La6BAC3OTmLAAECBAgQIECAAAECBAj0KXBjVQKAG6GcRoAAAQIECBAgQIAAAQIEehS4tSYBwK1SziNAgAABAgQIECBAgAABAv0J3FyRAOBmKicSIECAAAECBAgQIECAAIHeBG6vRwBwu5UzCRAgQIAAAQIECBAgQIBAXwIrqhEArMByKgECBAgQIECAAAECBAgQ6ElgTS0CgDVaziVAgAABAgQIECBAgAABAv0IrKpEALCKy8kECBAgQIAAAQIECBAgQKAXgXV1CADWeTmbAAECBAgQIECAAAECBAj0IbCyCgHASjCnEyBAgAABAgQIECBAgACBHgTW1iAAWCvmfAIECBAgQIAAAQIECBAgcLzA6goEAKvJXECAAAECBAgQIECAAAECBI4WWH9/AcB6M1cQIECAAAECBAgQIECAAIFjBTbcXQCwAc0lBAgQIECAAAECBAgQIEDgSIEt9xYAbFFzDQECBAgQIECAAAECBAgQOE5g050FAJvYXESAAAECBAgQIECAAAECBI4S2HZfAcA2N1cRIECAAAECBAgQIECAAIFjBDbeVQCwEc5lBAgQIECAAAECBAgQIEDgCIGt9xQAbJVzHQECBAgQIECAAAECBAgQ2F9g8x0FAJvpXEiAAAECBAgQIECAAAECBPYW2H4/AcB2O1cSIECAAAECBAgQIECAAIF9Be64mwDgDjyXEiBAgAABAgQIECBAgACBPQXuuZcA4B491xIgQIAAAQIECBAgQIAAgf0E7rqTAOAuPhcTIECAAAECBAgQIECAAIG9BO67jwDgPj9XEyBAgAABAgQIECBAgACBfQTuvIsA4E5AlxMgQIAAAQIECBAgQIAAgT0E7r2HAOBeQdcTIECAAAECBAgQIECAAIH2AnffQQBwN6EFCBAgQIAAAQIECBAgQIBAa4H71xcA3G9oBQIECBAgQIAAAQIECBAg0FagwuoCgAqIliBAgAABAgQIECBAgAABAi0FaqwtAKihaA0CBAgQIECAAAECBAgQINBOoMrKAoAqjBYhQIAAAQIECBAgQIAAAQKtBOqsKwCo42gVAgQIECBAgAABAgQIECDQRqDSqgKASpCWIUCAAAECBAgQIECAAAECLQRqrSkAqCVpHQIECBAgQIAAAQIECBAgUF+g2ooCgGqUFiJAgAABAgQIECBAgAABArUF6q0nAKhnaSUCBAgQIECAAAECBAgQIFBXoOJqAoCKmJYiQIAAAQIECBAgQIAAAQI1BWquJQCoqWktAgQIECBAgAABAgQIECBQT6DqSgKAqpwWI0CAAAECBAgQIECAAAECtQTqriMAqOtpNQIECBAgQIAAAQIECBAgUEeg8ioCgMqgliNAgAABAgQIECBAgAABAjUEaq8hAKgtaj0CBAgQIECAAAECBAgQIHC/QPUVBADVSS1IgAABAgQIECBAgAABAgTuFah/vQCgvqkVCRAgQIAAAQIECBAgQIDAfQINrhYANEC1JAECBAgQIECAAAECBAgQuEegxbUCgBaq1iRAgAABAgQIECBAgAABAtsFmlwpAGjCalECBAgQIECAAAECBAgQILBVoM11AoA2rlYlQIAAAQIECBAgQIAAAQLbBBpdJQBoBGtZAgQIECBAgAABAgQIECCwRaDVNQKAVrLWJUCAAAECBAgQIECAAAEC6wWaXSEAaEZrYQIECBAgQIAAAQIECBAgsFag3fkCgHa2ViZAgAABAgQIECBAgAABAusEGp4tAGiIa2kCBAgQIECAAAECBAgQILBGoOW5AoCWutYmQIAAAQIECBAgQIAAAQK3CzQ9UwDQlNfiBAgQIECAAAECBAgQIEDgVoG25wkA2vpanQABAgQIECBAgAABAgQI3CbQ+CwBQGNgyxMgQIAAAQIECBAgQIAAgVsEWp8jAGgtbH0CBAgQIECAAAECBAgQIHBdoPkZAoDmxG5AgAABAgQIECBAgAABAgSuCbR/XwDQ3tgdCBAgQIAAAQIECBAgQIDAZYEd3hUA7IDsFgQIECBAgAABAgQIECBA4JLAHu8JAPZQdg8CBAgQIECAAAECBAgQIPC8wC7vCAB2YXYTAgQIECBAgAABAgQIECDwnMA+rwsA9nF2FwIECBAgQIAAAQIECBAgcF5gp1cFADtBuw0BAgQIECBAgAABAgQIEDgnsNdrAoC9pN2HAAECBAgQIECAAAECBAg8FdjtFQHAbtRuRIAAAQIECBAgQIAAAQIEHgvsdywA2M/anQgQIECAAAECBAgQIECAwEOBHY8EADtiuxUBAgQIECBAgAABAgQIEHhbYM/fBQB7arsXAQIECBAgQIAAAQIECBB4I7DrbwKAXbndjAABAgQIECBAgAABAgQILAL7PgsA9vV2NwIECBAgQIAAAQIECBAg8FJg5z8FADuDux0BAgQIECBAgAABAgQIEAiBvR8CgL3F3Y8AAQIECBAgQIAAAQIECJxOuxsIAHYnd0MCBAgQIECAAAECBAgQILC/gABgf3N3JECAAAECBAgQIECAAIHZBQ7oXwBwALpbEiBAgAABAgQIECBAgMDcAkd0LwA4Qt09CRAgQIAAAQIECBAgQGBmgUN6FwAcwu6mBAgQIECAAAECBAgQIDCvwDGdCwCOcXdXAgQIECBAgAABAgQIEJhV4KC+BQAHwbstAQIECBAgQIAAAQIECMwpcFTXAoCj5N2XAAECBAgQIECAAAECBGYUOKxnAcBh9G5MgAABAgQIECBAgAABAvMJHNexAOA4e3cmQIAAAQIECBAgQIAAgdkEDuxXAHAgvlsTIECAAAECBAgQIECAwFwCR3YrADhS370JECBAgAABAgQIECBAYCaBQ3sVABzK7+YECBAgQIAAAQIECBAgMI/AsZ0KAI71d3cCBAgQIECAAAECBAgQmEXg4D4FAAcPwO0JECBAgAABAgQIECBAYA6Bo7sUABw9AfcnQIAAAQIECBAgQIAAgRkEDu9RAHD4CBRAgAABAgQIECBAgAABAvkFju9QAHD8DFRAgAABAgQIECBAgAABAtkFOuhPANDBEJRAgAABAgQIECBAgAABArkFeuhOANDDFNRAgAABAgQIECBAgAABApkFuuhNANDFGBRBgAABAgQIECBAgAABAnkF+uhMANDHHFRBgAABAgQIECBAgAABAlkFOulLANDJIJRBgAABAgQIECBAgAABAjkFeulKANDLJNRBgAABAgQIECBAgAABAhkFuulJANDNKBRCgAABAgQIECBAgAABAvkE+ulIANDPLFRCgAABAgQIECBAgAABAtkEOupHANDRMJRCgAABAgQIECBAgAABArkEeupGANDTNNRCgAABAgQIECBAgAABApkEuupFANDVOBRDgAABAgQIECBAgAABAnkE+upEANDXPFRDgAABAgQIECBAgAABAlkEOutDANDZQJRDgAABAgQIECBAgAABAjkEeutCANDbRNRDgAABAgQIECBAgAABAhkEuutBANDdSBREgAABAgQIECBAgAABAuML9NeBAKC/maiIAAECBAgQIECAAAECBEYX6LB+AUCHQ1ESAQIECBAgQIAAAQIECIwt0GP1AoAep6ImAgQIECBAgAABAgQIEBhZoMvaBQBdjkVRBAgQIECAAAECBAgQIDCuQJ+VCwD6nIuqCBAgQIAAAQIECBAgQGBUgU7rFgB0OhhlESBAgAABAgQIECBAgMCYAr1WLQDodTLqIkCAAAECBAgQIECAAIERBbqtWQDQ7WgURoAAAQIECBAgQIAAAQLjCfRbsQCg39mojAABAgQIECBAgAABAgRGE+i4XgFAx8NRGgECBAgQIECAAAECBAiMJdBztQKAnqejNgIECBAgQIAAAQIECBAYSaDrWgUAXY9HcQQIECBAgAABAgQIECAwjkDflQoA+p6P6ggQIECAAAECBAgQIEBgFIHO6xQAdD4g5REgQIAAAQIECBAgQIDAGAK9VykA6H1C6iNAgAABAgQIECBAgACBEQS6r1EA0P2IFEiAAAECBAgQIECAAAECC0z4aQAAEABJREFU/Qv0X6EAoP8ZqZAAAQIECBAgQIAAAQIEehcYoD4BwABDUiIBAgQIECBAgAABAgQI9C0wQnUCgBGmpEYCBAgQIECAAAECBAgQ6FlgiNoEAEOMSZEECBAgQIAAAQIECBAg0K/AGJUJAMaYkyoJECBAgAABAgQIECBAoFeBQeoSAAwyKGUSIECAAAECBAgQIECAQJ8Co1QlABhlUuokQIAAAQIECBAgQIAAgR4FhqlJADDMqBRKgAABAgQIECBAgAABAv0JjFORAGCcWamUAAECBAgQIECAAAECBHoTGKgeAcBAw1IqAQIECBAgQIAAAQIECPQlMFI1AoCRpqVWAgQIECBAgAABAgQIEOhJYKhaBABDjUuxBAgQIECAAAECBAgQINCPwFiVCADGmpdqCRAgQIAAAQIECBAgQKAXgcHqEAAMNjDlEiBAgAABAgQIECBAgEAfAqNVIQAYbWLqJUCAAAECBAgQIECAAIEeBIarQQAw3MgUTIAAAQIECBAgQIAAAQLHC4xXgQBgvJmpmAABAgQIECBAgAABAgSOFhjw/gKAAYemZAIECBAgQIAAAQIECBA4VmDEuwsARpyamgkQIECAAAECBAgQIEDgSIEh7y0AGHJsiiZAgAABAgQIECBAgACB4wTGvLMAYMy5qZoAAQIECBAgQIAAAQIEjhIY9L4CgEEHp2wCBAgQIECAAAECBAgQOEZg1LsKAEadnLoJECBAgAABAgQIECBA4AiBYe8pABh2dAonQIAAAQIECBAgQIAAgf0Fxr2jAGDc2amcAAECBAgQIECAAAECBPYWGPh+AoCBh6d0AgQIECBAgAABAgQIENhXYOS7CQBGnp7aCRAgQIAAAQIECBAgQGBPgaHvJQAYenyKJ0CAAAECBAgQIECAAIH9BMa+kwBg7PmpngABAgQIECBAgAABAgT2Ehj8PgKAwQeofAIECBAgQIAAAQIECBDYR2D0uwgARp+g+gkQIECAAAECBAgQIEBgD4Hh7yEAGH6EGiBAgAABAgQIECBAgACB9gLj30EAMP4MdUCAAAECBAgQIECAAAECrQUSrC8ASDBELRAgQIAAAQIECBAgQIBAW4EMqwsAMkxRDwQIECBAgAABAgQIECDQUiDF2gKAFGPUBAECBAgQIECAAAECBAi0E8ixsgAgxxx1QYAAAQIECBAgQIAAAQKtBJKsKwBIMkhtECBAgAABAgQIECBAgEAbgSyrCgCyTFIfBAgQIECAAAECBAgQINBCIM2aAoA0o9QIAQIECBAgQIAAAQIECNQXyLOiACDPLHVCgAABAgQIECBAgAABArUFEq0nAEg0TK0QIECAAAECBAgQIECAQF2BTKsJADJNUy8ECBAgQIAAAQIECBAgUFMg1VoCgFTj1AwBAgQIECBAgAABAgQI1BPItZIAINc8dUOAAAECBAgQIECAAAECtQSSrSMASDZQ7RAgQIAAAQIECBAgQIBAHYFsqwgAsk1UPwQIECBAgAABAgQIECBQQyDdGgKAdCPVEAECBAgQIECAAAECBAjcL5BvBQFAvpnqiAABAgQIECBAgAABAgTuFUh4vQAg4VC1RIAAAQIECBAgQIAAAQL3CWS8WgCQcap6IkCAAAECBAgQIECAAIF7BFJeKwBIOVZNESBAgAABAgQIECBAgMB2gZxXCgByzlVXBAgQIECAAAECBAgQILBVIOl1AoCkg9UWAQIECBAgQIAAAQIECGwTyHqVACDrZPVFgAABAgQIECBAgAABAlsE0l4jAEg7Wo0RIECAAAECBAgQIECAwHqBvFcIAPLOVmcECBAgQIAAAQIECBAgsFYg8fkCgMTD1RoBAgQIECBAgAABAgQIrBPIfLYAIPN09UaAAAECBAgQIECAAAECawRSnysASD1ezREgQIAAAQIECBAgQIDA7QK5zxQA5J6v7ggQIECAAAECBAgQIEDgVoHk5wkAkg9YewQIECBAgAABAgQIECBwm0D2swQA2SesPwIECBAgQIAAAQIECBC4RSD9OQKA9CPWIAECBAgQIECAAAECBAhcF8h/hgAg/4x1SIAAAQIECBAgQIAAAQLXBCZ4XwAwwZC1SIAAAQIECBAgQIAAAQKXBWZ4VwAww5T1SIAAAQIECBAgQIAAAQKXBKZ4TwAwxZg1SYAAAQIECBAgQIAAAQLPC8zxjgBgjjnrkgABAgQIECBAgAABAgSeE5jkdQHAJIPWJgECBAgQIECAAAECBAicF5jlVQHALJPWJwECBAgQIECAAAECBAicE5jmNQHANKPWKAECBAgQIECAAAECBAg8FZjnFQHAPLPWKQECBAgQIECAAAECBAg8FpjoWAAw0bC1SoAAAQIECBAgQIAAAQIPBWY6EgDMNG29EiBAgAABAgQIECBAgMDbAlP9LgCYatyaJUCAAAECBAgQIECAAIE3AnP9JgCYa966JUCAAAECBAgQIECAAIFFYLJnAcBkA9cuAQIECBAgQIAAAQIECLwUmO1PAcBsE9cvAQIECBAgQIAAAQIECITAdA8BwHQj1zABAgQIECBAgAABAgQInE7zGQgA5pu5jgkQIECAAAECBAgQIEBgQgEBwIRD1zIBAgQIECBAgAABAgRmF5ixfwHAjFPXMwECBAgQIECAAAECBOYWmLJ7AcCUY9c0AQIECBAgQIAAAQIEZhaYs3cBwJxz1zUBAgQIECBAgAABAgTmFZi0cwHApIPXNgECBAgQIECAAAECBGYVmLVvAcCsk9c3AQIECBAgQIAAAQIE5hSYtmsBwLSj1zgBAgQIECBAgAABAgRmFJi3ZwHAvLPXOQECBAgQIECAAAECBOYTmLhjAcDEw9c6AQIECBAgQIAAAQIEZhOYuV8BwMzT1zsBAgQIECBAgAABAgTmEpi6WwHA1OPXPAECBAgQIECAAAECBGYSmLtXAcDc89c9AQIECBAgQIAAAQIE5hGYvFMBwOQfAO0TIECAAAECBAgQIEBgFoHZ+xQAzP4J0D8BAgQIECBAgAABAgTmEJi+SwHA9B8BAAQIECBAgAABAgQIEJhBQI8CAJ8BAgQIECBAgAABAgQIEMgvoMOTAMCHgAABAgQIECBAgAABAgTSC2jwJADwISBAgAABAgQIECBAgACB9AIaLAL+CYCC4IcAAQIECBAgQIAAAQIEMgvoLQQEAKHgQYAAAQIECBAgQIAAAQJ5BXT2QkAA8ILBHwQIECBAgAABAgQIECCQVUBfLwUEAC8d/EmAAAECBAgQIECAAAECOQV09UpAAPAKwhMBAgQIECBAgAABAgQIZBTQ0yIgAFgkPBMgQIAAAQIECBAgQIBAPgEdvRYQALym8AsBAgQIECBAgAABAgQIZBPQzxsBAcAbC78RIECAAAECBAgQIECAQC4B3bwlIAB4C8OvBAgQIECAAAECBAgQIJBJQC9vCwgA3tbwOwECBAgQIECAAAECBAjkEdDJAwEBwAMOBwQIECBAgAABAgQIECCQRUAfDwUEAA89HBEgQIAAAQIECBAgQIBADgFdPBIQADwCcUiAAAECBAgQIECAAAECGQT08FhAAPBYxDEBAgQIECBAgAABAgQIjC+ggycCAoAnJF4gQIAAAQIECBAgQIAAgdEF1P9UQADw1MQrBAgQIECAAAECBAgQIDC2gOrPCAgAzqB4iQABAgQIECBAgAABAgRGFlD7OQEBwDkVrxEgQIAAAQIECBAgQIDAuAIqPysgADjL4kUCBAgQIECAAAECBAgQGFVA3ecFBADnXbxKgAABAgQIECBAgAABAmMKqPoZAQHAMzBeJkCAAAECBAgQIECAAIERBdT8nIAA4DkZrxMgQIAAAQIECBAgQIDAeAIqflZAAPAsjTcIECBAgAABAgQIECBAYDQB9T4vIAB43sY7BAgQIECAAAECBAgQIDCWgGovCAgALuB4iwABAgQIECBAgAABAgRGElDrJQEBwCUd7xEgQIAAAQIECBAgQIDAOAIqvSggALjI400CBAgQIECAAAECBAgQGEVAnZcFBACXfbxLgAABAgQIECBAgAABAmMIqPKKgADgCpC3CRAgQIAAAQIECBAgQGAEATVeExAAXBPyPgECBAgQIECAAAECBAj0L6DCqwICgKtETiBAgAABAgQIECBAgACB3gXUd11AAHDdyBkECBwo8E65988rj19XHr+3PP5meXxneXxjefyG8vii8vhnysMPAQIECBBoKRDfNR8qN/iK8vgD5fF3yyO+k+K76cvL7/FdFd9Z5Vc/BAgcI+CuNwgIAG5AcgoBAscI/Evltn+oPGKzH3+5+sLy+2eXx08oj/iL1q8pz7+7PP5UeXygPPwQIECAAIEWAvEdE981X18W/7Ly+Lnl8b7yiO+k+G6KkDq+q+I7K767ylt+CBDYXcANbxEQANyi5BwCBHYX+E/KHf9yefz75XHt56eXE/5cefyy8vDfvhQEPwQIECBQRSC+U355WSm+Y+K7pvx68Se+s+K7K77DLp7oTQIE6gtY8SYBAcBNTE4iQGBPgfiL09eWG/7z5XHrzz9bTvwt5fGry8MPAQIECBCoIRDfKb+5LBTfMeXppp/47orvsPguu+kCJxEgUEXAIrcJCABuc3IWAQI7CXxmuc9XlsfWn19fLvyc8vBDgAABAgTuEfi3ysXxnVKeNv389nLVZ5WHHwIEdhFwkxsFBAA3QjmNAIF9BL663ObHl8fWn08rF35NecRzefJDgAABAgRWC8R3yP9brorn8rTp573lqnsC7XK5HwIEbhZw4q0CAoBbpZxHgEBzgZ9U7hD/YqXydNdP/BMAP/+uFVxMgAABAjMLxHdI/BMA9xr8R2WB+G4rT34IEGgpYO2bBQQAN1M5kQCB1gL/XsUbfLDiWpYiQIAAgbkEan6H1FxrrinolsDtAs68XUAAcLuVMwkQaCxQ8y9JNddq3LblCRAgQKAzgZrfITXX6oxJOQR6EVDHCgEBwAospxIg0Fag5l+SPq+U6j/gCoIfAgQIEFglEP/G/39n1RWXT6753Xb5Tt4lMKuAvtcI+PvxGi3nEiDQVCD+0tX0BhYnQIAAAQJXBH6wvP/D5VHrJ/6/Bay1lnUIEDgj4KVVAgKAVVxOJkCgpcCfr7j4Xyxr1fwLXFnODwECBAhMIBDfHX+pYp81v9sqlmUpAmkENLJOQACwzsvZBAg0FKj5l6SaazVs2dIECBAg0KFAze+QT3TYn5IIJBLQykoBAcBKMKcTINBOoOZfuGqu1a5jKxMgQIBAjwI1v0MEAD1OWE15BHSyVkAAsFbM+QQINBP4I2XlGn/p+ttlna8vDz8ECBAgQGCLQHyH/K0tFz665i+U4z9dHn4IEGgkYNnVAgKA1WQuIECglUD8i5d+aVk8nsvT5p//ulz53eXhhwABAgQIbBGI75Av3XLhW9fEd9mXlOP4dwqUJz8ECDQQsOR6AQHAejNXECDQUCD+CYD/8TYddMIAABAASURBVI71f9+//ItO3/TB/6es8E55+CFAgAABAlsE3nnxXRLfKVuujmu+vPwR/wRAefJDgEAbAatuEBAAbEBzCQECbQW+oiwfQUB5WvXznT/ms07//ed95enT3//h02d88KvKtUKAguCHAAECBFYJvPPiOyS+S+I75Xs+7b2rro6TY+P/v8QvHgQINBSw9BYBAcAWNdcQINBUIP6xyZ9e7vCzyiP+9/zl6eLP95R3v+SdH3n6nM//Had/8KNf/kUt/uImBCgwfggQIEBghcCbzX9cFN8pP/ULvu70n5XvmPiuidcuPb6tvBnfXZ9bnv2j/wXBD4GWAtbeJCAA2MTmIgIE9hD4Y+UmP6k8fmZ5/Dfl8bXlEX+5+jvl+RvK41eVxxeUx2eWx8ff/aHTd/7RX3D6h9/xh8rRyx8hwEsHfxIgQIDALQIPN/9xRXynxHfL/1e+Y+K75t8tL/7K8vg95fEd5fHt5fF15fHLy+PzyuNfK4/47ipPfggQaCxg+W0CAoBtbq4iQGAngX9c7vNnyuO3lscvKY9/pTziL2FfVJ5/Y3n88fL4R+Xx4ueHf1AI8ALCHwQIECCwTuD5zf+pfLfEWvFd8yfKL/9refzH5fFZ5REh9S8uz7+lPL65POI7qzz5IUCgvYA7bBQQAGyEcxkBAp0KlL+oxX9bE/+tzVKhfxJgkfBMgAABAk8Frm/+n17jFQIEjhVw960CAoCtcq4jQKBfASFAv7NRGQECBLoSsPnvahyKIXCrgPM2CwgANtO5kACBrgWEAF2PR3EECBA4XsDm//gZqIDANgFXbRcQAGy3cyUBAr0LCAF6n5D6CBAgcJCAzf9B8G5LoIaANe4QEADcgedSAgQGEBACDDAkJRIgQGBPgaeb/x/4G9/w4l8iu/wL//asxr0IEFgr4Px7BAQA9+i5lgCBMQSEAGPMSZUECBBoLnB+8/9d3/Shk81/c3w3IFBHwCp3CQgA7uJzMQECwwgIAYYZlUIJECDQRuDC5v/dH2pzS6sSIFBdwIL3CQgA7vNzNQECIwkIAUaalloJECBQUcDmvyKmpQgcKeDedwoIAO4EdDkBAoMJCAEGG5hyCRAgcK+Azf+9gq4n0I+ASu4VEADcK+h6AgTGE3gVAsS/9Gkp/tPf/+HTZ3zwq8rhO+XhhwABAgRyCNj855ijLgi8EvB0t4AA4G5CCxAgMKRACQHiX/okBBhyeoomQIDADQI2/zcgOYXAUAKKvV9AAHC/oRUIEBhV4N0fOgkBRh2eugkQIHBJwOb/ko73CAwqoOwKAgKACoiWIEBgYAEhwMDDUzoBAgTOCdj8n1PxGoHxBXRQQ0AAUEPRGgQIjC0gBBh7fqonQIDAawGb/9cUfiGQTUA/VQQEAFUYLUKAwPACQoDhR6gBAgRmF7D5n/0ToP/cArqrIyAAqONoFQIEMggIATJMUQ8ECEwpYPM/5dg1PZOAXisJCAAqQVqGAIEkAkKAJIPUBgEC8wjY/M8za53OK6DzWgICgFqS1iFAII+AECDPLHVCgEByAZv/5APWHoGXAv6sJiAAqEZpIQIEUgkIAVKNUzMECGQUsPnPOFU9ETgn4LV6AgKAepZWIkAgm4AQINtE9UOAQBoBm/80o9QIgesCzqgoIACoiGkpAgQSCggBEg5VSwQIjC1g8z/2/FRPYK2A82sKCABqalqLAIGcAkKAnHPVFQECAwrY/A84NCUTuE/A1VUFBABVOS1GgEBaASFA2tFqjACBUQRs/keZlDoJ1BSwVl0BAUBdT6sRIJBZQAiQebp6I0CgawGb/67HozgC7QSsXFlAAFAZ1HIECCQXEAIkH7D2CBDoT8Dmv7+ZqIjAXgLuU1tAAFBb1HoECOQXEALkn7EOCRDoRMDmv5NBKIPAMQLuWl1AAFCd1IIECEwhIASYYsyaJEDgSAGb/yP13ZtADwJqqC8gAKhvakUCBGYREALMMml9EiCwu4DN/+7kbkigPwEVNRAQADRAtSQBAhMJCAEmGrZWCRDYR8Dmfx9ndyHQu4D6WggIAFqoWpMAgbkEhABzzVu3BAg0FLD5b4hraQJjCai2iYAAoAmrRQkQmE5ACDDdyDVMgEBtAZv/2qLWIzCygNrbCAgA2rhalQCBGQWEADNOXc8ECFQRsPmvwmgRAnkEdNJIQADQCNayBAhMKiAEmHTw2iZAYLuAzf92O1cSyCqgr1YCAoBWstYlQGBeASHAvLPXOQECKwVs/leCOZ3AHAK6bCYgAGhGa2ECBKYWEAJMPX7NEyBwi4DN/y1KziEwo4Ce2wkIANrZWpkAgdkFhACzfwL0T4DAswI2/8/SeIMAAQINBQQADXEtTYAAgZMQwIeAAAECjwRs/h+BOCRA4IGAg5YCAoCWutYmQIBACAgBQsGDAAECRcDmvyD4IUDgkoD3mgoIAJryWpwAAQKvBIQAryA8ESAwr4DN/7yz1zmB2wWc2VZAANDW1+oECBB4IyAEeGPhNwIEJhOw+Z9s4NolsFXAdY0FBACNgS1PgACBBwJCgAccDggQmEHA5n+GKeuRQB0Bq7QWEAC0FrY+AQIEHgsIAR6LOCZAIK2AzX/a0WqMQAsBazYXEAA0J3YDAgQInBEQApxB8RIBArkEbP5zzVM3BNoLuEN7AQFAe2N3IECAwHkBIcB5F68SIJBAwOY/wRC1QGBvAffbQUAAsAOyWxAgQOBZASHAszTeIEBgVAGb/1Enp24Cxwq4+x4CAoA9lN2DAAEClwSEAJd0vEeAwFACNv9DjUuxBHoSUMsuAgKAXZjdhAABAlcEhABXgLxNgED/Ajb//c9IhQT6FVDZPgICgH2c3YUAAQLXBYQA142cQYBApwI2/50ORlkERhFQ504CAoCdoN2GAAECNwkIAW5ichIBAj0J2Pz3NA21EBhTQNV7CQgA9pJ2HwIECNwqIAS4Vcp5BAgcLmDzf/gIFEAgg4AedhMQAOxG7UYECBBYISAEWIHlVAIEjhGw+T/G3V0J5BPQ0X4CAoD9rN2JAAEC6wSEAOu8nE2AwI4CNv87YrsVgewC+ttRQACwI7ZbESBAYLWAEGA1mQsIEGgtYPPfWtj6BOYS0O2eAgKAPbXdiwABAlsEhABb1FxDgEATAZv/JqwWJTCzgN53FRAA7MrtZgQIENgoIATYCOcyAgTqCdj817O0EgECi4DnfQUEAPt6uxsBAgS2CwgBttu5kgCBOwVs/u8EdDkBAucFvLqzgABgZ3C3I0CAwF0CQoC7+FxMgMAWAZv/LWquIUDgFgHn7C0gANhb3P0IECBwr4AQ4F5B1xMgcLOAzf/NVE4kQGC9gCt2FxAA7E7uhgQIEKggIASogGgJAgQuC9j8X/bxLgEC9wq4fn8BAcD+5u5IgACBOgJCgDqOViFA4IyAzf8ZFC8RIFBXwGoHCAgADkB3SwIECFQTEAJUo7QQAQKLgM3/IuGZAIGWAtY+QkAAcIS6exIgQKCmgBCgpqa1CEwuYPM/+QdA+wT2E3CnQwQEAIewuykBAgQqCwgBKoNajsCMAjb/M05dzwSOEnDfYwQEAMe4uysBAgTqCwgB6ptakcA0Ajb/04xaowT6EFDFQQICgIPg3ZYAAQJNBIQATVgtSiC3gM1/7vnqjkCPAmo6SkAAcJS8+xIgQKCVgBCglax1CSQUsPlPOFQtEehfQIWHCQgADqN3YwIECDQUEAI0xLU0gSwCNv9ZJqkPAqMJqPc4AQHAcfbuTIAAgbYCQoC2vlYnMLSAzf/Q41M8gbEFVH+ggADgQHy3JkCAQHMBIUBzYjcgMJ6Azf94M1MxgUwCejlSQABwpL57EyBAYA8BIcAeyu5BYBABm/9BBqVMAnkFdHaogADgUH43J0CAwE4CQoCdoN2GQM8CNv89T0dtBGYR0OexAgKAY/3dnQABAvsJCAH2s3YnAt0J2Px3NxIFEZhTQNcHCwgADh6A2xMgQGBXASHArtxuRqAPAZv/PuagCgIETicGRwsIAI6egPsTIEBgbwEhwN7i7kfgQAGb/wPx3ZoAgccCjg8XEAAcPgIFECBA4AABIcAB6G5JYG8Bm/+9xd2PAIHLAt49XkAAcPwMVECAAIFjBIQAx7i7K4FdBGz+d2F2EwIE1gg4twMBAUAHQ1ACAQIEDhMQAhxG78YE2gnY/LeztTIBAtsFXNmDgACghymogQABAkcKCAGO1HdvApUFbP4rg1qOAIFaAtbpQkAA0MUYFEGAAIGDBYQABw/A7QnUELD5r6FoDQIE2ghYtQ8BAUAfc1AFAQIEjhcQAhw/AxUQ2Cxg87+ZzoUECOwh4B6dCAgAOhmEMggQINCFgBCgizEogsA6AZv/dV7OJkBgfwF37EVAANDLJNRBgACBXgSEAL1MQh0EbhCw+b8BySkECBwt4P7dCAgAuhmFQggQINCRgBCgo2EohcBzAk83/9//rR8/fdc3feh0Kv83/NxVXidAgMDeAu7Xj4AAoJ9ZqIQAAQJ9CZQNRGwkfuBvfMPruj79/R8+fcYHv6ocv1MefggQOE7g/Ob/7/3JL7H5P24o7kyAwHkBr3YkIADoaBhKIUCAQHcCQoDuRqIgAqfThc3/yf8jQIBAbwLq6UlAANDTNNRCgACBHgWEAD1ORU3TCtj8Tzt6jRMYVUDdXQkIALoah2IIECDQqcCrECD+98VLhf7nAIuEZwJ7Cdj87yXtPgQI1BOwUl8CAoC+5qEaAgQI9CtQQoD43xcLAfodkcoyC9j8Z56u3ggkFtBaZwICgM4GohwCBAj0LiAE6H1C6ssnYPOfb6Y6IjCLgD57ExAA9DYR9RAgQGAAASHAAENSYhIBm/8kg9QGgTkFdN2dgACgu5EoiAABAmMIPB8CjFG/Kgn0L2Dz3/+MVEiAwCUB7/UnIADobyYqIkCAwDAC50KA9/6M3zRM/Qol0K+AzX+/s1EZAQI3CjitQwEBQIdDURIBAgRGEngcArznAx89CQFGmqBa+xOw+e9vJioiQGC9gCt6FBAA9DgVNREgQGAwASHAYANTbscCNv8dD0dpBAisEXBulwICgC7HoigCBAiMJyAEGG9mKu5NwOa/t4mohwCB7QKu7FNAANDnXFRFgACBIQWEAEOOTdFdCNj8dzEGRRAgUEvAOp0KCAA6HYyyCBAgMKqAEGDUyan7OAGb/+Ps3ZkAgTYCVu1VQADQ62TURYAAgYEFhAADD0/pOwvY/O8M7nYECOwh4B7dCggAuh2NwggQIDC2gBBg7Pmpfg8Bm/89lN2DAIH9BdyxXwEBQL+zURkBAgSGFxACDD9CDTQTsPlvRmthAgSOFnD/jgUEAB0PR2kECBDIICAEyDBFPdQVsPmv62k1AgT6ElBNzwICgJ6nozYCBAgkERACJBmkNioI2PxXQLQEAQI9C6itawEBQNfjURwBAgTyCAgB8sxSJ1sFbP63yrmOAIFxBFTat4AAoO/5qI4AAQKpBIQAqcapmVVFkZlnAAAQAElEQVQCNv+ruJxMgMCoAuruXEAA0PmAlEeAAIFsAkKAbBPVz3UBm//rRs4gQCCHgC56FxAA9D4h9REgQCChgBAg4VC19IyAzf8zMF4mQCCjgJ66FxAAdD8iBRIgQCCngBAg51x19baAzf/bGn4nQCC/gA77FxAA9D8jFRIgQCCtgBAg7Wg1drL59yEgQGA6AQ0PICAAGGBISiRAgEBmASFA5unO2pvN/6yT1zeBuQV0P4KAAGCEKamRAAECyQWEAMkHPFV7Nv9TjVuzBAi8EfDbEAICgCHGpEgCBAjkFxAC5J9x/g5t/vPPWIcECDwn4PUxBAQAY8xJlQQIEJhCQAgwxZiTNmnzn3Sw2iJA4DYBZw0iIAAYZFDKJECAwCwCQoBZJp2pT5v/TNPUCwECWwRcM4qAAGCUSamTAAECEwkIASYa9vCt2vwPP0INECBwv4AVhhEQAAwzKoUSIEBgLgEhwFzzHrNbm/8x56ZqAgRqC1hvHAEBwDizUikBAgSmExACTDfygRq2+R9oWEolQKCtgNUHEhAADDQspRIgQGBGASHAjFPvvWeb/94npD4CBPYUcK+RBAQAI01LrQQIEJhUQAgw6eC7bNvmv8uxKIoAgeME3HkoAQHAUONSLAECBOYVEALMO/t+Orf572cWKiFAoBcBdYwlIAAYa16qJUCAwNQCQoCpx39w8zb/Bw/A7QkQ6FNAVYMJCAAGG5hyCRAgMLuAEGD2T8AR/dv8H6HungQIjCCgxtEEBACjTUy9BAgQIHASAvgQ7CnwGR/8qtOnv//Dr2/5/d/68Refwdcv+IUAAQKzCuh7OAEBwHAjUzABAgQIhIAQIBQ8Wgu892f8Jpv/1sjWJ0BgWAGFjycgABhvZiomQIAAgVcCQoBXEJ6aCMTm/z0f+Ojrtf03/68p/EKAAIEQ8BhQQAAw4NCUTIAAAQJvBIQAbyz8Vk/A5r+epZUIEMgqoK8RBQQAI05NzQQIECDwQEAI8IDDwZ0CNv93ArqcAIE5BHQ5pIAAYMixKZoAAQIEHgsIAR6LON4iYPO/Rc01BAjMKKDnMQUEAGPOTdUECBAgcEZACHAGxUs3C9j830zlRAIECBAYVEAAMOjglE2AAAEC5wWEAOddvHpZwOb/so93CRAg8FDA0agCAoBRJ6duAgQIEHhWQAjwLI03zgjY/J9B8RIBAgQuCXhvWAEBwLCjUzgBAgQIXBIQAlzS8d4iYPO/SHgmQIDA7QLOHFdAADDu7FROgAABAlcEhABXgCZ/2+Z/8g+A9gkQ2CrguoEFBAADD0/pBAgQIHBdQAhw3WjGM2z+Z5y6ngkQqCNglZEFBAAjT0/tBAgQIHCTgBDgJqZpTrL5n2bUGiVAoIWANYcWEAAMPT7FEyBAgMCtAkKAW6Vyn2fzn3u+uiNAoL2AO4wtIAAYe36qJ0CAAIEVAkKAFVgJT7X5TzhULREgsLeA+w0uIAAYfIDKJ0CAAIF1AkKAdV5Zzrb5zzJJfRAgcKyAu48uIAAYfYLqJ0CAAIHVAkKA1WRDX2DzP/T4FE+AQE8CahleQAAw/Ag1QIAAAQJbBIQAW9TGu8bmf7yZqZgAgX4FVDa+gABg/BnqgAABAgQ2CggBNsINcpnN/yCDUiYBAqMIqDOBgAAgwRC1QIAAAQLbBYQA2+16vtLmv+fpqI0AgTEFVJ1BQACQYYp6IECAAIG7BIQAd/F1d7HNf3cjURABAhkE9JBCQACQYoyaIECAAIF7BYQA9wr2cb3Nfx9zUAUBAvkEdJRDQACQY466IECAAIEKAkKACogHLmHzfyC+WxMgkF1Af0kEBABJBqkNAgQIEKgjIASo47j3Kjb/e4u7HwECcwnoNouAACDLJPVBgAABAtUEhADVKHdZyOZ/F2Y3IUBgZgG9pxEQAKQZpUYIECBAoKaAEKCmZru1bP7b2VqZAAECi4DnPAICgDyz1AkBAgQIVBYQAlQGrbyczX9lUMsRIEDgvIBXEwkIABINUysECBAgUF9ACFDftMaKNv81FK1BgACBWwSck0lAAJBpmnohQIAAgSYCQoAmrJsXtfnfTOdCAgQIrBdwRSoBAUCqcWqGAAECBFoJCAFaya5b1+Z/nZezCRAgcK+A63MJCAByzVM3BAgQINBQQAjQEPeGpW3+b0ByCgECBOoKWC2ZgAAg2UC1Q4AAAQJtBYQAbX2fW93m/zkZrxMgQKClgLWzCQgAsk1UPwQIECDQXEAI0Jz4wQ1s/h9wOCBAgMB+Au6UTkAAkG6kGiJAgACBPQSEAHson042//s4uwsBAgTOCXgtn4AAIN9MdUSAAAECOwkIAdpC2/y39bU6AQIErgh4O6GAACDhULVEgAABAvsJCAHaWNv8t3G1KgECBG4XcGZGAQFAxqnqiQABAgR2FRAC1OW2+a/raTUCBAhsEnBRSgEBQMqxaooAAQIE9hYQAtQRt/mv42gVAgQI3Cvg+pwCAoCcc9UVAQIECBwgIAS4D/3x5v97v+W3ncL0vlVdTYAAAQIbBFySVEAAkHSw2iJAgACBYwRiw/r93/rx1zd/zwc++uLfZP/6Bb+cFTi3+f/ub/5lZ8/1IgECBAi0FrB+VgEBQNbJ6osAAQIEDhMQAqyjt/lf5+VsAgQINBdwg7QCAoC0o9UYAQIECBwpIAS4Td/m/zYnZxEgQGBPAffKKyAAyDtbnREgQIDAwQJCgMsDsPm/7ONdAgQIHCTgtokFBACJh6s1AgQIEDheIEKA+JfZLZX4dwK8lLD5f+ngTwIECPQnoKLMAgKAzNPVGwECBAh0IRD/MjshwJtR2Py/sfAbAQIEuhNQUGoBAUDq8WqOAAECBHoREAK8nITN/0sHfxIgQKBXAXXlFhAA5J6v7ggQIECgI4HZQwCb/44+jEohQIDAeQGvJhcQACQfsPYIECBAoC+BWUMAm/++PoeqIUCAwHkBr2YXEABkn7D+CBAgQKA7gdlCAJv/7j6CCiJAgMB5Aa+mFxAApB+xBgkQIECgR4FZQgCb/x4/fWoiQIDAeQGv5hcQAOSfsQ4JECBAoFOB7CGAzX+nHzxlESBA4LyAVycQEABMMGQtEiBAgEC/AllDAJv/fj9zKiNAgMB5Aa/OICAAmGHKeiRAgACBrgWyhQA2/11/3BRHgACB8wJenUJAADDFmDVJgAABAr0LZAkBbP57/6SpjwABAucFvDqHgABgjjnrkgABAgQGEBg9BLD5H+BDpkQCBAicF/DqJAICgEkGrU0CBAgQGENg1BDA5n+Mz5cqCRAgcF7Aq7MICABmmbQ+CRAgQGAYgdFCAJv/YT5aCiVAgMB5Aa9OIyAAmGbUGiVAgACBkQRGCQFs/kf6VKmVAAEC5wW8Oo+AAGCeWeuUAAECBAYT6D0EsPkf7AOlXAIECJwX8OpEAgKAiYatVQIECBAYT6DXEMDmf7zPkooJECBwXsCrMwkIAGaatl4JECBAYEiB3kIAm/8hP0aKJkCAwHkBr04lIACYatyaJUCAAIFRBXoJAWz+R/0EqZsAAQLnBbw6l4AAYK5565YAAQIEBhY4OgSw+R/4w6N0AgQInBfw6mQCAoDJBq5dAgQIEBhb4KgQwOZ/7M+N6gkQIHBewKuzCQgAZpu4fgkQIEBgeIG9QwCb/+E/MhogQIDAeQGvTicgAJhu5BomQIAAgQwCe4UANv8ZPi16IECAwHkBr84nIACYb+Y6JkCAAIEkAq1DAJv/JB8UbRAgQOC8gFcnFBAATDh0LRMgQIBAHoFWIYDNf57PiE4IECBwXsCrMwoIAGacup4JECBAIJVA7RDA5j/Vx0MzBAgQOC/g1SkFBABTjl3TBAgQIJBNoFYIYPOf7ZOhHwIECJwX8OqcAgKAOeeuawIECBBIKHBvCGDzn/BDoSUCBAicF/DqpAICgEkHr20CBAgQyCmwNQSw+c/5edAVAQIEzgt4dVYBAcCsk9c3AQIECKQVWBsC2Pyn/ShojAABAucFvDqtgABg2tFrnAABAgQyC9waAtj8Z/4U6I0AAQLnBbw6r4AAYN7Z65wAAQIEkgtcCwFs/pN/ALRHgACB8wJenVhAADDx8LVOgAABAvkFngsBbP7zz16HBAgQOC/g1ZkFBAAzT1/vBAgQIDCFwLkQ4D0f+Ojr3r/3W37bKc55/YJfCBAgQCCvgM6mFhAATD1+zRMgQIDALAKxwY+N/rvRcPxRHuXnFK/Fe/GyBwECBAjkF9Dh3AICgLnnr3sCBAgQmEzgneg3/iiP8hNHHgQIECAwj4BOJxcQAEz+AdA+AQIECMwh8N6f+VtP7/nXv/RJs/FavPfkDS8QIECAQEIBLc0uIACY/ROgfwIECBBILxAb/NjoL41+71/7zad4LMfxXpyzHHsmQIAAgaQC2ppeQAAw/UcAAAECBAhkFoiNfWzwlx5j4//df/ZXnOIRvy+vxzlx7nLsmQABAgTyCeiIgADAZ4AAAQIECCQViA19bOyX9mLDHxv/5Th+j9eW4zg3rlmOPRMgQIBAKgHNEDgJAHwICBAgQIBAQoHYyMeGfmktNvqx4V+Ol+d4Ld5bjuOauHY59kyAAAECWQT0QeAkAPAhIECAAAEC2QRiAx8b+aWv2ODHRn85fvwc78U5y+txbayxHHsmQIAAgQQCWiBQBPwTAAXBDwECBAgQyCIQG/fYwC/9xMY+NvjL8XPPcU6cu7wfa8Ray7FnAgQIEBhbQPUEQkAAEAoeBAgQIEAggUBs2GPjvrQSG/rY2C/H157j3LhmOS/WijWXY88ECBAgMKyAwgm8EBAAvGDwBwECBAgQGFsgNuqxYV+6iI18bOiX41uf45q4djk/1oy1l2PPBAgQIDCigJoJvBQQALx08CcBAgQIEBhWIDbosVFfGogNfGzkl+O1z3FtrLFcF2vHPZZjzwQIECAwmIByCbwSEAC8gvBEgAABAgRGFIiNeWzQl9pj4x4b+OV463OsEWst18c94l7LsWcCBAgQGEdApQQWAQHAIuGZAAECBAgMJhAb8tiYL2XHhj027svxvc+xVqy5rBP3insux54JECBAYAgBRRJ4LSAAeE3hFwIECBAgMI5AbMRjQ75UHBv12LAvx7WeY81Ye1kv7hn3Xo49EyBAgEDvAuoj8EZAAPDGwm8ECBAgQGAIgdiAx0Z8KTY26LFRX45rP8facY9l3bh31LAceyZAgACBjgWURuAtAQHAWxh+JUCAAAECvQvExjs24EudsTGPDfpy3Oo57hH3WtaPGqKW5dgzAQIECPQpoCoCbwsIAN7W8DsBAgQIEOhYIDbcsfFeSowNeWzMl+PWz3GvuOdyn6glalqOPRMgQIBAdwIKIvBAQADwgMMBAQIECBDoUyA22rHhXqqLjXhsyJfjvZ7jnnHv5X5RU9S2HHsmQIAAgZ4E1ELgoYAA4KGHIwIECBAg0J1AbLBjo70UFhvw2Igvx3s/x72jhuW+UVvUuBx7JkCAAIFOJGmzAAAAEABJREFUBJRB4JGAAOARiEMCBAgQINCTQGysY4O91BQb79iAL8dHPUcNUcty/6gxal2OPRMgQIDA8QIqIPBYQADwWMQxAQIECBDoRCA21LGxXsqJDXdsvJfjo5+jlqhpqSNqjZqXY88ECBAgcKiAmxN4IiAAeELiBQIECBAgcLxAbKRjQ71UEhvt2HAvx708R01R21JP1By1L8eeCRAgQOAoAfcl8FRAAPDUxCsECBAgQOBQgdhAx0Z6KSI22LHRXo57e47aosalrqg9eliOPRMgQIDAAQJuSeCMgADgDIqXCBAgQIDAUQKxcY4N9HL/2FjHBns57vU5aoxal/qih+hlOfZMgAABAvsKuBuBcwICgHMqXiNAgAABAgcIxIY5Ns7LrWNDHRvr5bj356g1al7qjF6ip+XYMwECBAjsJuBGBM4KCADOsniRAAECBAjsKxAb5dgwL3eNjXRsqJfjUZ6j5qh9qTd6it6WY88ECBAgsIeAexA4LyAAOO/iVQIECBAgsJtAbJBjo7zcMDbQsZFejkd7jtqjh6Xu6C16XI49EyBAgEBjAcsTeEZAAPAMjJcJECBAgMAeArExjg3ycq/YOMcGejke9Tl6iF6W+qPH6HU59kyAAAEC7QSsTOA5AQHAczJeJ0CAAAECjQViQxwb4+U2sWGOjfNyPPpz9BI9LX1Er9HzcuyZAAECBJoIWJTAswICgGdpvEGAAAECBNoJxEY4NsTLHWKjHBvm5TjLc/QUvS39RM/R+3LsmQABAgRqC1iPwPMCAoDnbbxDgAABAgSaCMQGODbCy+KxQY6N8nKc7Tl6ix6XvqL3MFiOPRMgQIBARQFLEbggIAC4gOMtAgQIECBQWyA2vrEBXtaNjXFskJfjrM/RY/S69BcGYbEceyZAgACBOgJWIXBJQABwScd7BAgQIECgokBseGPjuywZG+LYGC/H2Z+j1+h56TMswmQ59kyAAAECdwtYgMBFAQHARR5vEiBAgACBOgKx0Y0N77JabIRjQ7wcz/IcPUfvS79hEjbLsWcCBAgQuEfAtQQuCwgALvt4lwABAgQI3C0QG9zY6C4LxQY4NsLL8WzP0XsYLH2HTRgtx54JECBAYKOAywhcERAAXAHyNgECBAgQuEcgNraxwV3WiI1vbICX41mfwyAslv7DKKyWY88ECBAgsF7AFQSuCQgArgl5nwABAgQIbBSIDW1sbJfLY8MbG9/lePbnsAiTxSGswmw59kyAAAECqwScTOCqgADgKpETCBAgQIDAeoHYyMaGdrkyNrqx4V2OPb8UCJOweXl0OoVZ2C3HngkQIEDgVgHnEbguIAC4buQMAgQIECCwSuBf+PyvebGRXS6KDW5sdJdjzw8FwiaMlleFAIuEZwIECKwQcCqBGwQEADcgOYUAAQIECNwqEJv/H/eTv/j16bGxjQ3u6xf8clYgjMJqeVMIsEh4JkCAwG0CziJwi4AA4BYl5xAgQIAAgRsEbP5vQLpwihDgAo63CBAgcFnAuwRuEhAA3MTkJAIECBAgcFnA5v+yz63vCgFulXIeAQIE3hbwO4HbBAQAtzk5iwABAgQIPCtg8/8szaY3hACb2FxEgMDMAnoncKOAAOBGKKcRIECAAIFzAjb/51Tuf+1cCBDW969sBQIECOQT0BGBWwUEALdKOY8AAQIECDwSiA2pf+HfI5SKh49DgLAO84q3sBQBAgQyCOiBwM0CAoCbqZxIgAABAgTeCMRGNDakyyvxb7CPDety7LmOQJiG7bJamIf9cuyZAAECBAgQuF1AAHC7lTMJECBAgMALgdiAxkb0xUH5IzaosVEtv/ppIBC2YbwsHfYxg+XYMwECBKYW0DyBFQICgBVYTiVAgAABArHxjA3oIhEb09igLsee2wiEcVgvq8cMYhbLsWcCBAjMKqBvAmsEBABrtJxLgAABAlMLxIYzNp4LQmxIY2O6HHtuKxDWYb7cJWYRM1mOPRMgQGBCAS0TWCUgAFjF5WQCBAgQmFUgNpqx4Vz6j41obEiXY8/7CIR52C93i5nEbJZjzwQIEJhLQLcE1gkIANZ5OZsAAQIEJhSIDWZsNJfWYwMaG9Hl2PO+AmEfM1juGrOJGS3HngkQIDCNgEYJrBQQAKwEczoBAgQIzCUQG8vYYC5dx8YzNqDLsedjBGIGMYvl7jGjmNVy7JkAAQIzCOiRwFoBAcBaMecTIECAwDQCsaGMjeXScGw4Y+O5HHs+ViBmETNZqohZxcyWY88ECBBILqA9AqsFBACryVxAgAABAjMIxEYyNpRLr7HRjA3ncuy5D4GYScxmqSZmFrNbjj0TIEAgr4DOCKwXEACsN3MFAQIECCQXiA1kbCSXNmODGRvN5dhzXwIxm5jRUlXMLma4HHsmQIBASgFNEdggIADYgOYSAgQIEMgrEBvH2EAuHcbGMjaYy7HnPgViRjGrpbqYYcxyOfZMgACBbAL6IbBFQACwRc01BAgQIJBSIDaMsXFcmosNZWwsl2PPfQvErGJmS5Uxy5jpcuyZAAECiQS0QmCTgABgE5uLCBAgQCCbQGwUY8O49BUbydhQLseexxCImcXslmpjpjHb5dgzAQIEcgjogsA2AQHANjdXESBAgEAigdggxkZxaSk2kLGRXI49jyUQs4sZLlXHbGPGy7FnAgQIDC+gAQIbBQQAG+FcRoAAAQI5BGJjGBvEpZvYOMYGcjn2PKZAzDBmuVQfM45ZL8eeCRAgMLKA2glsFRAAbJVzHQECBAgMLxAbwtgYLo3EhjE2jsux57EFYpYx06WLmHXMfDn2TIAAgUEFlE1gs4AAYDOdCwkQIEBgZIHYCMaGcOkhNoqxYVyOPecQiJnGbJduYuYx++XYMwECBMYTUDGB7QICgO12riRAgACBQQViAxgbwaX82CDGRnE59pxLIGYbM166itnHZ2A59kyAAIGhBBRL4A4BAcAdeC4lQIAAgfEEYuMXG8Cl8tgYxgZxOfacUyBmHLNeuovPQHwWlmPPBAgQGEVAnQTuERAA3KPnWgIECBAYSiA2fLHxW4qODWFsDJdjz7kFYtYx86XL+CzEZ2I59kyAAIEBBJRI4C4BAcBdfC4mQIAAgVEEYqMXG76l3tgIxoZwOfY8h0DMPGa/dBufifhsLMeeCRAg0LeA6gjcJyAAuM/P1QQIECAwgEBs8GKjt5QaG8DYCC7HnucSiNnHZ2DpOj4b8RlZjj0TIECgWwGFEbhTQABwJ6DLCRAgQKBvgdjYxQZvqTI2frEBXI49zykQn4H4LCzdx2ckPivLsWcCBAj0KKAmAvcKCADuFXQ9AQIECHQrEBu62NgtBcaGLzZ+y7HnuQXisxCfiUUhPivxmVmOPRMgQKAzAeUQuFtAAHA3oQUIECBAoEeB2MjFhm6pLTZ6seFbjj0TCIH4THzfJz8Wv754xGcmPjsvDvxBgACBrgQUQ+B+AQHA/YZWIECAAIHOBGIDFxu5pSyb/0XC8zmBT33iIychwDkZrxEg0JWAYghUEBAAVEC0BAECBAj0I2Dz388sxqnk3ZMQYJxpqZTArAL6JlBDQABQQ9EaBAgQINCFgM1/F2MYtAghwKCDUzaBWQT0SaCKgACgCqNFCBAgQOBoAZv/oyeQ4f5CgAxT1AOBnAK6IlBHQABQx9EqBAgQIHCggM3/gfjpbi0ESDdSDRHIIKAHApUEBACVIC1DgAABAscI2Pwf4577rkKA3PPVHYHxBFRMoJaAAKCWpHUIECBAYHcBm//dySe6oRBgomFrlUDvAuojUE1AAFCN0kIECBAgsKeAzf+e2rPeSwgw6+T1TaAvAdUQqCcgAKhnaSUCBAgQ2EnA5n8naLcpAkKAguCHAIEjBdybQEUBAUBFTEsRIECAQHsBm//2xu7wWEAI8FjEMQEC+wm4E4GaAgKAmprWIkCAAIGmAjb/TXktflFACHCRx5sECLQSsC6BqgICgKqcFiNAgACBVgI2/61krXu7gBDgditnEiBQR8AqBOoKCADqelqNAAECBBoI2Pw3QLXkRgEhwEY4lxEgsEXANQQqCwgAKoNajgABAgTqCtj81/W0Wg0BIUANRWsQIHBdwBkEagsIAGqLWo8AAQIEqgnY/FejtFB1ASFAdVILEiDwWMAxgeoCAoDqpBYkQIAAgRoCNv81FK3RVkAI0NbX6gRmF9A/gfoCAoD6plYkQIAAgTsFbP7vBHT5jgJCgB2x3YrAXAK6JdBAQADQANWSBAgQILBdwOZ/u50rjxIQAhwl774EMgvojUALAQFAC1VrEiBAgMAmAZv/TWwu6kJACNDFGBRBII+ATgg0ERAANGG1KAECBAisFbD5Xyvm/P4EhAD9zURFBEYVUDeBNgICgDauViVAgACBFQI2/yuwnNq5gBCg8wEpj8AYAqok0EhAANAI1rIECBAgcJuAzf9tTs4aSUAIMNK01EqgRwE1EWglIABoJWtdAgQIELgqYPN/lcgJwwoIAYYdncIJHC+gAgLNBAQAzWgtTIAAAQKXBB5v/r/vkx87ffef/RWXLvEegcEEhACDDUy5BDoRUAaBdgICgHa2ViZAgACBZwTObf4/9YmPPHO2lwmMLCAEGHl6aidwiICbEmgoIABoiGtpAgQIEHgq8Pzm/92nJ3uFQAoBIUCKMWqCwE4CbkOgpYAAoKWutQkQIEDggYDN/wMOB1MJCAGmGrdmCWwXcCWBpgICgKa8FidAgACBRcDmf5HwPK+AEGDe2eucwK0CziPQVkAA0NbX6gQIECBQBGz+C4IfAi8EhAAvGPxBgMB5Aa8SaCwgAGgMbHkCBAjMLmDzP/snQP9PBYQAT028QoBACHgQaC0gAGgtbH0CBAhMLGDzP/HwtX5FQAhwBcjbBGYU0DOB5gICgObEbkCAAIE5BWz+55y7rtcICAHWaDmXQH4BHRJoLyAAaG/sDgQIEJhOwOZ/upFreLOAEGAznQsJZBPQD4EdBAQAOyC7BQECBGYSsPmfadp6rSMgBKjjaBUCYwuonsAeAgKAPZTdgwABApMI2PxPMmhtNhAQAjRAtSSBkQTUSmAXAQHALsxuQoAAgfwCNv/5Z6zD1gJCgNbC1ifQr4DKCOwjIADYx9ldCBAgkFrA5j/1eDW3q4AQYFduNyPQi4A6COwkIADYCdptCBAgkFXA5j/rZPV1nIAQ4Dh7dyZwjIC7EthLQACwl7T7ECBAIKGAzX/CoWqpEwEhQCeDUAaBPQTcg8BuAgKA3ajdiAABArkEbP5zzVM3PQoIAXqcipoI1BewIoH9BAQA+1m7EwECBNII2PynGaVGuhcQAnQ/IgUSuFfA9QR2FBAA7IjtVgQIEMggYPOfYYp6GEtACDDWvFRLYJ2AswnsKSAA2FPbvQgQIDC4gM3/4ANU/sACQoCBh6d0ApcEvEdgVwEBwK7cbkaAAIFxBWz+x52dyrMICAGyTFIfBN4I+I3AvgICgH293Y0AAQLjCbzzI4BqcO4AABAASURBVE82/+ONTcVZBYQAWSerr0kFtE1gZwEBwM7gbkeAAIGhBMrm/31f8LtOP+4nf/Hrsr/vkx87feoTHynH75aHHwIE9hcQAuxv7o4E2ghYlcDeAgKAvcXdjwABAqMIvNr8/9if+AtfV2zz/5rCLwQOFhACHDwAtydQQ8AaBHYXEADsTu6GBAgQGEDA5n+AISmRgBDAZ4DA2AKqJ7C/gABgf3N3JECAQN8CNv99z0d1BB4ICAEecDggMJKAWgkcICAAOADdLQkQINCtgM1/t6NRGIHnBS6EAOX/pp+/zjsECBwp4N4EjhAQAByh7p4ECBDoUaBsFOJf+Od/89/jcNRE4JrA+RAg/m/6VP5v+9rV3idAYHcBNyRwiIAA4BB2NyVAgEBnAmWDEBsFm//O5qIcAqsEnoYA8X/T8X/bQoBVkE4msIOAWxA4RkAAcIy7uxIgQKAfAZv/fmahEgJ3CwgB7ia0AIE9BNyDwEECAoCD4N2WAAECXQjY/HcxBkUQqCsgBKjraTUC9QWsSOAoAQHAUfLuS4AAgaMFbP6PnoD7E2goIARoiGtpAvcKuJ7AYQICgMPo3ZgAAQIHCtj8H4jv1gT2EhAC7CXtPgTWCTibwHECAoDj7N2ZAAECxwjY/B/j7q4EDhEQAhzC7qYELgl4j8CBAgKAA/HdmgABArsL2PzvTu6GBI4XEAIcPwMVEHgj4DcCRwoIAI7Ud28CBAjsKWDzv6e2exHoTEAI0NlAlDOvgM4JHCogADiU380JECCwk4DN/07QbkOgZwEhQM/TUdssAvokcKyAAOBYf3cnQIBAewGb//bG7kBgGAEhwDCjUmhOAV0ROFhAAHDwANyeAAECTQVs/pvyWpzAmAJCgDHnpuoMAnogcLSAAODoCbg/AQIEWgnY/LeStS6BBAJCgARD1MJ4AiomcLiAAODwESiAAAECDQRs/hugWpJANgEhQLaJ6qd3AfUROF5AAHD8DFRAgACBugI2/3U9rUYgtYAQIPV4NdeXgGoIdCAgAOhgCEogQIBANQGb/2qUFiIwj4AQYJ5Z6/RIAfcm0IOAAKCHKaiBAAECNQRs/msoWoPApAJCgEkHr+39BNyJQBcCAoAuxqAIAgQI3Clg838noMsJEDidhAA+BQTaCViZQB8CAoA+5qAKAgQIbBew+d9u50oCBB4JCAEegTgkUEfAKgQ6ERAAdDIIZRAgQGCTgM3/JjYXESBwSUAIcEnHewS2CLiGQC8CAoBeJqEOAgQIrBWw+V8r5nwCBG4WEALcTOVEAtcFnEGgGwEBQDejUAgBAgRWCNj8r8ByKgEC2wSEANvcXEXgsYBjAv0ICAD6mYVKCBAgcJuAzf9tTs4iQKCCgBCgAqIlZhfQP4GOBAQAHQ1DKQQIELgqYPN/lcgJBAjUFhAC1Ba13lwCuiXQk4AAoKdpqIUAAQKXBGz+L+l4jwCBpgJCgKa8Fs8soDcCXQkIALoah2IIECDwjIDN/zMwXiZAYD8BIcB+1u6UR0AnBPoSEAD0NQ/VECBA4KmAzf9TE68QIHCQgBDgIHi3HVVA3QQ6ExAAdDYQ5RAgQOCBgM3/Aw4HBAj0ICAE6GEKahhDQJUEehMQAPQ2EfUQIEBgEbD5XyQ8EyDQnYAQoLuRKKhHATUR6E5AANDdSBREgACBImDzXxD8ECDQt4AQoO/5qO54ARUQ6E9AANDfTFREgMDsAjb/s38C9E9gIAEhwEDDUureAu5HoEMBAUCHQ1ESAQITC9j8Tzx8rRMYVUAIMOrk1N1WwOoEehQQAPQ4FTURIDCngM3/nHPXNYEUAkKAFGPURE0BaxHoUkAA0OVYFEWAwHQCNv/TjVzDBPIJCAHyzVRH2wVcSaBPAQFAn3NRFQECMwnY/M80bb0SSC4gBEg+YO3dKuA8Ap0KCAA6HYyyCBCYRMDmf5JBa5PATAJCgJmmrdfzAl4l0KuAAKDXyaiLAIH8Ajb/+WesQwLTCggBph29xkPAg0C3AgKAbkejMAIEUgvY/Kcer+YIEAgBIUAoeMwooGcC/QoIAPqdjcoIEMgqYPOfdbL6IkDgiYAQ4AmJF/IL6JBAxwICgI6HozQCBBIK2PwnHKqWCBC4LCAEuOzj3WwC+iHQs4AAoOfpqI0AgVwCNv+55qkbAgRWCAgBVmA5dWwB1RPoWkAA0PV4FEeAQBoBm/80o9QIAQJbBYQAW+VcN5KAWgn0LSAA6Hs+qiNAIIOAzX+GKeqBAIEqAkKAKowW6VdAZQQ6FxAAdD4g5REgMLiAzf/gA1Q+AQL1BYQA9U2t2IuAOgj0LiAA6H1C6iNAYFwBm/9xZ6dyAgQaCwgBGgNb/hgBdyXQvYAAoPsRKZAAgSEFbP6HHJuiCRDYU0AIsKe2e+0h4B4E+hcQAPQ/IxUSIDCagM3/aBNTLwEChwkIAQ6jd+P6AlYkMICAAGCAISmRAIGBBGz+BxqWUgkQ6ENACNDHHFRxr4DrCYwgIAAYYUpqJEBgDAGb/zHmpEoCBDoUEAJ0OBQlrRNwNoEhBAQAQ4xJkQQIdC9g89/9iBRIgEDvAkKA3iekvksC3iMwhoAAYIw5qZIAgZ4FbP57no7aCBAYSkAIMNS4FPtGwG8EBhEQAAwyKGUSINCpgM1/p4NRFgEC4woIAcad3byV65zAKAICgFEmpU4CBPoTsPnvbyYqIkAgiYAQIMkgZ2lDnwSGERAADDMqhRIg0JWAzX9X41AMAQIZBYQAGaeasyddERhHQAAwzqxUSoBALwI2/71MQh0ECKQXEAKkH3GGBvVAYCABAcBAw1IqAQIdCNj8dzAEJRAgMJeAEGCueY/XrYoJjCQgABhpWmolQOBYAZv/Y/3dnQCBiQWEABMPv/fW1UdgKAEBwFDjUiwBAocJ2PwfRu/GBAgQeCkgBHjp4M++BFRDYCwBAcBY81ItAQJHCNj8H6HungQIEDgjIAQ4g+KlIwXcm8BgAgKAwQamXAIEdhaw+d8Z3O0IECBwTUAIcE3I+/sJuBOB0QQEAKNNTL0ECOwnYPO/n7U7ESBAYJWAEGAVl5NbCViXwHACAoDhRqZgAgR2EbD534XZTQgQILBdQAiw3c6VdQSsQmA8AQHAeDNTMQECrQVs/lsLW58AAQKVBIQAlSAts0XANQQGFBAADDg0JRMg0FDA5r8hrqUJECDQQkAI0ELVmtcFnEFgRAEBwIhTUzMBAm0EbP7buFqVAAECzQWEAM2J3eCxgGMCQwoIAIYcm6IJEKguYPNfndSCBAgQ2FdACLCv9+x30z+BMQUEAGPOTdUECNQUsPmvqWktAgQIHCggBDgQf65b65bAoAICgEEHp2wCBCoJ2PxXgrQMAQIEehEQAvQyicx16I3AqAICgFEnp24CBO4XsPm/39AKBAgQ6FJACNDlWPIUpRMCwwoIAIYdncIJELhLwOb/Lj4XEyBAoH8BIUD/Mxq1QnUTGFdAADDu7FROgMBWAZv/rXKuI0CAwGACQoDBBjZGuaokMLCAAGDg4SmdAIENAjb/G9BcQoAAgZEFhAAjT6/H2tVEYGQBAcDI01M7AQLrBH7Ep53e9wW/6/Rjf+IvfH3d933yY6dPfeIj5fjd8vBDgAABAjkFhAA553pIV25KYGgBAcDQ41M8AQI3C5TN/7/4s36fzf/NYE4kQIBANgEhQLaJHtOPuxIYW0AAMPb8VE+AwC0Crzb/P+Yzf87rs/03/68p/EKAAIGJBIQAEw27TatWJTC4gABg8AEqnwCBKwI2/1eAvE2AAIHZBIQAs028Zr/WIjC6gABg9AmqnwCB5wVs/p+38Q4BAgSmFhACTD3+7c27ksDwAgKA4UeoAQIEzgrY/J9l8SIBAgQILAIXQoDyHbKc5ZnAGwG/ERhfQAAw/gx1QIDAY4HyF7f4F/753/w/hnFMgAABAg8FzocA8R1yKt8lD891NL0AAAIJBAQACYaoBQIE3hIof2GLv7jZ/L9l4lcCBAgQuCDwNASI75D4LhECXGCb8C0tE8ggIADIMEU9EEgsEP8h9R+U/n5defze8vib5fGd5fGN5fEbyuOLyuNHl8eLH5v/Fwz+IECAAIG1AtdDgPiu+VBZ9ivK4w+Ux98tj/hOiu+mLy+/x3dVfGeVX/3kFNAVgRQC/nMqxRg1QSCnwL9R2vrm8vj95RF/ufrC8vzZ5fETyuPnlcevKY/fXR5/pTx+9js/6hT/bU38tzbl8MWP/6/+XjD4gwABAgRuEng+BIjvmPiu+fqyzpeVx88tj/eVR3wnxXdThNTxXRXfWfHdVd7yk05AQwRyCAgAcsxRFwRSCfxzpZv/uTz+Qnn82+Vx7eenlBP+8Lv/5PR//fWvPr3vH/6dcnQ62fy/YPAHAQIECKwSePf0qU985MV3SFwW3yn/9yc/dorvmPiuidcuPeI7K767/qdyUnyXlSc/WQT0QSCJgAAgySC1QSCTwK8tzfyq8vhR5bHm5wu/7WtPv/bPfPTFX9ziL3Cn07trLncuAQIECBAoAm9CgPhO+Q+//evKa7f/xHfXry6nx/dYefKTREAbBLIICACyTFIfBJIIfH7p41eWx9afX/Dtv/P0cz7xX5TLbf4Lgh8CBAgQ2CTw7ovvkvhO2XR5uejLyuNzysNPCgFNEEgjIABIM0qNEBhf4NNKCx8vj3v/g+m3lzU+qzz8ECBAgACBLQKfWS76yvK45ye+076mLBDP5cnP0AKKJ5BH4N6/Z+eR0AkBAocL/OxSwS3/G8ty2sWf95Z3v7g8/BAgQIAAgS0CX1Iu+vHlce9P/BMA8d127zquP1jA7QkkEhAAJBqmVgiMLvC5FRv4qRXXshQBAgQIzCVQ8/uo5lpzTaGfblVCIJOAACDTNPVCYHCBmn9JEgAM/mFQPgECBA4UqPl9VHOtA0lmvrXeCaQSEACkGqdmCIwtUPMvST+tUPgPuILghwABAgRWCcT/933/6qorLp9c87vt8p2820bAqgRyCfj7ca556oYAgVcC/sPtFYQnAgQIEFgl8I/K2fEoT34InE4MCCQT8HfkZAPVDoGRBf58xeL/Ylnrh8vDDwECBAgQWCMQ3x1/ac0FV86t+d125VbebiBgSQLZBAQA2SaqHwIDC9T8S1LNtQYmVToBAgQIbBCo+R3yiQ33d0k3AgohkE5AAJBupBoiMK5Azb9w1VxrXFGVEyBAgMAWgZrfIQKALRPo5Rp1EMgnIADIN1MdERhW4I+Uymv8RenbyjpfVx5+CBAgQIDAFoHfWS76jvK49+dPlwXiUZ78jCigZgIJBQQACYeqJQKjCvxgKfw/LY8fKI+tP/G/3fxF5eLvKQ8/BAgQIEBgi8DfLxf95+UR3ynladNPfA/F99E9a2y6sYuqCViIQEYBAUDGqeqJwMAC31pq/9Ly2PrzP5QL/bctBcEPAQIECNwl8AfL1b+xPLb+/Jflwvgn0sqTnzEFVE0gpYAAIOVYNUVgbIHfUco0Civ0AAAQAElEQVT/UHl8V3nc+hP/Xzb9d+XkX18efggQIECAQA2BLyuL/LflEd8x5emmn/juiu8w/1O0m7g6PklpBHIKCAByzlVXBIYX+P9LB/9meXxjeVz7+VPlhM8tj/+tPN4tDz8ECBAgQKCGQHyn/O9lofiOie+a8uvFn+W7K54vnujN/gVUSCCpgAAg6WC1RSCDQPy3KD+/NPJTyuOXlkf8kwHxPxH4W+X3+G9W/qvy/NPK44Pl8S3l4YcAAQIECLQQiO+Y+K6JYDr+0f6vLTeJ76L4Torvpg+X4/eXR/w3//HdVX71M7iA8glkFRAAZJ2svggkElj+ghUhQIQBn116+8Xl8X+Ux18pDz8ECBAgQGAPgb9abvJ/lscvKY/4LorvpPhu+upy/NfLw08aAY0QSCsgAEg7Wo0RIECAAAECBAgQILBewBUE8goIAPLOVmcECBAgQIAAAQIECKwVcD6BxAICgMTD1RoBAgQIECBAgAABAusEnE0gs4AAIPN09UaAAAECBAgQIECAwBoB5xJILSAASD1ezREgQIAAAQIECBAgcLuAMwnkFhAA5J6v7ggQIECAAAECBAgQuFXAeQSSCwgAkg9YewQIECBAgAABAgQI3CbgLALZBQQA2SesPwIECBAgQIAAAQIEbhFwDoH0AgKA9CPWIAECBAgQIECAAAEC1wWcQSC/gAAg/4x1SIAAAQIECBAgQIDANQHvE5hAQAAwwZC1SIAAAQIECBAgQIDAZQHvEphBQAAww5T1SIAAAQIECBAgQIDAJQHvEZhCQAAwxZg1SYAAAQIECBAgQIDA8wLeITCHgABgjjnrkgABAgQIECBAgACB5wS8TmASAQHAJIPWJgECBAgQIECAAAEC5wW8SmAWAQHALJPWJwECBAgQIECAAAEC5wS8RmAaAQHANKPWKAECBAgQIECAAAECTwW8QmAeAQHAPLPWKQECBAgQIECAAAECjwUcE5hIQAAw0bC1SoAAAQIECBAgQIDAQwFHBGYSEADMNG29EiBAgAABAgQIECDwtoDfCUwlIACYatyaJUCAAAECBAgQIEDgjYDfCMwlIACYa966JUCAAAECBAgQIEBgEfBMYDIBAcBkA9cuAQIECBAgQIAAAQIvBfxJYDYBAcBsE9cvAQIECBAgQIAAAQIh4EFgOgEBwHQj1zABAgQIECBAgAABAqcTAwLzCQgA5pu5jgkQIECAAAECBAgQIEBgQgEBwIRD1zIBAgQIECBAgACB2QX0T2BGAQHAjFPXMwECBAgQIECAAIG5BXRPYEoBAcCUY9c0AQIECBAgQIAAgZkF9E5gTgEBwJxz1zUBAgQIECBAgACBeQV0TmBSAQHApIPXNgECBAgQIECAAIFZBfRNYFYBAcCsk9c3AQIECBAgQIAAgTkFdE1gWgEBwLSj1zgBAgQIECBAgACBGQX0TGBeAQHAvLPXOQECBAgQIECAAIH5BHRMYGIBAcDEw9c6AQIECBAgQIAAgdkE9EtgZgEBwMzT1zsBAgQIECBAgACBuQR0S2BqAQHA1OPXPAECBAgQIECAAIGZBPRKYG4BAcDc89c9AQIECBAgQIAAgXkEdEpgcgEBwOQfAO0TIECAAAECBAgQmEVAnwRmFxAAzP4J0D8BAgQIECBAgACBOQR0SWB6AQHA9B8BAAQIECBAgAABAgRmENAjAQICAJ8BAgQIECBAgAABAgTyC+iQAIGTAMCHgAABAgQIECBAgACB9AIaJEDgJADwISBAgAABAgQIECBAIL2ABgkQKAL+CYCC4IcAAQIECBAgQIAAgcwCeiNAIAQEAKHgQYAAAQIECBAgQIBAXgGdESDwQkAA8ILBHwQIECBAgAABAgQIZBXQFwECLwUEAC8d/EmAAAECBAgQIECAQE4BXREg8EpAAPAKwhMBAgQIECBAgAABAhkF9ESAwCIgAFgkPBMgQIAAAQIECBAgkE9ARwQIvBYQALym8AsBAgQIECBAgAABAtkE9EOAwBsBAcAbC78RIECAAAECBAgQIJBLQDcECLwlIAB4C8OvBAgQIECAAAECBAhkEtALAQJvCwgA3tbwOwECBAgQIECAAAECeQR0QoDAAwEBwAMOBwQIECBAgAABAgQIZBHQBwECDwUEAA89HBEgQIAAAQIECBAgkENAFwQIPBIQADwCcUiAAAECBAgQIECAQAYBPRAg8FhAAPBYxDEBAgQIECBAgAABAuML6IAAgScCAoAnJF4gQIAAAQIECBAgQGB0AfUTIPBUQADw1MQrBAgQIECAAAECBAiMLaB6AgTOCAgAzqB4iQABAgQIECBAgACBkQXUToDAOQEBwDkVrxEgQIAAAQIECBAgMK6AygkQOCsgADjL4kUCBAgQIECAAAECBEYVUDcBAucFBADnXbxKgAABAgQIECBAgMCYAqomQOAZAQHAMzBeJkCAAAECBAgQIEBgRAE1EyDwnIAA4DkZrxMgQIAAAQIECBAgMJ6AigkQeFZAAPAsjTcIECBAgAABAgQIEBhNQL0ECDwvIAB43sY7BAgQIECAAAECBAiMJaBaAgQuCAgALuB4iwABAgQIECBAgACBkQTUSoDAJQEBwCUd7xEgQIAAAQIECBAgMI6ASgkQuCggALjI400CBAgQIECAAAECBEYRUCcBApcFBACXfbxLgAABAgQIECBAgMAYAqokQOCKgADgCpC3CRAgQIAAAQIECBAYQUCNBAhcExAAXBPyPgECBAgQIECAAAEC/QuokACBqwICgKtETiBAgAABAgQIECBAoHcB9REgcF1AAHDdyBkECBAgQIAAAQIECPQtoDoCBG4QEADcgOQUAgQIECBAgAABAgR6FlAbAQK3CAgAblFyDgECBAgQIECAAAEC/QqojACBmwQEADcxOYkAAQIECBAgQIAAgV4F1EWAwG0CAoDbnJxFgAABAgQIECBAgECfAqoiQOBGAQHAjVBOI0CAAAECBAgQIECgRwE1ESBwq4AA4FYp5xEgQIAAAQIECBAg0J+AiggQuFlAAHAzlRMJECBAgAABAgQIEOhNQD0ECNwuIAC43cqZBAgQIECAAAECBAj0JaAaAgRWCAgAVmA5lQABAgQIECBAgACBngTUQoDAGgEBwBot5xIgQIAAAQIECBAg0I+ASggQWCUgAFjF5WQCBAgQIECAAAECBHoRUAcBAusEBADrvJxNgAABAgQIECBAgEAfAqogQGClgABgJZjTCRAgQIAAAQIECBDoQUANBAisFRAArBVzPgECBAgQIECAAAECxwuogACB1QICgNVkLiBAgAABAgQIECBA4GgB9ydAYL2AAGC9mSsIECBAgAABAgQIEDhWwN0JENggIADYgOYSAgQIECBAgAABAgSOFHBvAgS2CAgAtqi5hgABAgQIECBAgACB4wTcmQCBTQICgE1sLiJAgAABAgQIECBA4CgB9yVAYJuAAGCbm6sIECBAgAABAgQIEDhGwF0JENgoIADYCOcyAgQIECBAgAABAgSOEHBPAgS2CggAtsq5jgABAgQIECBAgACB/QXckQCBzQICgM10LiRAgAABAgQIECBAYG8B9yNAYLuAAGC7nSsJECBAgAABAgQIENhXwN0IELhDQABwB55LCRAgQIAAAQIECBDYU8C9CBC4R0AAcI+eawkQIECAAAECBAgQ2E/AnQgQuEtAAHAXn4sJECBAgAABAgQIENhLwH0IELhPQABwn5+rCRAgQIAAAQIECBDYR8BdCBC4U0AAcCegywkQIECAAAECBAgQ2EPAPQgQuFdAAHCvoOsJECBAgAABAgQIEGgv4A4ECNwtIAC4m9ACBAgQIECAAAECBAi0FrA+AQL3CwgA7je0AgECBAgQIECAAAECbQWsToBABQEBQAVESxAgQIAAAQIECBAg0FLA2gQI1BAQANRQtAYBAgQIECBAgAABAu0ErEyAQBUBAUAVRosQIECAAAECBAgQINBKwLoECNQREADUcbQKAQIECBAgQIAAAQJtBKxKgEAlAQFAJUjLECBAgAABAgQIECDQQsCaBAjUEhAA1JK0DgECBAgQIECAAAEC9QWsSIBANQEBQDVKCxEgQIAAAQIECBAgUFvAegQI1BMQANSztBIBAgQIECBAgAABAnUFrEaAQEUBAUBFTEsRIECAAAECBAgQIFBTwFoECNQUEADU1LQWAQIECBAgQIAAAQL1BKxEgEBVAQFAVU6LESBAgAABAgQIECBQS8A6BAjUFRAA1PW0GgECBAgQIECAAAECdQSsQoBAZQEBQGVQyxEgQIAA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", sha256: "15c5ad1c924b8e1c46ae4ffe59c4f7785e8ff5c130f9000432821410b1fd1338" };
  var opt = (values) => Object.fromEntries(values.map((v) => [v, v]));
  var labels = {
    preset: "配置起点",
    frame: "机架构型",
    span: "最大电机中心距（mm）",
    angles: "相邻夹角",
    custom: "自定义夹角（°）",
    root: "臂根过渡",
    camera: "前向相机",
    body: "机身轮廓",
    seams: "上壳分件",
    finish: "上壳表面",
    color: "上壳主色",
    material: "外露机架",
    width: "机臂宽度",
    thickness: "机臂厚度",
    guide: "定位图"
  };
  var open = { open: "留白 · 自由探索" };
  var options = {
    preset: { base: "随行航拍四旋", ...Object.fromEntries(Object.entries(quadDirections).map(([k, v]) => [k, v.label])) },
    frame: { "True X": "径向 X（默认等角）", "Wide X": "宽 X", "Stretch X": "伸展 X", "H-Frame": "H 型", "Deadcat": "Deadcat（前宽后收）", "+ Configuration": "十字型" },
    angles: { frame: "随构型", ...Object.fromEntries(["90-90-90-90", "75-105-75-105", "60-120-60-120", "45-135-45-135"].map((v) => [v, v.split("-").join(" / ") + "°"])), custom: "手动填写" },
    root: { ...open, shoulder: "短肩包覆", taper: "长渐缩融合", socket: "外露接合", hinge: "折叠铰接" },
    camera: { ...open, inside: "内嵌鼻舱", outside: "前伸云台" },
    body: { ...open, "Minimalist Plate": "极简平板", "Aerodynamic Pod": "流线座舱", "Boxy Enclosure": "方正机壳", "Exposed Stack": "裸露堆叠" },
    seams: { ...open, one: "单盖缝", few: "少分件（2–3 条盖缝）", many: "多分件（4 条以上）" },
    finish: { ...open, matte: "细砂哑光", satin: "平滑缎面" },
    color: { ...open, "#8a9095": "冷灰", "#0ea5e9": "天空蓝", "#1e293b": "炭黑", "#ffffff": "纯白", "#f97316": "橙红", "#10b981": "翠绿", "#7c3aed": "深紫", "#f59e0b": "金黄", "#ec4899": "玫红" },
    material: { "Carbon Fiber": "碳纤维", Aluminum: "铝合金", "ABS Plastic": "ABS 塑料", "PLA Plastic": "PLA 塑料" },
    width: opt(["10mm", "15mm", "20mm"]),
    thickness: opt(["3mm", "4mm", "5mm", "6mm"]),
    guide: { axes: "轴心与机架连线", tips: "轴心、机架与双叶方向" }
  };
  var rootText = {
    shoulder: "机臂以短而圆润的肩部从机身过渡至臂宽。",
    taper: "机臂从机身逐渐收窄，以较长的连续曲面过渡到臂宽。",
    socket: "机臂插入轮廓可辨的臂根接口，接合处可见横向接缝。",
    hinge: "臂根为折叠铰接，显示转轴和接合间隙，机臂处于展开状态。"
  };
  var camText = {
    inside: "相机外壳收在机鼻前缘轮廓以内。",
    outside: "云台上壳伸出机鼻前缘，具体接合细节可探索。"
  };
  var seamText = { one: "上盖有一条盖缝。", few: "上盖有两至三条可辨盖缝。", many: "上盖有至少四条可辨盖缝。" };
  function nativeQuad() {
    return {
      frame: { frame_type: "True X", wheelbase_mm: 250, arm_width_mm: "15mm", arm_thickness_mm: "4mm", material_visual: "Carbon Fiber" },
      propulsion: { prop_diameter_inch: 5, prop_blade_count: quadBladeCount, motor_tilt_degree: 0 },
      fuselage: { fuselage_style: "Minimalist Plate", fuselage_dimensions_mm: { length: 100, width: 80, height: 30 } },
      landing_gear: { landing_gear_style: "低矮滑撬/支腿", landing_gear_height_mm: 40 },
      accessories: { has_camera_gimbal: true, drone_primary_color: "#8a9095", custom_prompt_additions: "" }
    };
  }
  var keys = Object.keys(labels);
  var has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function patched(raw, patch) {
    const copy = { ...raw };
    for (const [k, v] of Object.entries(patch)) {
      if (!has(labels, k)) throw Error("未知选择字段：" + k);
      if (v == null) delete copy[k];
      else if (typeof v === "string" || typeof v === "number") copy[k] = v;
      else throw Error("不支持的字段类型：" + k);
    }
    return copy;
  }
  var studyValues = {
    frame: "True X",
    span: 250,
    angles: "frame",
    custom: "",
    guide: "axes"
  };
  function unlocked(raw, study) {
    const next = { ...raw };
    if (study) for (const key of Object.keys(studyValues)) delete next[key];
    return next;
  }
  function evaluate(selection, studyLayout = false) {
    const raw = unlocked(selection, studyLayout);
    const preset = String(raw.preset ?? "base");
    const p0 = nativeQuad(), seeded = has(quadDirections, preset);
    const { inputs: d, parameters: p } = seeded ? directionDraft(preset, p0) : { inputs: newInputs("quad"), parameters: p0 };
    const defaults = {
      preset: "base",
      frame: p.frame.frame_type,
      span: p.frame.wheelbase_mm,
      angles: "frame",
      custom: "",
      body: seeded ? p.fuselage.fuselage_style : "open",
      camera: "open",
      root: "open",
      seams: "open",
      material: p.frame.material_visual,
      width: p.frame.arm_width_mm,
      thickness: p.frame.arm_thickness_mm,
      color: p.accessories.drone_primary_color,
      finish: d.shellFinish ?? "matte",
      guide: d.guideTips ? "tips" : "axes"
    };
    if (studyLayout) Object.assign(defaults, studyValues);
    const v = { ...defaults, ...raw };
    const fields = Object.fromEntries(keys.map((k) => [k, {
      value: v[k],
      label: options[k]?.[v[k]] ?? String(v[k]),
      source: studyLayout && has(studyValues, k) ? "task" : has(raw, k) ? "selected" : seeded && (k === "body" || k === "guide") ? "preset" : "default",
      active: k !== "custom" || v.angles === "custom",
      open: v[k] === "open"
    }]));
    const research = {
      schema: "c1-selection/1",
      studyLayout,
      selection: { ...raw },
      fields,
      taskLayout: studyLayout ? { frame: "True X", spanMm: 250, adjacentDeg: [90, 90, 90, 90], guide: "axes", bladeTips: false } : null,
      legacyFallbacks: { landing_gear: "未参与提示词", has_camera_gimbal: v.camera === "outside" ? "前伸云台" : "原模型布尔默认，不约束相机安装方式" },
      fixed: { rotors: 4, blades: 2, diameterInch: 5, tiltDeg: 0, view: "top", cameraDirection: "forward" },
      // Native Draft requires concrete component values even for omitted groups.
      // The constraints in inputs/groups and the compiler text govern the handoff.
      bodyEnvelopeMm: v.body === "open" ? null : { ...p.fuselage.fuselage_dimensions_mm }
    };
    const draft = { inputs: { ...d, c1Selection: research }, parameters: p, profile: null };
    const state = { selection: { ...raw }, research, defaults };
    const errors = [];
    for (const k of keys) if (options[k] && !has(options[k], String(v[k]))) errors.push(labels[k] + "：请选择有效选项。");
    const span = typeof v.span === "number" ? v.span : /^\d+$/.test(v.span) ? Number(v.span) : NaN;
    if (!Number.isInteger(span) || span < 100 || span > 500) errors.push("最大电机中心距须为 100–500 mm 的整数。");
    try {
      if (errors.length) throw Error(errors.join(" "));
      const frame = p.frame;
      frame.frame_type = v.frame;
      frame.wheelbase_mm = span;
      frame.arm_width_mm = v.width;
      frame.arm_thickness_mm = v.thickness;
      frame.material_visual = v.material;
      if (v.body !== "open") p.fuselage.fuselage_style = v.body;
      if (v.color !== "open") p.accessories.drone_primary_color = String(v.color);
      const i = draft.inputs;
      i.groups = ["frame", "propulsion"];
      if (v.body !== "open") i.groups.push("fuselage");
      i.gaps = v.angles === "frame" ? "" : String(v.angles === "custom" ? v.custom : v.angles);
      if (v.angles === "custom" && !i.gaps.trim()) throw Error("请填写从 R1 起顺时针的四个相邻夹角。");
      i.guideLines = true;
      i.guideTips = i.guideBladeLines = v.guide === "tips";
      i.source = "日常随行航拍四旋任务，采用本次选择及未改动的配置默认值。";
      i.change = ["明确机身、前向相机与展开机臂的轮廓关系。", rootText[v.root], camText[v.camera], seamText[v.seams]].filter(Boolean).join("");
      i.keep = "保留四个电机轴心和前向航拍功能。" + (studyLayout ? "相机位于机头端。" : "") + "镜头水平朝前，正上方不要求看见镜片。";
      const free = [
        "未指定的外观细节",
        ...v.root === "open" ? ["臂根过渡"] : [],
        ...v.camera === "open" ? [studyLayout ? "机鼻范围内的相机位置及安装方式" : "相机位置及安装方式"] : [],
        ...v.body === "open" ? ["机身轮廓和包络"] : [],
        ...v.seams === "open" ? ["上壳分件"] : [],
        ...v.color === "open" ? ["上壳主色"] : [],
        ...v.finish === "open" ? ["上壳表面处理"] : []
      ];
      i.free = free.join("、") + "可探索。";
      i.instruction = [i.change, i.keep, i.free].join("\n");
      i.applyCmf = v.color !== "open" && v.finish !== "open";
      if (v.finish !== "open") i.shellFinish = v.finish;
      else delete i.shellFinish;
      if (!i.applyCmf) p.accessories.custom_prompt_additions = [
        v.color !== "open" ? "上壳主色 " + v.color : "",
        v.finish !== "open" ? shellFinishes[v.finish] : "",
        "外露机架为" + frameSurfaces[frame.material_visual],
        propSurface
      ].filter(Boolean).join("；") + "。";
      const layout = layoutFor(p, i, studyLayout ? 1024 * 0.41 / (250 / Math.sqrt(2)) : void 0);
      if (i.gaps && !["True X", "H-Frame"].includes(frame.frame_type)) {
        const canonical = layoutFor(p, { ...i, gaps: "", guideTips: false });
        if (canonical.adjacent_deg.some((a, k) => Math.abs(a - layout.adjacent_deg[k]) > 1e-5))
          throw Error("所填夹角与所选构型的定义不一致。可选“随构型”，或切换径向 X / H 型后指定夹角。");
      }
      if (layout.hubs.some((a, k) => layout.hubs.slice(k + 1).some((b) => Math.hypot(a.x_px - b.x_px, a.y_px - b.y_px) < 4)))
        throw Error("相邻轴心在定位图上过近，请增大间距。");
      const prompt = compile(p, null, i, layout, false);
      return { ...state, validation: { ok: true, errors: [] }, draft, layout, prompt };
    } catch (err) {
      return { ...state, validation: { ok: false, errors: errors.length ? errors : [err.message] }, draft: null, layout: null, prompt: "" };
    }
  }
  async function exportState(s) {
    if (!s.draft || !s.layout) throw Error(s.validation.errors.join(" "));
    const v = await freeze(s.draft, s.layout, s.prompt, s.prompt, "compiler", null, null, "");
    if (s.research.studyLayout) {
      v.guide = { ...studyGuide };
      v.request.references[0] = { role: "top-layout", mime: v.guide.mime, sha256: v.guide.sha256 };
    }
    return v;
  }

  // src/design/c1Controls.ts
  var nextId = 0;
  function el(tag, cls = "", text = "") {
    const node = document.createElement(tag);
    node.className = cls;
    node.textContent = text;
    return node;
  }
  function button(cls, text) {
    const b = el("button", cls, text);
    b.type = "button";
    return b;
  }
  var frameNames = { "True X": "径向 X", "Wide X": "宽 X", "Stretch X": "伸展 X", "H-Frame": "H 型", Deadcat: "Deadcat", "+ Configuration": "十字型" };
  function frameIcon(frame) {
    const l = evaluate({ frame, guide: "axes" }).layout;
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "275 275 474 474");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", l.links.map(([x, y, u, v]) => "M" + x + " " + y + "L" + u + " " + v).join(" "));
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "22");
    svg.append(path);
    for (const h of l.hubs) {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", String(h.x_px));
      c.setAttribute("cy", String(h.y_px));
      c.setAttribute("r", "28");
      c.setAttribute("fill", "currentColor");
      svg.append(c);
    }
    return svg;
  }
  function controls(root, study, update) {
    const id = "c1s-" + ++nextId + "-", paints = [];
    const tabs = el("div", "c1s-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "参数分类");
    root.append(tabs);
    const pages = ["构型", "部件", "色材"].map((title, i) => {
      const tab = button("c1s-tab", title), pane = el("div", "c1s-page");
      tab.setAttribute("role", "tab");
      tab.id = id + "tab" + i;
      pane.id = id + "page" + i;
      tab.setAttribute("aria-controls", pane.id);
      pane.setAttribute("role", "tabpanel");
      pane.setAttribute("aria-labelledby", tab.id);
      tab.onclick = () => activate(i);
      tab.onkeydown = (e) => {
        const to = { ArrowLeft: (i + 2) % 3, ArrowRight: (i + 1) % 3, Home: 0, End: 2 };
        if (Object.prototype.hasOwnProperty.call(to, e.key)) {
          e.preventDefault();
          activate(to[e.key]);
          pages[to[e.key]].tab.focus();
        }
      };
      tabs.append(tab);
      root.append(pane);
      return { tab, pane };
    });
    function activate(i) {
      pages.forEach(({ tab, pane }, j) => {
        tab.tabIndex = i === j ? 0 : -1;
        tab.setAttribute("aria-selected", String(i === j));
        pane.hidden = i !== j;
      });
    }
    activate(study ? 1 : 0);
    function group(k, parent) {
      const group2 = el("fieldset", "c1s-block"), legend = el("legend", "c1s-legend"), title = el("span", "", labels[k]);
      const status = el("small", "c1s-source"), reset = button("c1s-reset", "恢复默认");
      reset.setAttribute("aria-label", labels[k] + "：恢复默认");
      reset.onclick = () => {
        const focus = group2.querySelector('input:checked,select,input:not([type="radio"])');
        focus?.focus();
        update({ [k]: null });
      };
      legend.append(title, status, reset);
      group2.append(legend);
      parent.append(group2);
      group2.disabled = study && Object.prototype.hasOwnProperty.call(studyValues, k);
      paints.push((s) => {
        const field = s.research.fields[k];
        status.textContent = { selected: "手选", default: "默认", preset: "配置值", task: "任务固定" }[field.source];
        reset.hidden = field.source !== "selected";
        if (k === "body") {
          const size = s.research.bodyEnvelopeMm;
          title.textContent = labels.body + (size ? " · " + [size.length, size.width, size.height].join(" × ") + " mm" : "");
        }
      });
      return group2;
    }
    function choices(k, parent) {
      const box = group(k, parent), grid = el("div", "c1s-choices c1s-" + k);
      box.append(grid);
      for (const [v, label] of Object.entries(options[k])) {
        const choice = el("label", "c1s-choice"), radio = el("input"), face = el("span", "c1s-face");
        radio.type = "radio";
        radio.name = id + k;
        radio.value = v;
        radio.dataset.c1Field = k;
        if (k === "frame") face.append(frameIcon(v));
        if (k === "color") {
          const dot = el("span", "c1s-dot");
          dot.dataset.color = v;
          dot.setAttribute("aria-hidden", "true");
          face.append(dot);
        }
        face.append(document.createTextNode(k === "frame" ? frameNames[v] : v === "open" ? "留白" : label));
        radio.onclick = () => update({ [k]: v });
        choice.append(radio, face);
        grid.append(choice);
        paints.push((s) => {
          radio.checked = s.research.fields[k].value === v;
        });
      }
    }
    function select(k, parent) {
      const box = group(k, parent), sel = el("select");
      sel.setAttribute("aria-label", labels[k]);
      sel.dataset.c1Field = k;
      for (const [v, label] of Object.entries(options[k])) sel.add(new Option(label, v));
      sel.onchange = () => update({ [k]: sel.value });
      box.append(sel);
      paints.push((s) => {
        sel.value = String(s.research.fields[k].value);
      });
    }
    const [frames, parts, cmf] = pages.map((x) => x.pane);
    select("preset", frames);
    if (study) {
      frames.append(el("p", "c1s-lock", "本场共用 True X · 250 mm · 四个 90°。参考图仅标轴心与机架连线。"));
    }
    choices("frame", frames);
    const spanBox = group("span", frames), spanRow = el("div", "c1s-span"), range = el("input"), num = el("input");
    range.type = "range";
    num.type = "number";
    for (const [ctl, title] of [[range, "滑动调整轴距"], [num, "精确输入轴距"]]) {
      ctl.setAttribute("aria-label", title + "（毫米）");
      ctl.min = "100";
      ctl.max = "500";
      ctl.step = "1";
      ctl.dataset.c1Field = "span";
      ctl.oninput = () => update({ span: ctl.value === "" ? "" : Number(ctl.value) });
      spanRow.append(ctl);
    }
    spanBox.append(spanRow);
    paints.push((s) => {
      const v = String(s.research.fields.span.value);
      if (num.value !== v) num.value = v;
      range.value = v === "" ? "250" : v;
      num.setAttribute("aria-invalid", String(v === "" || !Number.isInteger(Number(v)) || Number(v) < 100 || Number(v) > 500));
    });
    choices("angles", frames);
    const manual = group("custom", frames), angles = el("input");
    angles.type = "text";
    angles.setAttribute("aria-label", labels.custom);
    angles.dataset.c1Field = "custom";
    angles.placeholder = "例如 75, 105, 75, 105";
    angles.oninput = () => update({ custom: angles.value });
    manual.append(angles);
    paints.push((s) => {
      manual.hidden = !s.research.fields.custom.active;
      const v = String(s.research.fields.custom.value);
      if (angles.value !== v) angles.value = v;
    });
    choices("guide", frames);
    for (const k of ["body", "root", "camera", "seams"]) choices(k, parts);
    const measurements = el("div", "c1s-pair");
    parts.append(measurements);
    select("width", measurements);
    select("thickness", measurements);
    choices("color", cmf);
    choices("finish", cmf);
    choices("material", cmf);
    return (s) => paints.forEach((fn) => fn(s));
  }

  // src/design/c1Selection.ts
  var snapshot = (s) => structuredClone({ selection: s.selection, research: s.research, layout: s.layout, prompt: s.prompt, validation: s.validation });
  function el2(tag, cls = "", text = "") {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function svgElement(tag, attrs, text = "") {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    node.textContent = text;
    return node;
  }
  var deg = (a) => Number(a.toFixed(2)) + "°";
  function diagram(l) {
    const pts = [...l.hubs, ...l.bladeTips, { x_px: 512, y_px: 512 }];
    const extent = (ns) => [Math.min(...ns), Math.max(...ns)];
    const [x0, x1] = extent(pts.map((p) => p.x_px)), [y0, y1] = extent(pts.map((p) => p.y_px));
    const scale = Math.min(258 / Math.max(1, x1 - x0), 190 / Math.max(1, y1 - y0));
    const X = (x) => 154 + (x - (x0 + x1) / 2) * scale, Y = (y) => 119 + (y - (y0 + y1) / 2) * scale;
    const [left, right] = extent(l.hubs.map((h) => X(h.x_px))), [top, bottom] = extent(l.hubs.map((h) => Y(h.y_px)));
    const [minX, maxX] = extent(l.hubs.map((h) => h.x_mm)), [minY, maxY] = extent(l.hubs.map((h) => h.y_mm));
    const W = (maxX - minX).toFixed(1), L = (maxY - minY).toFixed(1);
    const svg = svgElement("svg", { viewBox: "0 0 340 266", role: "img", "aria-label": `轴心横跨 W ${W} mm，纵跨 L ${L} mm，R1 至 R2 夹角 ${deg(l.adjacent_deg[0])}` });
    const path = (d, stroke, width, dash = "") => svg.append(svgElement("path", { d, stroke, "stroke-width": width, fill: "none", "stroke-dasharray": dash }));
    function label(x, y, text, attrs = {}) {
      svg.append(svgElement("text", { x, y, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 12, fill: "#294b4b", stroke: "#f4f8f7", "stroke-width": 3, "paint-order": "stroke", ...attrs }, text));
    }
    const cx = X(512), cy = Y(512);
    path(`M8 ${cy}H299 M${cx} 7V229`, "#bfd0cc", 0.9, "3 4");
    for (const [x, y, u, v] of l.links) path(`M${X(x)} ${Y(y)}L${X(u)} ${Y(v)}`, "#46677b", 2.4);
    const radius = Math.min(32, ...l.hubs.map((h) => Math.hypot(X(h.x_px) - cx, Y(h.y_px) - cy) * 0.36));
    const [h1, h2] = l.hubs, gap = l.adjacent_deg[0], start = Math.atan2(h1.y_px - 512, h1.x_px - 512);
    const P = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    const end = start + gap * Math.PI / 180;
    if (l.links.length === 3) path(`M${X(h1.x_px)} ${Y(h1.y_px)}L${cx} ${cy}L${X(h2.x_px)} ${Y(h2.y_px)}`, "#8fa5a3", 1, "3 3");
    svg.append(svgElement("path", { d: `M${P(start, radius)} A${radius} ${radius} 0 0 1 ${P(end, radius)}`, fill: "none", stroke: "#9d652b", "stroke-width": 1.6, "data-adjacent-deg": gap }));
    const [ax, ay] = P((start + end) / 2, radius + 11);
    label(ax, ay, deg(gap), { fill: "#7a4c1e" });
    for (const h of l.hubs) {
      const [a, b] = l.bladeTips.filter((t) => t.hub === h.id);
      if (a && b) path(`M${X(a.x_px)} ${Y(a.y_px)}L${X(b.x_px)} ${Y(b.y_px)}`, "#25817f", 2.8);
      svg.append(svgElement("circle", { cx: X(h.x_px), cy: Y(h.y_px), r: 4.1, fill: "#fff", stroke: "#203f4b", "stroke-width": 2 }));
      label(X(h.x_px), Y(h.y_px) + (h.y_px < 512 ? -13 : 14), h.id, { "font-weight": 650 });
    }
    svg.append(svgElement("circle", { cx, cy, r: 2.4, fill: "#426565" }));
    path(`M${left} ${bottom + 18}V244 M${right} ${bottom + 18}V244 M${right + 8} ${top}H311 M${right + 8} ${bottom}H311`, "#b5c5c0", 0.8, "2 3");
    path(`M${left} 238v8m0 -4H${right}m0 -4v8 M306 ${top}h8m-4 0V${bottom}m-4 0h8`, "#58716a", 1.1);
    label((left + right) / 2, 256, "W " + W + " mm", { "data-dimension": "W" });
    const ly = (top + bottom) / 2;
    label(325, ly, "L " + L + " mm", { transform: `rotate(-90 325 ${ly})`, "data-dimension": "L" });
    return svg;
  }
  function mount({ panel, preview, prompt: promptHost, initialSelection = {}, studyLayout = false, onChange }) {
    if (!panel) throw Error("请提供选择面板容器。");
    const hosts = [panel, preview, promptHost].filter((n) => !!n);
    if (hosts.some((a, i) => hosts.slice(i + 1).some((b) => a.contains(b) || b.contains(a)))) throw Error("请选择三个互不包含的挂载点。");
    const study = studyLayout === true;
    let raw = unlocked(patched({}, initialSelection), study), state = evaluate(raw, study), dead = false;
    const panelRoot = el2("div", "c1s-panel"), pv = el2("div", "c1s-preview"), full = el2("pre", "c1s-prompt");
    const paintControls = controls(panelRoot, study, update);
    const feedback = el2("p", "c1s-feedback");
    feedback.setAttribute("aria-live", "polite");
    panelRoot.append(feedback);
    const toolbar = el2("div", "c1s-bar"), mode = el2("button", "c1s-toggle"), head = el2("strong", "", "↑ 机头");
    mode.type = "button";
    let showGuide = false;
    mode.addEventListener("click", () => {
      showGuide = !showGuide;
      paint();
    });
    toolbar.append(head, mode);
    const drawing = el2("div", "c1s-drawing"), caption = el2("p", "c1s-caption");
    pv.append(toolbar, drawing, caption);
    panel.replaceChildren(panelRoot);
    preview?.replaceChildren(pv);
    const textControl = promptHost instanceof HTMLTextAreaElement || promptHost instanceof HTMLInputElement ? promptHost : null;
    if (!textControl) promptHost?.replaceChildren(full);
    function paint() {
      if (!preview) return;
      mode.disabled = !state.layout;
      mode.textContent = showGuide ? "查看轴位图" : "查看导出定位图";
      mode.setAttribute("aria-pressed", String(showGuide));
      const l = state.layout;
      if (!l) {
        drawing.replaceChildren(el2("p", "c1s-empty", "修正参数后显示轴位图"));
        caption.textContent = "";
        return;
      }
      if (showGuide && study) {
        const img = el2("img");
        img.src = studyGuide.dataUrl;
        img.alt = "交接使用的共用轴位定位图";
        drawing.replaceChildren(img);
      } else if (showGuide) {
        const c = el2("canvas");
        c.setAttribute("role", "img");
        c.setAttribute("aria-label", "交给模型的顶视定位图");
        drawGuide(c, l, true, state.draft.inputs.guideBladeLines);
        drawing.replaceChildren(c);
      } else drawing.replaceChildren(diagram(l));
      caption.textContent = "最大中心距 " + l.max_motor_distance_mm + " mm · R1 起顺时针 " + l.adjacent_deg.map(deg).join(" / ");
    }
    function render() {
      paintControls(state);
      const error = state.validation.errors.join(" ");
      feedback.textContent = error;
      feedback.hidden = !error;
      paint();
      if (textControl) textControl.value = state.prompt;
      else full.textContent = state.prompt;
      onChange?.(snapshot(state));
    }
    function update(patch) {
      if (dead) throw Error("该选择面板已卸载。");
      raw = unlocked(patched(raw, patch), study);
      state = evaluate(raw, study);
      render();
      return snapshot(state);
    }
    render();
    return {
      getSnapshot: () => snapshot(state),
      setSelection: update,
      async exportVersion() {
        if (dead) throw Error("该选择面板已卸载。");
        return exportState(state);
      },
      destroy() {
        if (dead) return;
        dead = true;
        panelRoot.remove();
        pv.remove();
        full.remove();
        if (textControl) textControl.value = "";
      }
    };
  }
  return __toCommonJS(c1Selection_exports);
})();
