const dictionary = {
  "version": "shape-dictionary-v1.3",
  "fixed_lines": {
    "head": "Design a compact quadcopter for everyday aerial photography. Strict orthographic top view, nose toward the top edge, arms fully unfolded.",
    "layout": "Match the four motor centres and arm directions in the layout. True X, 250 mm opposite-motor span, equal horizontal and vertical spacing. Each motor carries one stationary two-blade, 5-inch propeller. No propeller guards.",
    "cmf": "Matte light grey shell and arms in one continuous colour, dark grey motors, black propellers.",
    "tail": "Show the complete product on a plain light background. Omit guide marks and lettering."
  },
  "params": {
    "body_plan": {
      "pod": "A rounded pod with a continuous curved outline.",
      "box": "A box-shaped shell with straight sides and clipped corners."
    },
    "arm_root": {
      "seamless": "Each arm grows out of the shell through a smooth seamless blend, with no joint line at the root.",
      "socket": "Each arm enters a distinct socket at the shell, with a visible transverse joint seam.",
      "hinge": "Each arm is attached to the shell by a visible folding hinge with a pivot pin."
    },
    "camera": {
      "inside": "The nose shell wraps around the camera; from directly overhead only the smooth top of the nose is seen, with no gimbal arms or side lugs. The camera faces horizontally forward.",
      "projecting": "A small camera gimbal with visible side arms projects in front of the nose. The camera faces horizontally forward; its optical face is hidden from directly overhead."
    },
    "cover": {
      "single": "A plain top cover with no seams crossing it.",
      "multi": "Three or more distinct top cover panels separated by seams."
    },
    "arm_finish": {
      "matte_same": "Arms in the same matte light grey as the shell.",
      "exposed_carbon": "Exposed carbon-fibre arms with a visible weave, held by dark grey sockets at the shell."
    }
  },
  "line_order": [
    "head",
    "layout",
    "body_plan",
    "arm_root",
    "camera",
    "cover",
    "cmf",
    "tail"
  ],
  "base": {
    "body_plan": "pod",
    "arm_root": "seamless",
    "camera": "inside",
    "cover": "single",
    "arm_finish": "matte_same"
  },
  "cmf_line_when_exposed_carbon": "Matte light grey shell, dark grey motors, black propellers."
};