# C2 作者预试的输入与回执桥接工具

主持人可以直接接收 PR #75 的三件导出，在外部运行冻结的模型，再把服务原始回执、每个候选、设计者取舍和分段计时归入同一个本地会话。自由提示条件共用这套记录方式。本工具不安装或启动模型，不产生真人评议。每个场次单独保存为 SQLite 文件，事务内同时保存事件和按 SHA-256 去重的原件。实际场次的数据库和报告包含底稿、完整提示词及人工决定，只留在研究端。

适用版本为 PR #75 的 `drone-configurator/config-v2` 和现有 Qwen／Comfy 的 `TextEncodeQwenImage21`、`LoadImage`、原始 PNG 与运行历史。旧 C1 的浏览器插件继续使用它自己的旧导入格式。本工具是在研究端接新版输入的独立桥接；它没有修改 PR #75 的页面和交互。

## 开始前

准备 Python 3.10 以上及 Pillow，使用实际后端导出的环境清单。主持人登记匿名编号、场次顺序、简报 A/B、后端版本、向设计者出示的共同参照图、比较采用的图像条件。每人两种条件、两个不同简报，单场 15 分钟主动操作、至多 9 张。真实作者预试用 `author_pilot`，开发用 `software_control`；当前不开放正式被试模式。

两种预试输入政策任选此前登记的一种，同一配对前后保持一致。 `same-guide` 让两组后端都接收同一参照图。`structured-guide` 下，设计者都看共同参照，结构化组后端接配置器条件图，自由组首次提交仅使用自由文字。两种方式后续均可登记上一候选作为父图。

下面的文件名是命令参数示例。真实试验应填写实际文件，逐次运行。服务收到的最终请求必须与封存的请求字节对应，设计者确认后的文字须单独留存。正交顶视、四轴等宽等长、对角尺度 250 均为本次 C2 简报条件。其他构型研究使用它们自己的协议。

~~~text
python capture.py S.db start --stage author_pilot --subject P00 --pair C2-01 --order 1 --task A --condition S --policy structured-guide --model qwen-2.1-frozen --protocol C2-frozen-v1 --guide common-guide.png --brief brief-A.txt --backend-manifest environment.json
python capture.py S.db seal --id a1 --slots 2 --config drone-config-STAMP.json --approved designer-approved.txt --request actual-request.json --image uploaded-guide.png=drone-guide-STAMP.png --goal "调整目标部位" --keep "保留其余布局"
python capture.py S.db phase handoff
python capture.py S.db phase queue
python capture.py S.db phase model
python capture.py S.db receive --id a1 --status success --ack raw-ack.json --history raw-history.json --output actual_00001_.png --output actual_00002_.png
python capture.py S.db decide keep --candidate a1/2 --reason "设计者原述的选择理由"
python capture.py S.db close --reason "设计者结束本场的原因" --post-task post-task.json
python capture.py S.db report
~~~

输入三件需放在同一目录，保留原始下载名。工具读取配置登记的 TXT 与 PNG 文件名，验证文本与 PNG 摘要，并保存三件原始字节。Windows 检出时 TXT 可能变为 CRLF，工具另存原始 TXT 哈希和规范 LF 的编译文本哈希。若实际送入后端的文字与设计者确认的文字不同，必须在 `seal` 加 `--difference "发生改写的环节与原因"`。实际发送文本从原始请求读取。每个 `LoadImage` 以 `--image 服务中实际的文件名=同一文件在本地的位置` 声明；服务文件名与本地文件名允许不同。

`seal` 之后才在外部发送此次请求。程序默认将未细分的等待记为 `unknown_wait`。主持人只有在确知阶段边界时才切换 `phase`，可选 `active`、`handoff`、`queue`、`model`、`unknown_wait`、`technical_pause`。真实并发操作应另在协议偏离中记录。收到候选后计时自动回到主动操作。原始历史中有服务时间时单独保存；缺少时间或服务器时钟不在本机封存至登记区间，成功回执及所有可核输出仍入库。本场归属记为待核，报告区分服务成功与当场来源已核。主持人查到能把这次作业编号与本场请求相连的独立派发凭据后，用 `review-origin --id a1 --evidence dispatch-log.json --reason "核对过程"` 补录。关场后也能补核，历史时间保持原值。只有口头印象时保留未知。环境清单缺失不影响记录，配对报告会标记环境无法核对。

成功回执使用服务实际返回的 ACK、历史及所有输出文件的原名。工具核对请求图、服务作业标识、原 PNG 内嵌的执行图和输出文件列表，已提供图像内容摘要的加载节点额外核对该摘要。只有摘要、截图、缺少内嵌执行图的转存图不构成此模式的成功回执。主机迁移或其他服务需先验证该后端的回执格式。未提供远端加载摘要时，只证实本地封存文件、运行图的加载文件名和输出工作流相符；文件名不能单独证明服务实际读取的每个像素。

## 修订、异常与第二场

- 成功返回后，候选按服务历史枚举顺序标记，如 `a1/1`。可以 `decide reject`、`decide rollback`、`decide manual --manual-output edited.png` 或 `decide stop`。每次要写真实理由。人工深化件保留独立来源。父图修订用新的尝试编号，在 `seal` 加 `--parent a1/2` 并逐一绑定模型实收的父图及参照。保留每次尝试实际想改和想保住的部分。
- 失败时用 `receive --id a1 --status failed --failure-log original-error.txt --note "实际原因"`。结果未明用 `unknown`，可附 `--output` 保全已经回来但未核实的文件；之后可补登记确定的成功或失败。未知没有解决时停止追加调用或以现状结束。重试须换编号并加 `--retry a1`。失败、未知和后续补录都保存在时间序列。
- 自由模式开第二个数据库，改用 `--condition D --task B --order 2 --brief brief-B.txt`（按实际随机顺序分配）。`seal` 省略 `--config`，`--approved` 指向设计者的实际自由文字，`--image` 依冻结政策填写。其他操作、回图机会和时限相同。
- 两场均结束时运行 `python capture.py S.db pair D.db`。它逐项核对两种条件、两个任务、次序、匿名编号、环境与图片政策、限额和返回情况。报告中的一致性只证明数据满足所查规则，不能证明受试者身份、独立性或实验收益。候选合格率和盲评需另用去标签材料测得。
- 计划位置和实收数量分列。例如原先留 1 个位置而实际服务返回 10 张，登记全部 10 张并标明超额；后续计划不能继续占用已耗尽的图像额度。

## 本轮机制验证

~~~text
python -B check_controls.py /path/to/pr75/prototypes/drone-configurator
~~~

使用固定提交 `d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2` 的真实导出检查原件。其十份导出中两份满足本次四轴/WL1/250 的输入约束，均通过原生格式摘要核对。随后用明确标为软件对照的 8×8 纯色 PNG 与临时请求检查完整 CLI 流程。结构化条件一次收两个候选，自由条件先失败再重试收一个；错参照、重复封存、候选缺失、无效回退、错服务回执、同条件配对等均按预期拦截。[本机验证结果](controls.json)

本轮真实模型调用数为 0，作者真实预试为 0 场。研究者检查的历史 B2 和六旋原件有各自的旧请求与版本，本工具开发用例没有将它们接成 PR #75 的新输出。
