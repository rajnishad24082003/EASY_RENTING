#!/usr/bin/env bash
# End-to-end smoke test against a running EasyRenting backend seeded with the `demo` profile.
#
#   BASE_URL=http://localhost:8080 ./scripts/smoke-test.sh
#
# Requires: curl, python3. Set CHECK_RATE_LIMIT=0 to skip the (login-blocking) rate-limit probe at the end.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="$BASE_URL/api/v1"
PASSWORD="Password@123"
CHECK_RATE_LIMIT="${CHECK_RATE_LIMIT:-1}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*"; exit 1; }
section() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# json <file> <python expression over `d`>
json() { python3 -I -c "import json,sys; d=json.load(open(sys.argv[1])); print($2)" "$1"; }

# call <expected-status> <curl args...>  -> body in $WORK/body
call() {
  local expected="$1"; shift
  local status
  status=$(curl -sS -o "$WORK/body" -w '%{http_code}' "$@")
  [[ "$status" == "$expected" ]] || { cat "$WORK/body"; echo; fail "expected HTTP $expected, got $status for: $*"; }
}

login() { # login <email> <cookie-jar> -> prints access token
  call 200 -c "$2" -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}"
  json "$WORK/body" "d['accessToken']"
}

section "Health & docs"
call 200 "$BASE_URL/actuator/health"
pass "health: $(json "$WORK/body" "d['status']")"
call 200 "$BASE_URL/v3/api-docs"
pass "openapi: $(json "$WORK/body" "d['info']['title'] + ' — ' + str(len(d['paths'])) + ' paths'")"
call 200 "$BASE_URL/actuator/prometheus"
pass "prometheus metrics exposed"

section "Auth"
TENANT=$(login tenant@easyrenting.in "$WORK/tenant.jar")
grep -q er_refresh "$WORK/tenant.jar" || fail "refresh cookie not set"
pass "tenant login (refresh cookie set, path /api/v1/auth)"
call 200 "$API/users/me" -H "Authorization: Bearer $TENANT"
pass "me: $(json "$WORK/body" "d['name'] + ' <' + d['email'] + '> ' + d['role']")"
call 200 -b "$WORK/tenant.jar" -c "$WORK/tenant.jar" -X POST "$API/auth/refresh"
pass "refresh rotated (new access token issued)"
call 401 "$API/users/me"
pass "anonymous /users/me -> 401 $(json "$WORK/body" "d['code']")"

section "Geo search (Koramangala, 3 km)"
call 200 "$API/search/properties?lat=12.9352&lng=77.6245&radiusKm=3&size=5" -H "Authorization: Bearer $TENANT"
pass "$(json "$WORK/body" "str(d['totalElements']) + ' listings, sorted by distance'")"
json "$WORK/body" "'\n'.join('      %5.2f km  ₹%-7d %s' % (p['distanceKm'], p['rent'], p['title']) for p in d['content'])"
call 200 "$API/search/properties/map?lat=12.9352&lng=77.6245&radiusKm=10"
pass "map pins within 10 km: $(json "$WORK/body" "len(d)")"
call 200 "$API/search/localities?q=kor"
pass "localities 'kor': $(json "$WORK/body" "', '.join(l['name'] + ' (' + l['city'] + ')' for l in d)")"

section "AI search"
QUERY='2bhk furnished flat in koramangala under 40k for family with parking'
call 200 -X POST "$API/search/ai" -H 'Content-Type: application/json' -d "{\"query\":\"$QUERY\"}"
pass "parser: $(json "$WORK/body" "d['parser']")"
pass "explanation: $(json "$WORK/body" "d['explanation']")"
pass "filters: $(json "$WORK/body" "json.dumps(d['filters'], ensure_ascii=False)")"
pass "results: $(json "$WORK/body" "d['results']['totalElements']")"

section "Tenant dashboard"
call 200 "$API/visits" -H "Authorization: Bearer $TENANT"
pass "visits: $(json "$WORK/body" "', '.join(v['status'] for v in d['content'])")"
call 200 "$API/conversations/unread-count" -H "Authorization: Bearer $TENANT"
pass "unread messages: $(json "$WORK/body" "d['count']")"
call 200 "$API/shortlist" -H "Authorization: Bearer $TENANT"
pass "shortlisted: $(json "$WORK/body" "d['totalElements']")"
call 200 "$API/notifications/unread-count" -H "Authorization: Bearer $TENANT"
pass "unread notifications: $(json "$WORK/body" "d['count']")"

section "Owner & admin"
OWNER=$(login owner@easyrenting.in "$WORK/owner.jar")
call 200 "$API/properties/mine?size=1" -H "Authorization: Bearer $OWNER"
pass "owner listings: $(json "$WORK/body" "d['totalElements']")"
call 403 -X POST "$API/properties" -H "Authorization: Bearer $TENANT" -H 'Content-Type: application/json' -d '{}'
pass "tenant cannot create listings (403)"
ADMIN=$(login admin@easyrenting.in "$WORK/admin.jar")
call 200 "$API/admin/stats" -H "Authorization: Bearer $ADMIN"
pass "stats: $(json "$WORK/body" "', '.join(k + '=' + str(v) for k, v in d.items())")"
call 200 "$API/admin/verifications" -H "Authorization: Bearer $ADMIN"
pass "pending verifications: $(json "$WORK/body" "', '.join(v['owner']['email'] for v in d['content'])")"

if [[ "$CHECK_RATE_LIMIT" == "1" ]]; then
  section "Rate limiting (login: 10/min per IP)"
  limited=0
  for _ in $(seq 1 12); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'Content-Type: application/json' \
      -d '{"email":"nobody@easyrenting.in","password":"x"}')
    [[ "$code" == "429" ]] && limited=1
  done
  [[ "$limited" == "1" ]] || fail "expected a 429 after 12 rapid logins"
  pass "burst of logins answered with 429 RATE_LIMITED"
fi

printf '\n\033[32mSmoke test passed.\033[0m\n'
