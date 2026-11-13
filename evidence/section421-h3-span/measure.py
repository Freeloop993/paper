"""知条件 AI 初读。原图顶视坐标，顺时针从左前开始。桨尖取可见实物边缘近似端点。"""
import json
from math import dist
from pathlib import Path
from statistics import mean

root = Path(__file__).resolve().parent
observations = {
    'B250': {
        'hubs': [(274,278),(750,278),(750,747),(274,747)],
        'blade_tips': [[(162,403),(386,153)],[(640,153),(862,403)],
                       [(861,629),(639,874)],[(162,629),(385,874)]],
    },
    'B421': {
        'hubs': [(256,255),(768,255),(768,767),(256,767)],
        'blade_tips': [[(150,372),(363,141)],[(661,141),(875,371)],
                       [(874,654),(663,883)],[(150,653),(361,883)]],
    },
}
for case, read in observations.items():
    spec = json.loads((root/'exports'/case/'spec.json').read_bytes())
    hubs = read['hubs']
    diag = mean([dist(hubs[0], hubs[2]), dist(hubs[1], hubs[3])])
    diam = mean(dist(*tips) for tips in read['blade_tips'])
    given = spec['layout']['hubs']
    read.update(target_front_horizontal_px=round(given[1]['x_px']-given[0]['x_px'],2),
                observed_front_horizontal_px=hubs[1][0]-hubs[0][0],
                observed_mean_diagonal_px=round(diag,1),
                observed_mean_visible_prop_diameter_px=round(diam,1),
                observed_d_over_D=round(diam/diag,3),
                target_d_over_D=round(127/spec['layout']['max_motor_distance_mm'],3))
record = {'reader':'知条件 AI 初读；原始1024方图，单次近似读数，无独立复测。',
          'measurement':'轴心以机械中心为准。d 为四副桨的相对桨尖距离均值；D 为两条电机对角线长度均值。',
          'cases':observations}
(root/'readings.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
