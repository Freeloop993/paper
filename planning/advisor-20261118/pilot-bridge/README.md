# C2 作者预试的输入与回执桥接工具

主持人可以直接接收 PR #75 的三件导出，在外部运行冻结的模型，再把服务原始回执、每个候选、设计者取舍和分段计时归入同一个本地会话。自由提示条件共用这套记录方式。本工具不安装或启动模型，不产生真人评议。每个场次单独保存为 SQLite 文件，事务内同时保存事件和按 SHA-256 去重的原件。实际场次的数据库和报告包含底稿、完整提示词及人工决定，只留在研究端。

适用版本为 PR #75 的 `drone-configurator/config-v2` 和现有 Qwen／Comfy 的 `TextEncodeQwenImage21`、`LoadImage`、原始 PNG 与运行历史。旧 C1 的浏览器插件继续使用它自己的旧导入格式。本工具是在研究端接新版输入的独立桥接；它没有修改 PR #75 的页面和交互。

## 开始前

准备 Python 3.10 以上及 Pillow，使用实际后端导出的环境清单。主持人登记匿名编号、场次顺序、简报 A/B、后端版本、向设计者出示的共同参照图和两场共同的图像条件。每人两种条件、两个不同简报，单场 15 分钟主动操作、至多 9 次设计者提交机会、至多 9 张模型返回图。真实作者预试用 `author_pilot`，开发用 `software_control`。正式被试由另外的协议管理。

两种预试输入政策任选此前登记的一种，同一配对前后保持一致。 `same-guide` 让两组后端都接收同一参照图。`structured-guide` 下，设计者都看共同参照，结构化组后端接配置器条件图，自由组首次提交仅使用自由文字。两种方式后续均可登记上一候选作为父图。

下面的文件名是命令参数示例。真实试验应填写实际文件，逐次运行。服务收到的最终请求必须与封存的请求字节对应，设计者确认后的文字须单独留存。正交顶视、四轴等宽等长、对角尺度 250 均为本次 C2 简报条件。其他构型研究使用它们自己的协议。

~~~text
python capture.py S.db start --stage author_pilot --subject P00 --pair C2-01 --order 1 --task A --condition S --policy structured-guide --model qwen-2.1-frozen --protocol C2-frozen-v1 --guide common-guide.png --brief brief-A.txt --backend-manifest environment.json
python capture.py S.db seal --id a1 --slots 2 --config drone-config-STAMP.json --approved designer-approved.txt --request actual-request.json --image uploaded-guide.png=drone-guide-STAMP.png --goal "调整目标部位" --keep "保留其余布局"
python capture.py S.db phase handoff
python capture.py S.db dispatch --id a1 --now --evidence actual-dispatch-log.json
python capture.py S.db phase queue
python capture.py S.db phase model
python capture.py S.db receive --id a1 --status success --ack raw-ack.json --history raw-history.json --output actual_00001_.png --output actual_00002_.png
python capture.py S.db present --candidate a1/1 --candidate a1/2 --status shown --now --reason "两图同时在作者的屏幕上首次展示"
python capture.py S.db decide keep --candidate a1/2 --reason "设计者原述的选择理由"
python capture.py S.db close --reason "设计者结束本场的原因" --post-task post-task.json
python capture.py S.db report
~~~

输入三件需放在同一目录，保留原始下载名。工具读取配置登记的 TXT 与 PNG 文件名，验证文本与 PNG 摘要，并保存三件原始字节。Windows 检出时 TXT 可能变为 CRLF，工具另存原始 TXT 哈希和规范 LF 的编译文本哈希。若实际送入后端的文字与设计者确认的文字不同，必须在 `seal` 加 `--difference "发生改写的环节与原因"`。实际发送文本从原始请求读取。每个 `LoadImage` 以 `--image 服务中实际的文件名=同一文件在本地的位置` 声明；服务文件名与本地文件名允许不同。

`seal` 之后才在外部发送此次请求。实发时以 `dispatch --now` 记下派发和凭据，事后有确切时间可给 `--at` 加带时区的 ISO 时间。时间未知时仅登记凭据。报告分别给出封存请求数、成功服务回执或派发凭据支持的调用数，以及派发情况不明的请求。只有本地封存或未注明是否送达的错误日志时，实发次数仍待核。

程序将未细分的等待记为 `unknown_wait`。其他阶段为 `active`、`handoff`、`queue`、`model`、`technical_pause`。收到回执后进入主持人交接阶段。候选首次展示时运行 `present --status shown --now`，从此刻开始计主动时间；其他作者活动在发生时用 `phase active` 记录。只展示了部分图时逐张给编号。同时展示的图可以共用一个呈现事件。已知展示过但首次时间缺失时省略 `--now` 和 `--at`。有屏幕事件等确切依据时用 `--at <带时区时间> --evidence <凭据>` 补记。未展示写 `--status not-shown`，无法判断写 `--status unknown`。补记保留原始阶段时间，漏切或并发导致的时差需在分析中登记。旧库缺少呈现事件的图一律保留首次可见未知。

原始历史中有服务时间时单独保存。缺少时间或服务时钟与本机不一致时，本场归属记为待核。主持人取得能关联该作业和本场请求的独立派发凭据后，用 `review-origin --id a1 --evidence dispatch-log.json --reason "核对过程"` 补录。关场后仍可补核。环境清单缺失时，配对报告标记环境无法核对。

成功回执使用服务实际返回的 ACK、历史及所有输出文件的原名。工具核对请求图、服务作业标识、原 PNG 内嵌的执行图和输出文件列表，已提供图像内容摘要的加载节点额外核对该摘要。只有摘要、截图、缺少内嵌执行图的转存图不构成此模式的成功回执。主机迁移或其他服务需先验证该后端的回执格式。未提供远端加载摘要时，只证实本地封存文件、运行图的加载文件名和输出工作流相符；文件名不能单独证明服务实际读取的每个像素。

## 修订、异常与第二场

- 成功返回后，候选按服务历史枚举顺序标记，如 `a1/1`。可以 `decide reject`、`decide rollback`、`decide manual --manual-output edited.png` 或 `decide stop`。每次要写真实理由。人工深化件保留独立来源。父图修订用新的尝试编号，在 `seal` 加 `--parent a1/2` 并逐一绑定模型实收的父图及参照。保留每次尝试实际想改和想保住的部分。
- 失败时用 `receive --id a1 --status failed --failure-log original-error.txt --note "实际原因"`。结果未明用 `unknown`，可附 `--output` 保全已经回来但未核实的文件；之后可补登记确定的成功或失败。未知没有解决时停止追加调用或以现状结束。重试须换编号并加 `--retry a1`。失败、未知和后续补录都保存在时间序列。
- 自由模式开第二个数据库，改用 `--condition D --task B --order 2 --brief brief-B.txt`（按实际随机顺序分配）。`seal` 省略 `--config`，`--approved` 指向设计者的实际自由文字，`--image` 依冻结政策填写。其他操作、回图机会和时限相同。
- 两场均结束时运行 `python capture.py S.db pair D.db`。它逐项核对两种条件、两个任务、次序、匿名编号、环境与图片政策、限额和返回情况。报告中的一致性只证明数据满足所查规则，不能证明受试者身份、独立性或实验收益。候选合格率和盲评需另用去标签材料测得。
- 计划位置和实收数量分列。例如原先留 1 个位置而实际服务返回 10 张，登记全部 10 张并标明超额；后续计划不能继续占用已耗尽的图像额度。

### 一次设计提交涉及多个后端步骤时

通常一次 `seal --id a1` 登记一次机会和一个封存请求。新的设计者提交、失败后由设计者重试，均消耗新机会。固定流水线需要多个服务请求时，在封存第一步就加 `--opportunity turn1 --planned-calls 2 --step-reason "该机会两个步骤及原因"`。后续步骤用新 `--id`、相同机会编号和本步 `--step-reason`。系统保留每步的原始请求与回执，检查是否更改已确认输入、目标、保持项和规格，以及是否发生新的人工决定。一次机会已用满计划调用数或下一机会已经开启，则该机会不能再计划调用。主动产生新候选的提交应计新机会。

实际发生了超出计划的调用、手头只有零散回件或不支持的请求格式时，用 `log-extra-call --id extra1 --opportunity turn1 --reason "实际情况" --evidence raw-log.json` 附原件，可重复传 `--evidence` 与 `--output`。已知该调用实际回图总数可给 `--returned-count`，也可用 `review-extra-count --id extra1 --returned-count 2 --evidence output-list.json` 补核。确实是额外设计者提交时填其独立机会号。缺请求对应关系的调用另列待核，输出文件保存在库中；数量未明前暂停新的图像分配。补核张数不会把图片变成已验证候选。

v1 数据可直接读取和导出。原库每个 call ID 是仅存的分组线索，报告给出该口径下的个数并标记机会划分未经前瞻记录；适用 9 次机会和 9 张图的判断须结合当时协议。已关闭库的呈现时间有独立记录才能用 `--at` 补录，原先以回执触发的主动计时保留其历史含义。

## 交给独立判读者的图

在两场关闭后，从数据库读取所有有成功回执的候选。命令在新目录内生成 `reader.zip` 和仅主持人保存的 `researcher-only.json`。评议者只接收前者，包内仅有打乱编号的 PNG。相同画面只需判读一次，私有对照表保留各次出现对应的场次、候选编号和原件摘要，供后续按原有分母统计。失败、回执未知、未核附加调用和缺件单列，候选质量和作者终稿评价分别统计。若所有场次均没有可核的候选，只生成研究端记录。此命令不发送文件。

~~~text
python -B blind_candidates.py S.db D.db --out local-reader-material
~~~

历史四旋 B2 和六旋 HEXA3-wl1.00-r01 的原始 RGBA PNG 均含模型 `prompt`，分别为 3,113 和 2,274 个字符。单独用两张历史原件检验[盲判图导出](blind_candidates.py)，导出后两张均为 1024 × 1024，RGBA 逐像素一致，完整提示词及其余原始文字元数据均已移除。两图只用于原件核验。场次级软件控制另用三次合成回图，生成两张不同的盲图，并可由私有表还原三次回图的位置。

## 本轮机制验证

~~~text
python -B check_controls.py /path/to/pr75/prototypes/drone-configurator
~~~

使用固定提交 `d6dfb211343bb8ee0b7a2b4f75f976ce7b1d16b2` 的真实导出检查原件。其十份导出中两份满足本次四轴/WL1/250 的输入约束，均通过原生格式摘要核对。随后用明确标为软件对照的 8×8 纯色 PNG 与临时请求检查完整 CLI 流程。结构化条件一次收两个候选，自由条件先失败再重试收一个；错参照、重复封存、候选缺失、无效回退、错服务回执、同条件配对等均按预期拦截。[本机验证结果](controls.json)

本轮真实模型调用数为 0，作者真实预试为 0 场。研究者检查的历史 B2 和六旋原件有各自的旧请求与版本，本工具开发用例没有将它们接成 PR #75 的新输出。
