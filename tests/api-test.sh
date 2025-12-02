#!/bin/bash

BASE="https://lanternwave.com/.netlify/functions"

echo "=== TESTING MISSIONS ==="
curl "$BASE/api-missions"
curl -X POST "$BASE/api-missions" -d '{"name":"Test Campaign"}'

echo "=== TESTING SESSIONS ==="
curl "$BASE/api-mission-sessions?mission_id=1"
curl -X POST "$BASE/api-mission-sessions" -d '{"mission_id":1,"session_name":"Session A"}'

echo "=== TESTING EVENTS ==="
curl "$BASE/api-events?session_id=1"
curl -X POST "$BASE/api-events" -d '{"session_id":1,"event_type":"test","payload":{}}'

echo "=== TESTING MESSAGES ==="
curl "$BASE/api-mission-messages?mission_id=1"

echo "=== TESTING SESSION PLAYERS ==="
curl "$BASE/api-session-players?session_id=1"
curl -X POST "$BASE/api-session-players" -d '{"session_id":1,"phone_number":"999","player_name":"Tester"}'

echo "=== TESTING NPC LIST ==="
curl -H "x-admin-key:$VITE_ADMIN_API_KEY" "$BASE/api-npcs"

echo "=== TESTING NPC CREATION ==="
curl -X POST -H "x-admin-key:$VITE_ADMIN_API_KEY" "$BASE/api-npcs" \
  -d '{"display_name":"Test NPC"}'

echo "=== TESTING MISSION NPCS ==="
curl "$BASE/api-mission-npcs?mission_id=1"

echo "=== TESTING NPC STATE ==="
curl "$BASE/api-npc-state?session_id=1&npc_id=1"
