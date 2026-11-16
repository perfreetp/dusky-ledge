#!/usr/bin/env bash
# 端到端 HTTP 冒烟：登录 → 建项目 → 存两版 → diff → 提交审查 → 主管批准 → 统计 → 服务端复算
set -euo pipefail
BASE="http://localhost:3000/api"
CODE="SMOKE-$(date +%s)"

req() { # method path token [data]
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-s -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$data" ]] && args+=(-d "$data")
  curl "${args[@]}"
}

echo "== 1. 登录（工程师/主管） =="
ENG=$(req POST /auth/login "" '{"username":"engineer","password":"engineer123"}')
SUP=$(req POST /auth/login "" '{"username":"supervisor","password":"super1234"}')
ETOK=$(node -e "console.log(JSON.parse(process.argv[1]).token)" "$ENG")
STOK=$(node -e "console.log(JSON.parse(process.argv[1]).token)" "$SUP")
echo "  engineer token: ${ETOK:0:18}... supervisor token: ${STOK:0:18}..."

echo "== 2. 未授权访问应 401 =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/projects")
[[ "$code" == "401" ]] && echo "  401 OK" || { echo "  FAIL: $code"; exit 1; }

echo "== 3. 机型列表 + 建项目 $CODE =="
ROBOT_ID=$(req GET /robots "$ETOK" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d)[0].id))")
echo "  robotId=$ROBOT_ID"
PROJECT=$(req POST /projects "$ETOK" "{\"name\":\"冒烟项目\",\"code\":\"$CODE\",\"robotConfigId\":\"$ROBOT_ID\",\"rules\":{\"outerDiameter\":30,\"wallThickness\":2,\"bendRadiusFactor\":4,\"minLayerGap\":1.5,\"segmentNameTemplate\":\"{project}-S{seq}-{joint}\",\"radialSegments\":24,\"tubularSegments\":160}}")
PID=$(node -e "console.log(JSON.parse(process.argv[1]).id)" "$PROJECT")
echo "  projectId=$PID"

MODEL='{"version":0,"name":"smoke","interpolation":"catmullRom","controlPoints":[{"id":"c1","position":[0,0,0],"weight":1,"jointId":"J1"},{"id":"c2","position":[120,0,0],"weight":1,"jointId":"J1"},{"id":"c3","position":[220,90,0],"weight":1,"jointId":"J2"},{"id":"c4","position":[220,200,40],"weight":1,"jointId":"J3"}],"rules":{"outerDiameter":30,"wallThickness":2,"bendRadiusFactor":4,"minLayerGap":1.5,"segmentNameTemplate":"{project}-S{seq}-{joint}","radialSegments":24,"tubularSegments":160},"jointAngles":{},"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}'

echo "== 4. 保存 v1 / v2(NURBS) =="
V1=$(req POST "/projects/$PID/versions" "$ETOK" "{\"model\":$MODEL,\"changeNote\":\"初版\"}")
echo "  v1: $(node -e "const d=JSON.parse(process.argv[1]);console.log('version',d.version,'总长',d.inspection.totalLength.toFixed(1),'段数',d.inspection.segmentStats.length,'间隙',d.inspection.minMeasuredGap.toFixed(2),'展开误差%',d.inspection.unfoldAreaErrorPct.toFixed(3))" "$V1")"
MODEL2=$(node -e "const m=JSON.parse(process.argv[1]);m.interpolation='nurbs';console.log(JSON.stringify(m))" "$MODEL")
V2=$(req POST "/projects/$PID/versions" "$ETOK" "{\"model\":$MODEL2,\"changeNote\":\"转 NURBS\"}")
node -e "const d=JSON.parse(process.argv[1]);if(d.version!==2)process.exit(1);console.log('  v2 version OK, 总长',d.inspection.totalLength.toFixed(1))" "$V2"

echo "== 5. 版本 diff =="
req GET "/projects/$PID/diff?from=1&to=2" "$ETOK" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const x=JSON.parse(d);console.log('  插值变化:',x.interpolationChanged,'| 段长度差条目:',x.segmentLengthDiff.length)})"

echo "== 6. 提交审查 → 主管批准 =="
req POST "/reviews/$PID/submit" "$ETOK" '{}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('  状态:',JSON.parse(d).status))"
req GET /reviews/queue "$STOK" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const q=JSON.parse(d);console.log('  审查队列含本项目:',q.some(p=>p.projectId==='$PID'))})"
req POST "/reviews/$PID/approve" "$STOK" '{"comment":"冒烟批准"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('  审查结果:',JSON.parse(d).status,'by',JSON.parse(d).reviewerName))"

echo "== 7. 主管看板统计 =="
req GET /stats/overview "$STOK" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).find(p=>p.projectId==='$PID');console.log('  版本数:',r.versionCount,'状态:',r.status)})"
req GET "/stats/projects/$PID/segments" "$STOK" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('  分段统计行数:',JSON.parse(d).length))"

echo "== 8. 服务端几何复算 =="
req POST /inspection "$ETOK" "{\"model\":$MODEL,\"robotConfig\":null}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const x=JSON.parse(d);console.log('  复算总长:',x.totalLength.toFixed(1),'| 分段:',x.segmentStats.map(s=>s.segmentName).join(', '))})"

echo "== 全部冒烟通过 ✔ =="
