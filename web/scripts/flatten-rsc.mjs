// 해든: 정적 내보내기는 out/my/__next.my/__PAGE__.txt 로 저장하는데, 화면은 out/my/__next.my.__PAGE__.txt 를 찾습니다.
// 빌드 뒤 같은 파일을 찾는 이름으로 복사해 메뉴 이동이 404 없이 부드럽게 되도록 합니다.
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) flatten(full, dir, entry.name);
    else if (entry.name !== "_next") walk(full);
  }
}

function flatten(from, target, prefix) {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const name = `${prefix}.${entry.name}`;
    if (entry.isDirectory()) flatten(path.join(from, entry.name), target, name);
    else copyFileSync(path.join(from, entry.name), path.join(target, name));
  }
}

if (existsSync("out")) walk("out");
