#!/usr/bin/env python3
"""팀 VM ~/ragx 안에서 실행 (키를 VM 밖으로 가져가지 않는다).

사용법: cd ~/ragx && python3 rag_meta_eval.py validate input.json
        python3 rag_meta_eval.py compare input.json
시한이 있는 작업은 두 명령에 --deadline HHMM (한국 시각)을 붙인다.

Make chunks(section), 권한별 fetch_k=8, Shape evidence를 복제한다.
입력 JSON: before/after 문서(name/title/text), questions(id/group/q/expect/
access_levels), blind 25의 reference(id별 [doc, section, score] top-4).
출력: validate는 validation.json, compare는 measurement.json (전/후 요약·순위).
compare는 같은 before 입력으로 검증 23/25 이상을 통과한 뒤에만 실행한다.
키는 VM ~/aio-p4-3rd-team-pharm/infra/.env의 OPENAI_API_KEY에서 메모리로만
읽고 출력·저장하지 않는다. embeddings.json 캐시에는 글과 벡터만 저장한다.
입력·출력·캐시는 VM 작업 폴더 안에 두고, stdout에는 진행 요약만 쓴다.
"""
import argparse, datetime, hashlib, json, math, re, sys, urllib.request
from pathlib import Path


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save(path, obj):
    Path(path).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def chunks(docs):
    out = []
    for doc in docs:
        for piece in re.split(r"\n(?=## )", doc["text"])[1:]:
            section, _, body = piece.partition("\n")
            out.append({"doc": doc["name"], "section": re.sub(r"^##\s*", "", section).strip(),
                        "access_level": "owner" if doc["name"].startswith("mgr-") else "all",
                        "text": doc["title"] + " › " + re.sub(r"^##\s*", "", section).strip() + "\n" + body.strip()})
    return out


def embed(texts, cache):
    # LangChain JS OpenAIEmbeddings 기본 stripNewLines=true.
    missing = list(dict.fromkeys(t.replace("\n", " ") for t in texts if t.replace("\n", " ") not in cache))
    if missing:
        env = Path.home() / "aio-p4-3rd-team-pharm/infra/.env"
        key = next(line.split("=", 1)[1].strip().strip("\"'") for line in env.read_text().splitlines()
                   if line.startswith("OPENAI_API_KEY="))
        body = json.dumps({"model": "text-embedding-3-large", "input": missing, "encoding_format": "float"}).encode()
        req = urllib.request.Request("https://api.openai.com/v1/embeddings", body,
                                     {"Authorization": "Bearer " + key, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=90) as response:
            data = json.load(response)
        for row in data["data"]:
            assert len(row["embedding"]) == 3072
            cache[missing[row["index"]]] = row["embedding"]
        save("embeddings.json", cache)
        print(f"embedded={len(missing)} tokens={data['usage']['prompt_tokens']}", flush=True)
    return [cache[t.replace("\n", " ")] for t in texts]


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b)) / math.sqrt(sum(x * x for x in a) * sum(x * x for x in b))


def evaluate(docs, questions, cache):
    cs = chunks(docs)
    vectors = embed([c["text"] for c in cs], cache)
    queries = embed([q["q"].strip() for q in questions], cache)
    rows = []
    for q, vector in zip(questions, queries):
        fetched = []
        for access in (["all", "owner"] if "owner" in q.get("access_levels", []) else ["all"]):
            candidates = [(c, cosine(v, vector)) for c, v in zip(cs, vectors) if c["access_level"] == access]
            fetched += sorted(candidates, key=lambda pair: -pair[1])[:8]
        rounded = [(c, math.floor(score * 1000 + 0.5) / 1000) for c, score in fetched]
        seen, ranked = set(), []
        for c, score in sorted(rounded, key=lambda pair: -pair[1]):
            identity = (c["doc"], c["section"])
            if identity not in seen:
                ranked.append([*identity, score])
                seen.add(identity)
        ranked = ranked[:4]
        expected = q["expect"]
        rows.append({**q, "ranked": ranked, "hit1": bool(expected and ranked[0][0] in expected),
                     "hit4": bool(expected and any(r[0] in expected for r in ranked))})
    lengths = sorted(len(c["text"].encode("utf-16-le")) // 2 for c in cs)
    groups = {}
    for group in dict.fromkeys(q["group"] for q in questions):
        subset = [r for r in rows if r["group"] == group]
        groups[group] = {"n": len(subset), **{k: sum(r[k] for r in subset) for k in ("hit1", "hit4")}}
    inside = [r for r in rows if r["id"].startswith("Q") and r["expect"]]
    meta = lambda r: sum("이 문서는" in e[1] or "출처와 기준일" in e[1] for e in r["ranked"])
    return {"chunks": len(cs), "chunk_chars": {"min": lengths[0], "median": lengths[len(lengths) // 2], "max": lengths[-1]},
            "groups": groups, "blind_in_scope": {"n": len(inside), **{k: sum(r[k] for r in inside) for k in ("hit1", "hit4")}},
            "blind_in_scope_top1_min": min(r["ranked"][0][2] for r in inside),
            "out_of_scope_top1": {r["id"]: r["ranked"][0][2] for r in rows if not r["expect"]},
            "meta_top4_occurrences": sum(map(meta, rows)), "meta_top4_questions": sum(meta(r) > 0 for r in rows),
            "meta_blind_top4_occurrences": sum(meta(r) for r in rows if r["id"].startswith("Q")),
            "meta_blind_top4_questions": sum(meta(r) > 0 for r in rows if r["id"].startswith("Q")), "rows": rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("validate", "compare"))
    parser.add_argument("source", help="before/after 문서·질문·VM 대조 순위 JSON")
    parser.add_argument("--deadline", help="선택: 실행을 시작할 수 있는 한국 시각 상한 HHMM")
    args = parser.parse_args()
    assert Path.cwd().resolve() == (Path.home() / "ragx").resolve(), "run inside ~/ragx"
    if args.deadline:
        assert len(args.deadline) == 4 and args.deadline.isdigit(), "deadline must be HHMM"
        datetime.datetime.strptime(args.deadline, "%H%M")
        assert datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%H%M") < args.deadline, "VM deadline"
    mode, source = args.mode, args.source
    data = load(source)
    cache = load("embeddings.json") if Path("embeddings.json").exists() else {}
    digest = hashlib.sha256(json.dumps(data["before"], ensure_ascii=False).encode()).hexdigest()
    if mode == "validate":
        before = evaluate(data["before"], [q for q in data["questions"] if q["id"].startswith("Q")], cache)
        checks = []
        for row in before["rows"]:
            actual, ref = row["ranked"], data["reference"][row["id"]]
            order = [r[:2] for r in actual] == [r[:2] for r in ref]
            delta = max(abs(a[2] - b[2]) for a, b in zip(actual, ref))
            checks.append({"id": row["id"], "order_equal": order, "max_score_delta": round(delta, 6), "matched": order and delta <= 0.005})
        validation = {"before_sha256": digest, "matched": sum(c["matched"] for c in checks), "n": 25, "checks": checks}
        save("validation.json", validation)
        print(f"replica_validation={validation['matched']}/25", flush=True)
        return 0 if validation["matched"] >= 23 else 1
    assert mode == "compare"
    validation = load("validation.json")
    assert validation["matched"] >= 23 and validation["before_sha256"] == digest
    result = {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "validation": validation,
              **{phase: evaluate(data[phase], data["questions"], cache) for phase in ("before", "after")}}
    save("measurement.json", result)
    print("comparison_saved=measurement.json", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
