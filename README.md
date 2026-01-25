<div align="center">
    <img src="images/logo_transparent.png" width="200" alt="drift"/><br>
    <h1><b>drift</b></h1><br>
    <h3>The developer framework for detecting behavior drift in AI agents</h3>
    <p>Drift helps teams compare, evaluate, and safely upgrade AI agents</p>
    <p>Think <i>git diff + CI</i> &mdash; but for agent behavior and impact</p>
</div><br><br>

## License
Drift is source-available under the Business Source License (BSL).
Commercial use requires explicit permission from the author.

## Why
AI Agents are writing code, modifying repositories, running tools, helping to plan, making architectural decisions, testing and iterating, etc.

But today, there doesn't seem to be a standard way to answer the most important question:
> "Is this new version of my agent actually better than the last?"

Organizations and individuals today are developing new agents, training new models, building new agentic tools, modifying prompts, tweaking hyperparameters, adding markdown files to provide context and instructions in hopes they can guide behavior and drive certain outcomes.

Teams can see _**what**_ an agent did...

but have no real insight into if there was an improvment over the last configuration/iteration.

Drift exists to close that gap.
<br><br>

## What
Drift implements two key functionalities:
1. **Agent Behavior Diffing**<br><br>
Drift compares two agent runs and tells you how the agent's behavior changed:
   - Models used (and hyperparameters)
   - Prompts and system instructions
   - Planning steps
   - Tool usage (including per-tool call deltas)
   - Final outcome (success/failure)
     
2. **Result Evaluation**<br><br>
Drift compares the actual effects of those two runs:
      - Git diff of code changes
      - File-level and line-level changes
      - Human scoring of improvement vs regression
      - Optional HTML artifact for review

  This aims to give you:
  > Behavior diff &mdash; Did the agent behave differently? <br>
  > Results eval &mdash; Did the agent improve the system?

<br>

## Examples
**Capture two agent runs**
```bash
drift capture \
  --agent opencode \
  --message "Fix the failing tests" \
  --model openai/gpt-4.1 \
  --out opencode-gpt4.1.json

drift capture \
  --agent opencode \
  --message "Fix the failing tests" \
  --model anthropic/claude-3.5-sonnet \
  --out opencode-sonnet3.5.json
```

**Diff the agent behavior**
```bash
drift diff opencode-gpt4.1.json opencode-sonnet3.5.json
```

**Output**
```bash
╭─ Agent Trace Diff ─────────────────────────────────────╮
│ A: run-2026-01-24-a                                    │
│ B: run-2026-01-24-b                                    │
╰────────────────────────────────────────────────────────╯

MODEL
  ~ Model changed
    provider: anthropic → openai
    model: claude-3.5-sonnet → gpt-4.1
    temperature: 0.2 → 0.7

PROMPTS
  + Added:   1
  - Removed: 1
  = Same:    2

PLANNING
  + Steps added:   0
  - Steps removed: 1
  = Unchanged:     2
  Similarity:      0.67

TOOLS
  Calls: 5 → 9
  + Added tools:   search_repo
  = Tool set unchanged
  Deltas (top 3):
    search_repo: 0 → 4 (+4)
    read_file:   3 → 2 (-1)
    write_file:  2 → 3 (+1)

OUTCOME
  ✗ Changed
    success → failure
    reason: "All tests passing" → "Lint errors in auth module"
    source: "process_exit" → "process_exit"
```

**Evaluate Actual Effects** 🚧 Under Construction 🚧
```bash
drift eval \
  --baseline ./repo_before \
  --candidate ./repo_after \
  --trace-a run-a.json \
  --trace-b run-b.json \
  --out report.html
```
**Open HTML Report** 🚧 Under Construction 🚧<br>
- agent diff
- git diff
- manual eval - score the result fo historical archive:
    - much worse -> much better
    - would you ship this?
 
<br>

## Architecture (High Level)
```
Agent Run A  ─┐
              ├─> AgentTrace ─┐
Agent Run B  ─┘               │
                              ├─> TraceDiff
Code Before ────────────────┐ │
                             ├─> ResultEvaluation ──> HTML / JSON / CI
Code After  ────────────────┘ │
```

<br>

## Roadmap
**Features**
| Feature | Implmented | Status |
|---|---|---|
| Agent trace capture | ✅ | Initial implementation complete |
| Deterministic diffing | ✅ | Initial implementation complete |
| CLI + JSON output | ✅ | MVP state complete |
| Snapshot + unit + golden tests | ✅ | Happy paths complete |
| OpenCode adapter | ✅ | Initial implementation complete |
| Additional agent adapters | ❌ | To-do |
| Historical regression datasets | ❌ | To-do |
| HTML reports | 👷 | In development |
| Git-based result diffing | ❌ | To-do |
| Human scoring loop | ❌ | To-do |
| CI gating for agent upgrades | ❌ | ??? |
| Session diffing (interactive agents) | ❌ | ??? |
| Internal reward modeling | ❌ | ??? |

<br>

## Supported Agent Adapters
| Agent | Implemented |
|---|---|
| OpenCode | ✅ | 
| ClaudeCode | ❌ |
| Gemini CLI | ❌ |
| Copilot Agent Mode | ❌ |
| Goose | ❌ |

**NOTE:** We are working on adapters for more agents as quickly as we can. If there are any others you like supported please open an issue and it can be discussed there.

<br>

## Why This Matters
As agents become more autonomous, teams need:
  - a way to detect regressions
  - a way to compare versions
  - a way to trust upgrades
  - a way to build internal benchmarks
    
Right now, none of that exists in a principled way.

<br>

## What Drift Is Built For
  - “Should we upgrade our agent?”
  - “Did this prompt change help or hurt?”
  - “Is GPT-4.1 actually better than Claude here?”
  - “Why did tool usage explode after this change?”
  - “Can we safely ship this agent to production?”

<br>

## What Drift Is Not
Drift is not trying to do:
  - Fully automatic scoring
  - LLM-based judging
  - One-size-fits-all metrics
  - Replacing human review

Drift is about making human judgment scalable and structured.

<br>

## Philosophy
Drift is built around a simple principle:
> AI agents should be upgraded like software: through comparison, not guesswork.
