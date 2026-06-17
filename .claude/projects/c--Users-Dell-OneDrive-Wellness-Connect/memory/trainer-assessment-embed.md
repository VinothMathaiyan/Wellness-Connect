---
name: trainer-assessment-embed
description: Filtering trainer client lists by assessment clearance requires embedding through profiles — no FK links trainer_client_links to assessments.
metadata:
  type: project
---

`trainer_client_links` and `assessments` have **no foreign key between them** (both only FK to `profiles`). So PostgREST `from('trainer_client_links').select('assessments!inner(...)')` fails with PGRST200 ("Could not find a relationship").

To gate trainer surfaces (getActiveClientCount, getPendingClientRequests) to approved clients (clearance_status in cleared/conditional), embed through profiles:

```
client:profiles!trainer_client_links_client_id_fkey!inner(
  assessments:assessments!assessments_client_id_fkey(clearance_status, created_at)
)
```
order embedded assessments with `.order('created_at', { referencedTable: 'client.assessments', ascending: false })`, then apply the "latest assessment wins" check in JS on the returned set (one round-trip). A client can have multiple assessment rows, so always pick the newest, not any match.

**Why:** the obvious single-query inner-join the schema seems to invite does not exist; this cost a full round of debugging during the H2 clearance-filter work.
**How to apply:** reuse `clientLatestAssessmentApproved` in supabaseService.ts for any new trainer-facing query that must hide unapproved clients.
