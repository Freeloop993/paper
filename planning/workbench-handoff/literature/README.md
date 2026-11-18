# 工作台的文献依据与跨设备阅读材料

从[文献复核与引用建议](文献复核与引用建议.md)进入研究论证。从[21项原页证据](论文与原页证据.csv)查每项做法、出处、适用范围、页码和版本。从[全库文献导航](全库文献导航.csv)追溯759个既有筛查组和16条新增记录。导航共775行，保留历史重组关系和审读状态。

新两批的21项含19份有原页记录的PDF及2项项目线索。14项可直接支撑限定的方法判断，5项作为背景，2项仍待PDF。21项的研究判断与下文14份可随仓库发布的原件是两项独立统计。

## 在另一台电脑打开

克隆仓库后可直接阅读下表“仓库PDF”的14份原件及6张界面图。其余5份可从出版机构、会议或作者公开入口取回。程序以核读时的 SHA-256 检查文件，字节有变化会报告版本差异。项目页线索单列在清单中。

在本目录运行以下命令。获取PDF使用 Python 3.10 及以上，系统有 curl 时会优先使用。第二条命令将需要获取的完整原件下载至本机的 `private-cache/fulltexts/`。

```shell
python restore_assets.py --included-only --verify-only --figures
python restore_assets.py
```

要恢复全部10张文献界面图，安装 Pillow、pypdf 及提供 `pdftoppm` 的 Poppler，再运行下列命令。图片按原始页码、原页面裁剪范围或内嵌图像对象重建，核对宽高和 RGB 像素摘要。不同 Poppler 版本或字体可能导致像素差异；表中给出了逐项原始图号和PDF位置。已入库图像在清单中保留摘录说明和来源。

```shell
python -m pip install Pillow pypdf
python restore_assets.py --figures
python restore_assets.py --verify-only --figures
```

[资产清单](assets.json)记录每个PDF的版本、原始字节数、SHA-256、公开地址及许可依据，并保留每幅图的原始文件和像素摘要。`private-cache/` 已列入本目录 Git 忽略规则。GenAlign 优先从作者 GitHub 仓库中的固定版本读取，作者网页提供第二个下载入口，两者的 PDF 可用同一摘要复核。

2026年11月18日已在单独目录以仓库拟同步的文件起步，实际从5个公开入口下载其余的PDF，再重建4张图。19份PDF全部通过原字节摘要核验，10张图全部通过原图文件或原始RGB像素核验。Treellis 与 Req2CAD 的作者项目页可访问，仍作为项目线索登记。

## 19份核读原件与两条项目线索

| 编号 | 本文使用的工作 | 原件与公开入口 | 本次核读 PDF 页 |
|---|---|---|---|
| A01 | InspirationGraph | [仓库PDF](fulltexts/A01.pdf) · [原来源](https://scholars.cityu.edu.hk/ws/portalfiles/portal/495506018/491109841.pdf) | 13 |
| A02 | Component-Wise Car Interior | [仓库PDF](fulltexts/A02.pdf) · [原来源](https://sketch.kaist.ac.kr/pdf/publications/2026_chi_car_interior_design.pdf) | 6 |
| A03 | DesignTrace | [仓库PDF](fulltexts/A03.pdf) · [原来源](https://xiaohanp.github.io/pdf/CHI_26_DesignTrace.pdf) | 10–11、15 |
| A04 | Less Redraw, More Explore | [仓库PDF](fulltexts/A04.pdf) · [原来源](https://cronfa.swan.ac.uk/Record/cronfa71270/Download/71270__36747__33ebf5fd9f064f3d938976c231472b22.pdf) | 4 |
| A05 | 3D Sketching + 2D GenAI | [仓库PDF](fulltexts/A05.pdf) · [原来源](https://sketch.kaist.ac.kr/pdf/publications/2025_uist_car_exterior_design.pdf) | 6 |
| A06 | SR-Edit | [原来源](https://media.eventhosts.cc/Conferences/ECCV2026/pdfs/13867.pdf) | 12 |
| A07 | ArchiSet | [原来源](https://openaccess.thecvf.com/content/ICCV2025/papers/Yin_ArchiSet_Benchmarking_Editable_and_Consistent_Single-View_3D_Reconstruction_of_Buildings_ICCV_2025_paper.pdf) | 6 |
| A08 | 航拍无人机TGRA–QFD | [仓库PDF](fulltexts/A08.pdf) · [原来源](https://www.jstage.jst.go.jp/article/jamdsm/20/1/20_2026jamdsm0008/_pdf) | 11、15 |
| A09 | 视觉感知数据驱动的产品造型 | [原来源](https://www.jcad.cn/cn/article/pdf/preview/10.3724/SP.J.1089.2024-00459.pdf) | 8、14–15 |
| A10 | Make It Count | [原来源](https://openaccess.thecvf.com/content/CVPR2025/papers/Binyamin_Make_It_Count_Text-to-Image_Generation_with_an_Accurate_Number_of_CVPR_2025_paper.pdf) | 6 |
| A11 | 汽车尾部感性评议 | [仓库PDF](fulltexts/A11.pdf) · [原来源](https://mdpi-res.com/d_attachment/mathematics/mathematics-14-03171/article_deploy/mathematics-14-03171.pdf) | 12、15 |
| B00 | GenAlign | [原来源](https://cosjiimos.github.io/GenAlign/GenAlign_AEI2026.pdf) | 5–6 |
| B01 | Treellis | [原来源](https://www.aid-lab.org/treellis) · [出版登记](https://doi.org/10.1145/3830398.3830694) | 待原页 |
| B02 | Req2CAD | [原来源](https://icilab.cn/project/req2cad/) · [出版登记](https://doi.org/10.1145/3772318.3791949) | 待原页 |
| B03 | SketchConcept | [仓库PDF](fulltexts/B03.pdf) · [原来源](https://arxiv.org/pdf/2508.07141v1) | 4 |
| B04 | CogChat | [仓库PDF](fulltexts/B04.pdf) · [原来源](https://arxiv.org/pdf/2608.13216v1) | 3 |
| B05 | Workflow-Net | [仓库PDF](fulltexts/B05.pdf) · [原来源](https://aodr.org/xml/49535/49535.pdf) | 9–10 |
| B06 | InstructMesh | [仓库PDF](fulltexts/B06.pdf) · [原来源](https://arxiv.org/pdf/2608.28534v1) | 5 |
| B07 | DesignFromX | [仓库PDF](fulltexts/B07.pdf) · [原来源](https://arxiv.org/pdf/2505.11666v1) | 8 |
| B08 | Surprise2Refine | [仓库PDF](fulltexts/B08.pdf) · [原来源](https://arxiv.org/pdf/2608.12605v1) | 7 |
| B09 | Composable CAD | [仓库PDF](fulltexts/B09.pdf) · [原来源](https://arxiv.org/pdf/2611.01165v1) | 15 |

## 工作台界面的10个原图位置

| 作品 | PDF页与图号 | 图像位置 |
|---|---|---|
| 00-GenAlign-图2-部件与属性编辑 | PDF 5，图 2 | 本地重建 · [原文](https://cosjiimos.github.io/GenAlign/GenAlign_AEI2026.pdf#page=5) |
| 03-SketchConcept-图2 | PDF 4，图 2 | [仓库图](figures/03-SketchConcept-图2.png) · [原文](https://arxiv.org/pdf/2508.07141v1#page=4) |
| 04-CogChat-图2-会话与语义依据 | PDF 3，图 2 | 本地重建 · [原文](https://arxiv.org/pdf/2608.13216v1#page=3) |
| 05-Workflow-Net-图2-聊天式 | PDF 8，图 2 | [仓库图](figures/05-Workflow-Net-图2-聊天式.png) · [原文](https://aodr.org/xml/49535/49535.pdf#page=8) |
| 05-Workflow-Net-图3-手动接节点 | PDF 9，图 3 | [仓库图](figures/05-Workflow-Net-图3-手动接节点.png) · [原文](https://aodr.org/xml/49535/49535.pdf#page=9) |
| 05-Workflow-Net-图4-自动连边的设计画布 | PDF 10，图 4 | [仓库图](figures/05-Workflow-Net-图4-自动连边的设计画布.png) · [原文](https://aodr.org/xml/49535/49535.pdf#page=10) |
| 06-InstructMesh-图4 | PDF 5，图 4 | [仓库图](figures/06-InstructMesh-图4.png) · [原文](https://arxiv.org/pdf/2608.28534v1#page=5) |
| 07-DesignFromX-图3 | PDF 8，图 3 | [仓库图](figures/07-DesignFromX-图3.png) · [原文](https://arxiv.org/pdf/2505.11666v1#page=8) |
| 08-Surprise2Refine-图7 | PDF 7，图 7 | 本地重建 · [原文](https://arxiv.org/pdf/2608.12605v1#page=7) |
| 09-Composable-CAD-图21-整件与部件候选对照 | PDF 15，图 21 | 本地重建 · [原文](https://arxiv.org/pdf/2611.01165v1#page=15) |

## 书目接入与历史原件

[12条补充书目](补充参考文献.bib)与[GenAlign单条](GenAlign-按底稿补录.bib)使用稳定键。导师批注稿的[40]是Cohen，另一份47条修订稿的[40]是GenAlign。云端稿件书目在实际采用相应方法时合并，再由该稿生成编号。第三章的领域需求、第四章的部件操作和第五章的独立评议各有对应证据。

较早的论文池可从[原仓库目录索引](https://github.com/Freeloop993/paper/tree/9afe6903b0368cd86ced367c3675bb4a7adc98e2/references/catalogs)继续。已经核过再分发许可的102份历史全文及其摘要值保存在[历史全文分支](https://github.com/Freeloop993/paper/tree/reference-fulltexts-20261109/fulltexts)。本次的A08与该分支的ID-A001为相同文件。

## 原件及摘图的署名和许可

原件保持取得时的字节和署名。下表列出随仓库分发的每篇作品，作品题名、来源及出处可按编号在上表或资产清单定位。标为摘图的文件包含从原文页面裁切或导出的局部界面，沿用所列作品许可及原作署名。

| 编号 | 作品作者 | 使用许可及核对位置 |
|---|---|---|
| A01 | Ling, Suxiang and Xiao, Yi and Zhou, Yang and Ma, Ruoxuan and Wei, Guangpeng and Leung, Chi-sing | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，PDF第2页 |
| A02 | Yoon, Jeongche and Lee, Seung-Jun and Ma, Donghyeok and Bae, Seok-Hyung | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，PDF第1页 |
| A03 | Peng, Xiaohan and Haldar, Debanjana and Mackay, Wendy E. and Koch, Janin | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，PDF第1页 |
| A04 | Zhao, Zeyu and Rees, Connor and Bailey, Gavin and Jones, Matt and Robinson, Simon and Pearson, Jennifer | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，PDF第1页 |
| A05 | Lee, Seung-Jun and Yoon, Jeongche and Lee, Sang-Hyun and Lee, Joon Hyub and Bae, Seok-Hyung | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，PDF第1页 |
| A08 | Jiawei Chen; Zhiyong Zhou; Jianming Qi; Hanfei Wang | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)，PDF第1页 |
| A11 | Zhang, Yiqing and Chen, Zimo | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，PDF第1页 |
| B03 | Runlin Duan; Chenfei Zhu; Yuzhao Chen; Dizhi Ma; Jingyu Shi; Ziyi Liu; Karthik Ramani | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，[此版本许可登记](https://arxiv.org/abs/2508.07141v1) |
| B04 | Choi, Jiin and Hyun, Kyung Hoon | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)，PDF第1页 |
| B05 | Jo, Tae Hee and Choi, Jiin and Jin, Semin and Lee, Seung Won and Jang, Yugyeong and Park, Sang Woon and Ban, Seonghoon and Hyun, Kyung Hoon | [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/)，PDF第1页 |
| B06 | Faruqi, Faraz and Katary, Ahmed and Tas, Demircan and Hradilak, Theresa and Zhang, Ning and Li, Jiaji and Manhardt, Fabian and Nisser, Martin and Phadnis, Vrushank and Du, Ruofei and Tombari, Federico and Hofmann, Megan and Mueller, Stefanie | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，[此版本许可登记](https://arxiv.org/abs/2608.28534v1) |
| B07 | Duan, Runlin and Zhu, Chenfei and Chen, Yuzhao and Hu, Yichen and Shi, Jingyu and Ramani, Karthik | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)，PDF第1页；[此版本许可登记](https://arxiv.org/abs/2505.11666v1) |
| B08 | Yuzhe You; Gromit Yeuk-Yin Chan; Shunan Guo; Anlan Zhang; Eunyee Koh; Jian Zhao; Tongyu Zhou | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)，PDF第1页 |
| B09 | Yuanbo Li; Vivian Liu; Sean Liu; Justin Matejka | [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)，[此版本许可登记](https://arxiv.org/abs/2611.01165v1) |

B07 原件首叶使用 BY-NC 4.0 表述，此版本 arXiv 许可记录为 BY-NC-SA 4.0；此处的完整原件及图3摘录采用 BY-NC-SA 4.0。GenAlign 作者网站的页脚许可指向网站设计；该论文在此保留作者提供的PDF入口。
