"""Check public inputs, relational integrity and one frozen semantic packet without ML dependencies."""

import hashlib
import json
from contextlib import closing
from types import SimpleNamespace

from generate import check_packet
from library import DB, connect, description, packet, search
from sources import HERE, ROOT


def verify():
    with closing(connect(DB)) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert not list(db.execute("PRAGMA foreign_key_check"))
        for row in db.execute("SELECT * FROM files"):
            raw = (ROOT / row["path"]).read_bytes().replace(b"\r\n", b"\n")
            assert hashlib.sha256(raw).hexdigest() == row["sha256_lf"], row["path"]
        count = db.execute("SELECT count(*) FROM items").fetchone()[0]
        assert (
            db.execute(
                "SELECT count(*) FROM vectors WHERE length(data)=512*4"
            ).fetchone()[0]
            == count
        )
        assert db.execute("SELECT count(*) FROM search_index").fetchone()[0] == count
        assert (
            db.execute("SELECT count(*) FROM items WHERE kind='catalog'").fetchone()[0]
            == db.execute("SELECT count(*) FROM reading_routes").fetchone()[0]
        )
        catalog = {
            r[0] for r in db.execute("SELECT id FROM items WHERE kind='catalog'")
        }
        assert all(
            set(r[0].split("|")) <= catalog
            for r in db.execute("SELECT catalog_ids FROM crosswalk")
        )
        assert {
            r["id"] for r in search(db, "D-P-TASK", "protocol", layout="flat_hex")
        } == {"D-P-TASK"}
        sample = json.loads(
            (HERE / "qa/generation/folded-bag.packet.json").read_text(encoding="utf-8")
        )
        check_packet(db, sample)
        args = SimpleNamespace(
            route="semantic",
            question="农业六旋药箱展开",
            task="consumer_camera",
            layout="quad",
            topic="bag_fit",
            state="folded",
            component=None,
            limit=5,
            select=None,
        )
        mixed = packet(db, args)
        assert mixed["status"] == "clarify" and not mixed["evidence"]
        # Check two known project leads cannot enter the method-answer pool.
        for key in ("B01", "B02"):
            assert all(r["id"] != key for r in search(db, key, "method", evidence=True))
        return description(db)


if __name__ == "__main__":
    print(json.dumps(verify(), ensure_ascii=True, indent=2))
