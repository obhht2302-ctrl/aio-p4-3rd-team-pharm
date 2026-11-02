#!/usr/bin/env python3
"""팩(기능 묶음)으로 샘 구조 폴더를 만들고 샘 기준을 확인한다. 표준 라이브러리만 쓴다.

  python3 tools/packs.py build      packs/active.json의 팩으로 knowledge/ · data/ · cases/team.json · config/type-policy.json
  python3 tools/packs.py check      문서 6+ (절 3+) · 유형 4~6 · 팀 시나리오 5+ · 고정 팩 켜짐 · common 해시 · contracts/examples
  python3 tools/packs.py lock       cases/common.json 해시를 cases/common.sha256에 적음 (리드만, 11/5 14:00 점검 뒤로는 금지)
  python3 tools/packs.py selftest   고정 팩 + 나머지 팩의 모든 조합을 임시 폴더에서 build + check
  --active recall,closing,...       active.json 대신 이 목록으로 (build · check)
"""
import argparse, hashlib, itertools, json, re, shutil, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIMITS = {"docs_min": 6, "sections_min": 3, "types_min": 4, "types_max": 6, "team_cases_min": 5, "users_min": 5, "records_min": 4}
MODES = {"auto", "evidence_handoff", "handoff_only", "record_status"}
ROLES = {"staff", "pharmacist", "owner", "patient"}
COMPAT = {"users": "employees", "records": "tickets"}  # 77판 data-api가 읽는 이름 (80판 키트 확인 뒤 정리)
CONTRACT_KEYS = {"request_id", "route", "answer", "sources", "ticket", "agents", "security", "reason", "timings"}
BEFORE = [{"url": f"http://localhost:8800/{p}", "body": {}} for p in ("tickets-reset", "dlq-clear", "alerts-clear", "cache-clear")] + [
    {"url": "http://localhost:8800/admin/fault", "body": {"tickets": "ok", "faq": "ok", "dlq": "ok"}}]

def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def dump(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

def digest(root: Path) -> str:
    return hashlib.sha256((root / "cases/common.json").read_bytes()).hexdigest()

def build(root: Path, active: list[str]) -> dict:
    packs = []
    for pid in ["_core", *active]:
        if not (root / "packs" / pid / "pack.json").exists():
            sys.exit(f"✘ 없는 팩: {pid}")
        packs.append({**load(root / "packs" / pid / "pack.json"), "dir": root / "packs" / pid})
    for folder, pattern in (("knowledge", "*.md"), ("data", "*.json")):
        (root / folder).mkdir(exist_ok=True)
        for old in (root / folder).glob(pattern):
            old.unlink()
    data, types, cases = {}, [], []
    for p in packs:
        for doc in sorted((p["dir"] / "knowledge").glob("*.md")):
            shutil.copyfile(doc, root / "knowledge" / doc.name)
        extra = {"users": load(p["dir"] / "users.json")} if (p["dir"] / "users.json").exists() else {}
        extra.update(load(p["dir"] / "records.json") if (p["dir"] / "records.json").exists() else {})
        for name, value in extra.items():
            data.setdefault(name, [] if isinstance(value, list) else {})
            data[name].extend(value) if isinstance(value, list) else data[name].update(value)
        # 단계 스위치 (어르신 SENIOR_MODE): "level" 한 줄이 mode를 정한다
        own = [{**t, "pack": p["id"], "mode": t["level_modes"][t["level"]] if "level" in t else t["mode"]} for t in p.get("types", [])]
        types += own
        case_file = p["dir"] / p.get("cases_by_mode", {}).get(own[0]["mode"] if own else "", "cases.json")
        cases += load(case_file)["cases"] if case_file.exists() else []
    for name, value in data.items():
        dump(root / "data" / f"{name}.json", value)
        if name in COMPAT:
            dump(root / "data" / f"{COMPAT[name]}.json", value)
    dump(root / "data/faq.json", [])
    dump(root / "cases/team.json", {"webhook": "team3-support", "before": BEFORE, "cases": cases})
    policy = {"active": active, "modes": sorted(MODES), "types": types, "other": packs[0].get("other", {})}
    dump(root / "config/type-policy.json", policy)
    sync_workflow(root, policy)
    if (root / "web/lib").is_dir():  # 화면 가짜 응답도 계약 예시 그대로
        shutil.copyfile(root / "contracts/examples/api.json", root / "web/lib/contract-examples.json")
    print(f"✔ build: 팩 {['_core', *active]} → 문서 {len(list((root / 'knowledge').glob('*.md')))} · 유형 {len(types)} · 팀 시나리오 {len(cases)}")
    return policy

def sync_workflow(root: Path, policy: dict) -> None:
    """본체 JSON이 있으면 Type policy 노드의 /*POLICY*/ … /*END*/ 사이를 새 표로 바꾼다."""
    wf_path = root / "workflows/team3-support.json"
    wf = load(wf_path) if wf_path.exists() else {"nodes": []}
    for node in wf["nodes"]:
        code = node.get("parameters", {}).get("jsCode", "")
        if node.get("name") == "Type policy" and "/*POLICY*/" in code:
            table = json.dumps({k: policy[k] for k in ("types", "other")}, ensure_ascii=False)
            node["parameters"]["jsCode"] = re.sub(r"/\*POLICY\*/.*?/\*END\*/", lambda _: f"/*POLICY*/{table}/*END*/", code, flags=re.S)
            wf_path.write_text(json.dumps(wf, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print("✔ workflows/team3-support.json 의 Type policy 표를 바꿨어요")

def doc_problems(path: Path) -> tuple[list[str], list[str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    sections = [i for i, line in enumerate(lines) if line.startswith("## ")]
    errors = [] if lines and lines[0].startswith("# ") else [f"{path.name}: 첫 줄이 '# 제목'이 아님"]
    errors += [f"{path.name}: '## 절'이 {len(sections)}개 (3개 이상)"] if len(sections) < LIMITS["sections_min"] else []
    warns = []
    for i, start in enumerate(sections):
        body = "".join(lines[start + 1:sections[i + 1] if i + 1 < len(sections) else len(lines)]).strip()
        warns += [f"{path.name} '{lines[start][3:]}': {len(body)}자 (권장 150~400)"] if not 150 <= len(body) <= 400 else []
    return errors, warns

def contract_problems(root: Path) -> list[str]:
    errors = []
    for f in sorted((root / "contracts/examples").glob("*.json")):
        try:
            data = load(f)
        except json.JSONDecodeError as e:
            errors.append(f"contracts/examples/{f.name}: JSON 오류 {e}")
            continue
        for name, resp in (data.get("responses", {}) if f.name == "support.json" else {}).items():
            errors += [f"support.json '{name}': 응답 칸 {sorted(CONTRACT_KEYS - set(resp))} 빠짐"] if CONTRACT_KEYS - set(resp) else []
    return errors

def check(root: Path, active: list[str], quiet: bool = False) -> bool:
    errors, warns = [], []
    fixed = [p.parent.name for p in (root / "packs").glob("*/pack.json") if load(p).get("fixed") and p.parent.name != "_core"]
    errors += [f"고정 팩 '{f}'이 꺼져 있음 (공통 시나리오가 묶여 있음)" for f in fixed if f not in active]
    policy = load(root / "config/type-policy.json")
    errors += [f"빌드가 오래됨: config는 {policy.get('active')}, 지금은 {active} → build 먼저"] if policy.get("active") != active else []
    docs = sorted((root / "knowledge").glob("*.md"))
    errors += [f"지식 문서 {len(docs)}개 (6개 이상)"] if len(docs) < LIMITS["docs_min"] else []
    for doc in docs:
        e, w = doc_problems(doc)
        errors, warns = errors + e, warns + w
    types = policy["types"]
    errors += [f"유형 {len(types)}개 (4~6개)"] if not LIMITS["types_min"] <= len(types) <= LIMITS["types_max"] else []
    for t in types:
        bad = t.get("mode") not in MODES or not t.get("roles") or not set(t["roles"]) <= ROLES
        bad |= any(not (r.get("any") and r.get("assignee")) for r in t.get("handoff_rules", []))
        errors += [f"유형 {t.get('type')}: mode · roles · handoff_rules 값이 틀림"] if bad else []
    team, common = load(root / "cases/team.json")["cases"], load(root / "cases/common.json")["cases"]
    errors += [f"팀 시나리오 {len(team)}개 (5개 이상)"] if len(team) < LIMITS["team_cases_min"] else []
    names = {d.stem for d in docs}
    for case in common + team:
        want = case.get("expect", {}).get("contains", {}).get("sources", [])
        errors += [f"'{case.get('name')}'가 없는 문서 {d}를 기대함" for d in want if d not in names]
    errors += contract_problems(root)
    users, records = load(root / "data/users.json"), load(root / "data/records.json")
    if len(users) < LIMITS["users_min"] or len(records) < LIMITS["records_min"] or len({r["requester"] for r in records.values()}) < 2:
        errors.append(f"사용자 {len(users)}명 · 접수 건 {len(records)}건 (5명 · 4건 이상, 주인 2명 이상)")
    lock = root / "cases/common.sha256"
    if not lock.exists() or lock.read_text().strip() != digest(root):
        errors.append("cases/common.json 해시가 lock과 다름 (11/5 14:00 점검 뒤로는 바꾸면 안 됨, 바꾼 게 맞으면 리드가 lock)")
    if not quiet:
        print("\n".join([f"  · 참고: {w}" for w in warns] + [f"✘ {e}" for e in errors]) or "", end="\n" if warns or errors else "")
        print(f"{'✔' if not errors else '✘'} check: 팩 {active} · 문서 {len(docs)} · 유형 {len(types)} · 팀 시나리오 {len(team)} · 공통 {len(common)}")
    return not errors

def selftest() -> bool:
    all_packs = {p.parent.name: load(p) for p in (ROOT / "packs").glob("*/pack.json") if p.parent.name != "_core"}
    fixed = sorted(k for k, v in all_packs.items() if v.get("fixed"))
    optional = sorted(k for k in all_packs if k not in fixed)
    good = True
    for n in range(len(optional) + 1):
        for combo in itertools.combinations(optional, n):
            with tempfile.TemporaryDirectory() as tmp:
                t, active = Path(tmp), fixed + list(combo)
                shutil.copytree(ROOT / "packs", t / "packs")
                shutil.copytree(ROOT / "contracts", t / "contracts")
                (t / "cases").mkdir()
                for f in ("common.json", "common.sha256"):
                    shutil.copyfile(ROOT / "cases" / f, t / "cases" / f)
                with open(t / "build.log", "w") as log:
                    sys.stdout, saved = log, sys.stdout
                    build(t, active)
                    ok = check(t, active, quiet=True)
                    sys.stdout = saved
            want = n > 0  # 고정 팩만 켜면 유형이 4개 미만이라 실패해야 맞음
            good &= ok == want
            print(f"{'✔' if ok == want else '✘'} {'+'.join(active):40} → check {'통과' if ok else '실패'}{'' if want else ' (기대: 실패)'}")
    return good

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["build", "check", "lock", "selftest"])
    ap.add_argument("--active")
    args = ap.parse_args()
    if args.cmd == "lock":
        (ROOT / "cases/common.sha256").write_text(digest(ROOT) + "\n")
        sys.exit(print(f"✔ lock: {digest(ROOT)[:12]}…"))
    if args.cmd == "selftest":
        sys.exit(0 if selftest() else 1)
    active = [p for p in args.active.split(",") if p] if args.active else load(ROOT / "packs/active.json")
    build(ROOT, active) if args.cmd == "build" else sys.exit(0 if check(ROOT, active) else 1)

if __name__ == "__main__":
    main()
