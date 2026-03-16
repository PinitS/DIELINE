# Dieline Progress Table Prompt

Use this prompt when you want AI to leave a short progress record that makes it easy to resume later.

## Goal

Track how far the dieline task has progressed without mixing status notes into the final component output.

## Prompt

Create a compact markdown progress table for the current dieline task.

The table must include these rows:

- Image confirmed
- Box type identified
- Panel mapping drafted
- Critical parts verified
- JSON spec completed
- Component generated
- Verification completed

Use these columns:

| Step | Status | Notes | Blockers |

Rules:

1. Keep notes short and concrete.
2. Mark uncertainty explicitly.
3. If blocked, say exactly what input is missing.
4. Mention the selected image filename or path when known.
5. Mention whether the JSON/spec is good enough to resume from later.
6. Return **ONLY** the markdown table.

## Recommendation

If the task may pause or continue across sessions, update the JSON/spec first and then update this progress table.

