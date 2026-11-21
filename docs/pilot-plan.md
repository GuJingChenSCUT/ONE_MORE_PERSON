# Pilot plan — hypotheses, not results

No testers were available during the hackathon build. The current demonstration uses fictional bookings. This document describes the next test; none of its targets are measured outcomes.

## First group

Recruit two independent adult workshop organizers offering comparable sessions. Each must voluntarily reserve a small set of actual seats, check participant eligibility, and agree to honor the resulting list. Start with 6–12 adult participants across the two organizers, including existing holders who want another time and people waiting for a place.

If both organizers already prefer one administrator, use their normal booking system as the baseline. Do not introduce a blockchain solely to run a matching algorithm.

## Three hypotheses to test

| Hypothesis | How to test | What to record | Decision |
| --- | --- | --- | --- |
| Organizers will share execution rules without merging their booking systems. | Ask both to reserve named session capacity and approve one fixed configuration. | Agreement or refusal; required exceptions; who must resolve a dispute. | If either refuses to honor the final list, do not run a real-seat exchange. |
| Enough compatible changes exist to justify coordination. | Privately collect current booking and genuinely acceptable alternatives. Compute candidate relays without changing any booking. | Total people requesting a change; feasible relays; isolated requests; empty seats; manual effort. | If no feasible relays exist in two separate small cohorts, reconsider the target activity or product. |
| Participants understand the guarantee and can authorize it. | Ask participants to explain the plan, sign, withdraw once, then complete a fresh plan. Observe without coaching initially. | Completion time; errors; prompts needed; whether they understand expiry and withdrawal order. | Stop any real-seat execution when a participant cannot explain what they are authorizing. |

## One session, 20 minutes

1. Explain that the first run is a rehearsal with no effect on real bookings. Obtain permission to observe. Record no passwords, seed phrases, or wallet secrets.
2. Ask each person: “What seat do you have? Which alternatives can you genuinely attend? What do you think happens if another person withdraws?”
3. Show the whole proposed plan and ask each person to describe their own change in plain language.
4. Test missing consent and withdrawal. Ask: “Which seat do you have now?” Check their answer against the displayed state.
5. Create a fresh plan, collect consent again, execute, and show the finalized list. In a real-seat pilot, both organizers must acknowledge the list before participants rely on it.
6. Compare the effort with their usual chat or booking-admin process. Ask: “Would you use this again? What was harder than arranging it yourself?”

## Outcome sheet

Keep one record per cohort. Do not fill blank fields with demonstration values.

| Field | Definition |
| --- | --- |
| Participant count | Distinct eligible people invited; keep names in organizer records. |
| Compatible-plan rate | Requests included in at least one feasible plan / all change requests. |
| Accepted-plan rate | Complete plans accepted by everyone / complete plans offered. |
| Completed plans | Plans finalized on-chain and separately acknowledged by both organizers. |
| Additional allocations | Occupied seats after minus occupied seats before; not an attendance claim. |
| Actual attendance | Participants admitted, confirmed by organizers after the event. |
| Protected failures | Rejected or cancelled plans whose existing seat assignments stayed unchanged. |
| Human effort | Minutes spent creating, explaining, approving, correcting, and supporting each plan. |
| Wallet friction | Signing failures, wrong networks, missing gas, and required coaching. |
| Finality timing | Actual client timestamps with endpoint and measurement boundaries; no p95 claim from one run. |

Keep only the minimum consented observations. Publish aggregate results and anonymized quotations only with permission. Wallet addresses and their on-chain seat relations are publicly visible even when real names remain off-chain.

## Judge-led fallback today

Use the fictional Alice/Bob/Charlie story and invite judges to choose a failure. Record feedback as judge feedback, not as customer validation. A successful demonstration means the mechanism is understandable and verifiable; it does not establish organizer demand, adoption, or real attendance improvement.
