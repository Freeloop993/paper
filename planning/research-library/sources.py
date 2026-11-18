"""Read the public research registers. Keep catalogue membership separate from usable evidence."""

import csv
import hashlib
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
HAND = "planning/workbench-handoff/"
STUDY = "planning/advisor-20261118/"
LIB = "planning/research-library/"
CARDS = "evidence/semantic-cards/cards.csv"


@dataclass
class Item:
    id: str
    kind: str
    title: str
    claim: str
    limitation: str
    source: str
    locator: str
    status: str
    origin: str
    resource: str = ""
    layout: str = ""
    scope: str = ""


class Registers:
    def __init__(self):
        self.items = []
        self.files = {}
        self.memberships = []
        self.origins = []
        self.crosswalk = []
        self.manuscripts = []
        self.routes = []

    def rows(self, path):
        file = ROOT / path
        raw = file.read_bytes()
        self.files[path] = hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()
        with file.open(encoding="utf-8-sig", newline="") as stream:
            return list(csv.DictReader(stream))

    def load(self):
        path = HAND + "literature/全库文献导航.csv"
        groups = {}
        for r in self.rows(path):
            key = r["导航行标识"]
            self.items.append(
                Item(
                    key,
                    "catalog",
                    r["题名（保留原组）"],
                    r["本轮核注册DOI"] or r["旧表DOI"],
                    r["跨组提示"] or "导航组，仅用于定位作品和原页证据。",
                    r["本轮原件或项目页"] or r["历史来源地址"],
                    key,
                    "catalog",
                    path,
                )
            )
            if r["本轮ID"]:
                groups.setdefault(r["本轮ID"], []).append(key)
        path = STUDY + "literature/source-rows.csv"
        self.origins = [
            (r["group"], r["source"], r["row"], r["title"], r["doi"], r["sha256"])
            for r in self.rows(path)
        ]
        path = HAND + "literature/论文与原页证据.csv"
        for r in self.rows(path):
            key = r["本轮ID"]
            status = (
                "direct_support"
                if r["状态"].startswith("直接支持")
                else "background"
                if "背景" in r["状态"]
                else "pending"
            )
            self.items.append(
                Item(
                    key,
                    "literature",
                    r["论文"],
                    r["可支持的具体主张或设计决定"],
                    r["外推边界"],
                    r["相关原文/作者页"],
                    "PDF " + r["PDF页（1起始）"] + " / " + r["印刷页/定位"],
                    status,
                    path,
                    r["文件SHA256"],
                )
            )
            self.memberships.extend((key, g) for g in groups[key])
        path = STUDY + "literature/method-cards.csv"
        for r in self.rows(path):
            key = "M-" + r["id"]
            self.items.append(
                Item(
                    key,
                    "literature",
                    r["work"],
                    r["finding"],
                    r["limit"],
                    r["source"],
                    "PDF " + r["pdf_pages_1_based"],
                    r["classification"],
                    path,
                    r["sha256"],
                )
            )
            self.memberships.append((key, r["screen_id"]))
        path = STUDY + "literature/supplement-method-cards.csv"
        for r in self.rows(path):
            key = "S-" + r["group"]
            self.items.append(
                Item(
                    key,
                    "literature",
                    r["title"],
                    r["observed_method_or_result"],
                    r["use_and_limit"],
                    r["public_identity_or_fulltext"],
                    "PDF " + r["pdf_pages_1_based"],
                    "reviewed",
                    path,
                    r["sha256"],
                )
            )
            self.memberships.append((key, r["group"]))
        editions = {
            r["id"]: r for r in self.rows(LIB + "literature/edition-checks.csv")
        }
        path = LIB + "literature/reviewed_additions.csv"
        for r in self.rows(path):
            self.items.append(
                Item(
                    r["id"],
                    "literature",
                    r["title"],
                    r["claim"],
                    r["limitation"],
                    r["source"],
                    r["locator"],
                    r["classification"],
                    path,
                    editions[r["id"]]["sha256"],
                )
            )
            group = r["group"] or "NAV-" + r["id"]
            if not r["group"]:
                self.items.append(
                    Item(
                        group,
                        "catalog",
                        r["title"],
                        "",
                        "导航条目；论证范围见相应证据卡。",
                        r["source"],
                        group,
                        "catalog",
                        path,
                    )
                )
            self.memberships.append((r["id"], group))
        for r in self.rows(LIB + "literature/reference-crosswalk.csv"):
            group = r["group"] or ("NAV-" + r["evidence_id"])
            self.crosswalk.append(
                (
                    r["source_set"],
                    r["source_item"],
                    r["title"],
                    group,
                    r["status"],
                    r["evidence_id"],
                )
            )
        for r in self.rows(LIB + "literature/manuscript-crosswalk.csv"):
            self.manuscripts.append(
                (
                    r["group"],
                    r["advisor_no"],
                    r["revised_no"],
                    r["advisor_reference"],
                    r["revised_reference"],
                    r["use"],
                )
            )
        for r in self.rows(LIB + "literature/relevance-index.csv"):
            self.routes.append(
                (
                    r["group"],
                    r["suggested_reading_routes"],
                    r["routing_basis"],
                    r["source_disposition"],
                )
            )
        path = CARDS
        for r in self.rows(path):
            self.items.append(
                Item(
                    r["卡号"],
                    "semantic",
                    r["对象"] + " · " + r["类别"],
                    r["原文片段"],
                    r["历史解释与限制"],
                    path,
                    r["卡号"] + " / " + r["匿名来源键"],
                    "public_excerpt",
                    path,
                    r["匿名来源键"],
                    scope=r["数据集"] + " / " + r["展开或折叠状态"] + " / " + r["极性"],
                )
            )
        path = STUDY + "configurations/source-register.csv"
        for r in self.rows(path):
            self.items.append(
                Item(
                    "CFG-" + r["id"],
                    "configuration",
                    r["family"] + " · " + r["title"],
                    r["view_observation"],
                    r["use_and_limit"],
                    r["url"],
                    r["locator"] + " / " + r["pdf_page_1based"],
                    r["classification"],
                    path,
                    r["sha256"],
                    r["family"],
                    r["civilian_task"],
                )
            )
        path = LIB + "design/design_cards.csv"
        for r in self.rows(path):
            self.items.append(
                Item(
                    r["id"],
                    r["kind"],
                    r["title"],
                    r["claim"],
                    r["limitation"],
                    r["source"],
                    r["locator"],
                    r.get("status") or "documented",
                    path,
                    resource=r.get("snapshot", ""),
                    layout=r["layout"],
                    scope=" / ".join(
                        s for s in (r.get("conditions"), r.get("provenance")) if s
                    ),
                )
            )
        path = HAND + "context/h3/jobs.csv"
        for r in self.rows(path):
            key = r["sample_id"]
            self.items.append(
                Item(
                    key,
                    "design_record",
                    key + " 四旋造型生成记录",
                    f"{r['model']}，HTTP {r['http_status']}，状态 {r['status']}。"
                    + (
                        "登记的父图为 " + r["parent_sample_id"] + "。"
                        if r["parent_sample_id"]
                        else "输入含布局条件图。"
                    ),
                    "一次作业的技术记录，不能推断造型质量、作者采纳或跨构型控制。",
                    path,
                    key,
                    "run_record",
                    path,
                    r["original_output_sha256"] or r["layout_sha256"],
                    "quad",
                )
            )
        for f in ("lookup.mjs", "topics.mjs"):
            path = STUDY + "semantic/lookup/" + f
            self.files[path] = hashlib.sha256(
                (ROOT / path).read_bytes().replace(b"\r\n", b"\n")
            ).hexdigest()
        return self
