# diagram-first

English | [台灣中文](README.zh-tw.md)

> A picture is worth a thousand words. When an agent explains a flow, an architecture, a state machine or a call sequence, it adds a diagram so you understand faster.

`diagram-first` is an [Agent Skill](https://agentskills.io). Whenever an explanation involves multiple steps, branches, component relationships, state transitions, call order, timelines or data comparisons, the agent attaches a diagram on its own, without being asked. It is also used when you explicitly ask for a flowchart, an architecture diagram or a sequence diagram.

> This is a personal project. It is not an official Anthropic project.

The skill's instructions are written in Traditional Chinese (Taiwan). Diagram labels follow the language you are using.

## Three output paths

```text
              +---------------------+
              | Need a diagram? [1] |
              +---------------------+
                         |
          +--------------+--------------+
          |                             |
          v                             v
 +-----------------+           +-----------------+
 |  Chat     [2]   |           |  Document  [3]  |
 +-----------------+           +-----------------+
     |         |                        |
     v         v                        v
 +-------+ +-------+           +-----------------+
 | ASCII | | HTML  |           | Mermaid block   |
 +-------+ +-------+           +-----------------+
```

Legend: [1] decide whether a diagram helps; [2] explaining in the chat, ASCII or HTML depending on complexity; [3] writing into a README, ADR, design doc and so on.

| Path | When | Output |
|---|---|---|
| **ASCII** | Simple diagrams in the chat: at most 5 nodes, at most 3 exits per branch, no crossing lines, no loops back, one direction | A `text` code block in the chat, with a legend |
| **HTML** | Diagrams in the chat that exceed the ASCII limits | A local HTML file rendered with Mermaid 12.1.0 (ELK layout), opened in the browser. Readers can switch between light and dark mode and choose a Mermaid theme (default: `redux-color` / `redux-dark-color`). Without a local file system it falls back to an Artifact, a sent file, or a Mermaid code block |
| **Doc** | Writing or updating a document | An embedded Mermaid code block using stable diagram types only, plus an ASCII fallback when the target platform needs one |

No diagram is added when the answer is a sentence or two, when a diagram carries no more information than the text, when the same diagram was already drawn in the conversation, or when you say you do not want diagrams.

## Installation

### Claude Code (plugin marketplace)

```text
/plugin marketplace add puckwang/puck-agent-skills
/plugin install diagram-first@puck-agent-skills
```

To update, run `/plugin update diagram-first@puck-agent-skills`. See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

### claude.ai

1. Download the source from [Releases](https://github.com/puckwang/diagram-first-skill/releases), or clone this repo.
2. Zip the `skills/diagram-first/` folder as `diagram-first.zip`. The top level of the zip must be the `diagram-first/` folder.
3. Upload the zip on the Skills settings page in claude.ai.

### Manual

```bash
git clone https://github.com/puckwang/diagram-first-skill.git
cp -r diagram-first-skill/skills/diagram-first ~/.claude/skills/
```

To use it in a single project only, copy it into that project's `.claude/skills/` instead.

## Layout

```text
skills/diagram-first/
+-- SKILL.md                  Entry point: triggers, routing, output flow
+-- references/
|   +-- routing.md            Output target, delivery environment, complexity limits, splitting
|   +-- ascii-spec.md         ASCII rules, templates, self-check
|   +-- mermaid-guide.md      28 diagram types, general rules, examples, troubleshooting
|   `-- doc-embedding.md      Document platforms, ASCII fallback rules
`-- templates/
    +-- diagram.html          HTML template (Mermaid 12.1.0)
    `-- doc-section.md        Document embedding template
```

The repository root also holds `.claude-plugin/plugin.json`, the plugin manifest used for marketplace installs. Its `version` matches the release tag and the latest entry in [CHANGELOG.md](CHANGELOG.md).

The skill contains no scripts. The only command the agent runs is opening the browser to show the HTML.

## Known limitations

- **sankey node names must be ASCII**: the Mermaid 12.1.0 sankey parser rejects non-ASCII text such as Chinese, even in quotes. The skill uses English node names with a legend, or switches to a `flowchart`.
- **Document platforms ship their own Mermaid version**: GitHub, GitLab and similar platforms often bundle an older Mermaid that may not support the ELK layout or beta diagram types. Without ELK the default layout is used silently, so the result can look different. For this reason the Doc path uses stable diagram types only.
- **HTML needs a network connection**: the HTML file loads Mermaid from the jsDelivr CDN and cannot render offline.
- **The agent cannot see the rendered result**: if an error or warning appears at the top of the HTML page, report it back to the agent.

## License

[MIT](LICENSE)
