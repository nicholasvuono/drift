<div align="center">
    <img src="images/logo_transparent.png" width="200" alt="drift"/><br>
    <h1><b>drift</b></h1><br>
    <h3>The developer framework for detecting behavior drift in AI agents</h3>
    <p>Drift helps teams compare, evaluate, and safely upgrade AI agents</p>
    <p>Think <i>git diff + E2E</i> &mdash; for agent behavior and impact</p>
</div><br><br>

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
Drift currently implements a few key functionalities:
- **Behvior Capturing**: capture the CLI behavior of an agent in an end to end capacity.
- **Agent Behavior Diffing**: compare two agent runs and understand how the behavior has changed.
- **Result Evaluation**: compares the actual effects of those two runs on a given codebase, file, directory, etc.

This aims to give you:
> Behavior diff &mdash; Did the agent behave differently? <br>
> Results eval &mdash; Did the agent improve the system?

<br>

## Getting Started

**MacOS / Linux**
1. Download the appropriate binary from the GitHub Releases page.
2. `chmod +x drift`
3. `sudo mv drift /usr/local/bin/`
4. `drift --help`

**Windows**
1. Download `drift-windows-x64.exe` from the GitHub Releases page.
2. (Recommended) Rename it to `drift.exe`.
3. Either:
   - double-click it, or
   - add the folder containing `drift.exe` to your `PATH`.
5. Verify in PowerShell:
   - `drift --help`

**Have an agent(s) downloaded**: OpenCode (recommended)

**NOTE:** We are expanding support for additional agents. A common output schema is planned to enable direct integration for new agents and to allow existing agents to contribute a lightweight adapter for their specific runtime.

That’s it. You can now run drift from anywhere.

<br>

## Example
**Capture agent A's behavior**
```
drift capture \
  --agent opencode \
  --message "Create a new text file that says 'hello world' at this location: ./hello_world.txt" \
  --model opencode/big-pickle \
  --out opencode-big-pickle.json
```

**Capture agent B's behavior**
```
drift capture \
  --agent opencode \
  --message "Create a new HTML file that prints 'hello world' in the console using a javascript function at this location: ./hello_world.html, then edit it to print 'peace' instead, and then delete it" \
  --model opencode/gpt-5-nano \
  --out opencode-gpt5-nano.json
```

**Diff the agent behaviors**
```
drift diff opencode-big-pickle.json opencode-gpt5-nano.json
```

**Output**
```
╭───────────────────────────────────────────────────────╮
│                                                       │
│                    🦋 drift                           │
│                                                       │
╰───────────────────────────────────────────────────────╯


── Agent Diff ───────────────────────────────────────────
A: big-pickle
B: gpt-5-nano
─────────────────────────────────────────────────────────

MODEL
  big-pickle → gpt-5-nano
  ~ Changed

PROMPTS
  big-pickle: Create a new text file that says 'hello world' at this location: ./hello_world.txt
  gpt-5-nano: Create a new HTML file that prints 'hello world' in the console using a javascript function at this …
  + Added:   1
  - Removed: 1
  = Same:    0

PLANNING
  big-pickle:
     - write: ./hello_world.txt
  gpt-5-nano:
     - write: ./hello_world.html
     - read: ./hello_world.html
     - edit: ./hello_world.html
     - read: ./hello_world.html
     - write: ./hello_world.html
     - read: ./hello_world.html
     - write: ./hello_world.html
     - read: ./hello_world.html
     - bash: rm "./hello_world.html" && echo Deleted || echo Delete failed
  + Steps added:   9
  - Steps removed: 1
  = Unchanged:     0
  Similarity:      0.31

TOOLS
  big-pickle (unique tools):
     - write
  gpt-5-nano (unique tools):
     - write
     - read
     - edit
     - bash
  Calls: 1 → 9
  + Added tools:   read, edit, bash

OUTCOME
  big-pickle: ✓ Successful (source: process_exit)
  gpt-5-nano: ✓ Successful (source: process_exit)
  Result: ✓ Unchanged
```

<br>

## Commands
| Command | Description |
|--------|-------------|
| `drift capture` | Run an agent and capture its behavior into a trace JSON file |
| `drift diff` | Compare two agent traces and highlight behavioral differences |
| `drift help` | Show help and usage information |
| `drift version` | Print the installed Drift version |

<br>

##Command Options
| Option | Description |
|--------|-------------|
| `--agent <name>` | Agent runtime to use (e.g. `opencode`) |
| `--model <provider/model>` | Model identifier passed to the agent |
| `--message "<prompt>"` | Prompt or task given to the agent |
| `--out <file>` | Output path for the captured trace (default: `trace.json`) |
| `--json` | Output diff results as JSON instead of formatted text |
| `-h, --help` | Show help for a command |
| `-v, --version` | Show Drift version |

<br>

## Design Principles

As AI agents become more autonomous, teams need a principled way to:
- detect behavior regressions
- compare versions and configurations
- trust upgrades before shipping
- build internal benchmarks

Drift is built to answer practical questions like:
- Should we upgrade this agent?
- Did this prompt change help or hurt?
- Is model A actually better than model B for this workflow?
- Why did tool usage change after this update?

Today, Drift focuses on **behavioral diffs and human-in-the-loop evaluation**.
It intentionally avoids opaque, one-size-fits-all scoring systems.

That said, Drift is designed to evolve toward **programmatic and JSON-based assertions**
where they make sense — enabling teams to:
- codify expected behaviors
- gate changes in CI
- mix automated checks with structured human review

The goal is not to replace human judgment, but to make it **repeatable, testable, and scalable**.

<br>

## Philosophy
Drift is built around a simple principle:
> AI agents should be upgraded like software: through comparison, not guesswork.

<br>

## Roadmap
Please refer to ROADMAP.md

## Contributions
Please refer to CONTRIBUTING.md
