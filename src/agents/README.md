Agents folder

- `agentA/` — requirement extractor (PDF -> requirement JSON)
- `agentB/` — code generator (requirement JSON -> Playwright test files)
- `agentC/` — QA agent (verifies tests and requests targeted repairs)

Each agent should expose a simple programmatic interface and be orchestrated by the chosen agent framework (LangGraph or ADK).