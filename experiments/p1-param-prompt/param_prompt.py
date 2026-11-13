"""Parameter-to-prompt compiler in the author's original style.

The baseline preset reproduces, character for character, the prompt the author used in
the early configurator runs. Every other prompt is that sentence with one or more
parameter values changed, so a difference between two images can be traced to named
parameters. Geometry parameters also drive the layout diagram (build_diagrams.py).

  python -B experiments/p1-param-prompt/param_prompt.py        # print the test matrix
"""
import copy
import math

AUTHOR_PROMPT = (
    "An 8K resolution, photorealistic industrial design rendering of a quadcopter with an X-shaped "
    "layout, 30cm rotor-to-rotor distance, 1:1 arm span ratio, 45° rotor angle, streamlined fuselage, "
    "80cm wing curvature radius, 60° fuselage edge angle, foldable arms, carbon fiber frame, ABS "
    "propellers with nano-coating, anodized aluminum honeycomb grille, cold grey color scheme, blue "
    "LED light band, reinforced motor covers, modular quick-release connectors, and a GPS antenna "
    "discreetly integrated into the top surface, all highlighted under a 90° overhead view with soft "
    "5500K lighting and high-contrast shadows."
)

# group -> parameter -> meaning. Values are free text or numbers; the compiler only orders them.
SCHEMA = {
    "layout": {
        "layout": "rotor layout name: X-shaped, wide X-shaped, stretched X-shaped, H-shaped",
        "rotor_distance_cm": "distance between diagonally opposite rotors",
        "arm_span_ratio": "left-right motor spacing divided by front-back motor spacing (W/L)",
        "rotor_angle_deg": "derived: atan(W/L), the arm angle measured from the fore-aft axis",
    },
    "form": {
        "fuselage": "fuselage style word: streamlined, faceted, boxy, pebble-shaped",
        "curvature_radius_cm": "surface curvature radius (the author's 'wing curvature radius')",
        "edge_angle_deg": "fuselage edge angle",
        "arms": "arm construction phrase: foldable arms, fixed integrated arms",
    },
    "material": {"frame": "frame material phrase", "propellers": "propeller material phrase",
                 "grille": "grille phrase or None"},
    "color": {"color": "color scheme phrase", "light": "light band phrase or None"},
    "details": {"details": "list of detail phrases; the last one is joined with 'and'"},
    "view": {"view": "fixed: 90° overhead view, soft 5500K lighting, high-contrast shadows"},
}

BASELINE = dict(
    layout="X-shaped", rotor_distance_cm=30, arm_span_ratio=1.0,
    fuselage="streamlined", curvature_radius_cm=80, edge_angle_deg=60, arms="foldable arms",
    frame="carbon fiber frame", propellers="ABS propellers with nano-coating",
    grille="anodized aluminum honeycomb grille",
    color="cold grey color scheme", light="blue LED light band",
    details=["reinforced motor covers", "modular quick-release connectors",
             "a GPS antenna discreetly integrated into the top surface"],
)


def ratio_text(value):
    return "1:1" if abs(value - 1) < 1e-9 else f"{value:g}:1"


def rotor_angle(value):
    return round(math.degrees(math.atan(value)))


def article(word):
    return "an" if word[0].lower() in "aeiou" or word.startswith("X") or word.startswith("H") else "a"


def compile_prompt(p):
    parts = [
        f"{p['rotor_distance_cm']}cm rotor-to-rotor distance",
        f"{ratio_text(p['arm_span_ratio'])} arm span ratio",
        f"{rotor_angle(p['arm_span_ratio'])}° rotor angle",
        f"{p['fuselage']} fuselage",
        f"{p['curvature_radius_cm']}cm wing curvature radius",
        f"{p['edge_angle_deg']}° fuselage edge angle",
        p["arms"], p["frame"], p["propellers"], p["grille"], p["color"], p["light"],
        *p["details"][:-1],
    ]
    body = ", ".join(x for x in parts if x)
    return (f"An 8K resolution, photorealistic industrial design rendering of a quadcopter with "
            f"{article(p['layout'])} {p['layout']} layout, {body}, and {p['details'][-1]}, all highlighted "
            f"under a 90° overhead view with soft 5500K lighting and high-contrast shadows.")


def preset(**changes):
    p = copy.deepcopy(BASELINE)
    p.update(changes)
    return p


assert compile_prompt(BASELINE) == AUTHOR_PROMPT, "the baseline must reproduce the author's prompt exactly"

# Two design directions that move several parameters at once (word pairs in brackets).
DIRECTION_A = preset(   # compact, integrated, simple, low-key
    rotor_distance_cm=25, fuselage="pebble-shaped", curvature_radius_cm=120, edge_angle_deg=90,
    arms="fixed integrated arms", frame="matte ABS unibody frame", propellers="matte ABS propellers",
    grille=None, color="warm light grey color scheme", light=None,
    details=["seamless top shell", "a flush battery hatch"])
DIRECTION_B = preset(   # extended, modular, intricate, striking
    layout="wide X-shaped", rotor_distance_cm=35, arm_span_ratio=1.3, fuselage="faceted",
    curvature_radius_cm=20, edge_angle_deg=30, frame="exposed carbon fiber frame",
    propellers="carbon fiber propellers", color="matte black color scheme", light="orange LED light band",
    details=["exposed titanium fasteners", "reinforced motor covers", "modular quick-release connectors",
             "a GPS antenna mast on the top surface"])

LAYOUT_NOTE = (" Use the attached diagram only for the rotor layout: the red dots are the four motor "
               "positions and the blue lines are the arm directions. Do not draw the diagram itself.")

# id -> (parameters, mode, diagram W/L or None, prompt enhancement on?)   mode: "text" or "diagram"
MATRIX = {
    # T1 the author's prompt as it was, with and without the service's prompt rewriting
    "T1-author-raw": (BASELINE, "text", None, False),
    "T1-author-enhanced": (BASELINE, "text", None, True),
    # T2 two design directions
    "T2-direction-A": (DIRECTION_A, "text", None, False),
    "T2-direction-B": (DIRECTION_B, "text", None, False),
    # T3 one parameter at a time, everything else as the baseline
    "T3-ratio-0.7": (preset(layout="stretched X-shaped", arm_span_ratio=0.7), "text", None, False),
    "T3-ratio-1.3": (preset(layout="wide X-shaped", arm_span_ratio=1.3), "text", None, False),
    "T3-fuselage-faceted": (preset(fuselage="faceted", edge_angle_deg=30), "text", None, False),
    "T3-fuselage-boxy": (preset(fuselage="boxy", edge_angle_deg=90), "text", None, False),
    "T3-cmf-white": (preset(frame="white ABS frame", color="white color scheme", light=None), "text", None, False),
    "T3-cmf-orange": (preset(color="cold grey color scheme with orange accents", light="orange LED light band"),
                      "text", None, False),
    # T4 the same sentence plus the configurator layout diagram as a reference image
    "T4-diagram-0.7": (preset(layout="stretched X-shaped", arm_span_ratio=0.7), "diagram", 0.7, True),
    "T4-diagram-1.0": (BASELINE, "diagram", 1.0, True),
    "T4-diagram-1.3": (preset(layout="wide X-shaped", arm_span_ratio=1.3), "diagram", 1.3, True),
}


# Round 2 (2026-11-13, after reading round 1). Round 1: the ratio written in the sentence did not move
# the motors (T3), and neither did the layout diagram with LAYOUT_NOTE (T4). Round 2 tests only the
# geometry path, at the two extreme levels, with three ways of handing the layout to the edit endpoint.
DIR = "experiments/p1-param-prompt/"
EVIDENCE = "evidence/p1-param-prompt/"
STRICT_NOTE = (" Picture 1 is a top-view layout plan drawn at the same scale and framing as the output "
               "image. Each red dot is the exact centre of one motor: put the four motor hubs at the same "
               "positions in the frame as the four red dots, keep the same spacing between them, and run "
               "each arm along a blue line. Do not draw the dots or the lines.")
BLOCKOUT_NOTE = (" Picture 1 is a top-view blockout of this quadcopter at the same scale and framing as the "
                 "output image. Keep every rotor disc, every arm and the body where they are in Picture 1 "
                 "and render them as the finished product. Do not keep the flat grey shapes.")
MOVE_NOTE = (" Picture 1 is the product. Picture 2 is a top-view layout plan in which each red dot is the "
             "exact centre of one motor. Redraw the quadcopter of Picture 1 with its four motor hubs on the "
             "four red dots of Picture 2 and its arms along the blue lines; keep its fuselage, materials, "
             "colours and lighting. Do not draw the dots or the lines.")
_NARROW = preset(layout="stretched X-shaped", arm_span_ratio=0.7)
_WIDE = preset(layout="wide X-shaped", arm_span_ratio=1.3)
# id -> (parameters, reference images in Picture order as paths from the repository root, note)
ROUND2 = {
    "G1-strict-0.7": (_NARROW, [DIR + "diagrams/layout-wl0.7.png"], STRICT_NOTE),
    "G1-strict-1.3": (_WIDE, [DIR + "diagrams/layout-wl1.3.png"], STRICT_NOTE),
    "G2-blockout-0.7": (_NARROW, [DIR + "diagrams/blockout-wl0.7.png"], BLOCKOUT_NOTE),
    "G2-blockout-1.3": (_WIDE, [DIR + "diagrams/blockout-wl1.3.png"], BLOCKOUT_NOTE),
    "G3-move-0.7": (_NARROW, [EVIDENCE + "T1-author-raw.png", DIR + "diagrams/layout-wl0.7.png"], MOVE_NOTE),
    "G3-move-1.3": (_WIDE, [EVIDENCE + "T1-author-raw.png", DIR + "diagrams/layout-wl1.3.png"], MOVE_NOTE),
}
# Round 3 (same day, after reading round 2). Only the blockout anchored the motors (G2: 0.70 and 1.29
# read against 0.7 and 1.3), but its rotor discs were drawn into the picture and the fuselage copied the
# placeholder box. Round 3 keeps only arms and motor mounts in the reference, on a dark ground, and
# leaves the fuselage to the sentence. G5 adds the two design directions to see whether the form,
# material and colour parameters still act while the layout is held.
SKELETON_NOTE = (" Picture 1 is a top-view plan of the airframe skeleton at the same scale and framing as "
                 "the output image: four arms and four motor mounts. Keep every motor mount and every arm "
                 "where it is in Picture 1. The fuselage, the propellers and all other parts are not in the "
                 "plan; design them from the description. Do not keep the flat grey shapes.")
ROUND3 = {
    "G4-skeleton-0.7": (_NARROW, [DIR + "diagrams/skeleton-wl0.7.png"], SKELETON_NOTE),
    "G4-skeleton-1.3": (_WIDE, [DIR + "diagrams/skeleton-wl1.3.png"], SKELETON_NOTE),
    "G5-skeleton-0.7-direction-A": (dict(DIRECTION_A, layout="stretched X-shaped", arm_span_ratio=0.7),
                                    [DIR + "diagrams/skeleton-wl0.7.png"], SKELETON_NOTE),
    "G5-skeleton-1.3-direction-B": (DIRECTION_B, [DIR + "diagrams/skeleton-wl1.3.png"], SKELETON_NOTE),
}
ROUND2.update(ROUND3)   # spec() treats every reference-image cell after round 1 the same way
CELLS = [*MATRIX, *ROUND2]


def spec(cell):
    """Prompt, reference images (paths from the repository root, in Picture order), enhancement on?"""
    if cell in MATRIX:
        params, mode, wl, enhanced = MATRIX[cell]
        refs = [DIR + f"diagrams/layout-wl{wl:.1f}.png"] if mode == "diagram" else []
        return compile_prompt(params) + (LAYOUT_NOTE if refs else ""), refs, enhanced
    params, refs, note = ROUND2[cell]
    return compile_prompt(params) + note, refs, True   # the edit endpoint always enhances


def prompt_for(cell):
    return spec(cell)[0]


if __name__ == "__main__":
    for cell in CELLS:
        print(f"[{cell}] {prompt_for(cell)}\n")
