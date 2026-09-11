# Phi Second Brain — Project Context

## 0. Document Purpose

This file is the shared source of truth for ChatGPT, Codex, Claude, and any other AI used on this project.

Use this document to understand:
- why the product exists
- who it is for
- how the journaling system currently works
- what the MVP should do
- how the system should evolve into a multi-agent second brain
- which product decisions have already been made

When implementation decisions change, update this file so every AI works from the same context.

---

# 1. Project Summary

## Working Title

**Phi Second Brain**

## One-line Definition

A learning second-brain system that turns daily journaling into course-specific memory, connects insights over time, and eventually develops into specialized AI agents that understand how the user learns.

## Core Product Statement

> **저널은 무엇을 배웠는지 기록하고, 에이전트는 내가 어떻게 배우는지를 기억한다.**

English:

> **Your journal records what you learned. Your agents remember how you learn.**

---

# 2. Background

The user currently attends **Phi Design Institute** and studies 12 subjects.

Current courses:

1. Iterative Problem Solving
2. Beautiful Interface
3. Visual Translation
4. Interviewing as Exploration
5. Art of Reading
6. Engaging with AI
7. Aesthetic Literacy
8. Typography as Foundation
9. Self Introduction
10. What If
11. Peer Coaching
12. Readable Writing

The user submits a daily integrated journal through Discord.

The journal may contain content from multiple classes in one entry.

Example structure:

- BI
- AOR
- SI
- General
- Future Item

The journal is currently accumulated vertically by date.

This makes it easy to review one day, but difficult to understand:

- what has been learned in one specific course over time
- what insights are repeating
- how the user's thinking is changing
- what action items were written but never executed
- where ideas from different courses overlap
- how learning is affecting actual project work

---

# 3. Core Problem

The current journal structure is:

```text
Date
 ├─ Course A notes
 ├─ Course B notes
 ├─ Course C notes
 └─ Future Items
```

This is useful for daily reflection but weak for long-term learning retrieval.

The desired structure must support both:

```text
Date → Journal
```

and

```text
Course → Accumulated Learning
```

without forcing the user to write the same content twice.

## Core UX Principle

**The user should continue writing one integrated journal as they do today.**

The system should do the reorganization automatically.

Do not require users to:

- open 12 different course pages before journaling
- manually duplicate notes
- manually tag every sentence
- rewrite existing journaling habits to fit the tool

The product should reduce organizational work, not create more.

---

# 4. Purpose of Journaling

The journal is not only a record of what happened.

Its goals are:

1. Discover new facts and insights
2. Apply learning to life and actual work
3. Convert learning into concrete action
4. Increase cognitive energy
5. Encourage an active learning attitude
6. Strengthen metacognition
7. Help the user make learning their own

---

# 5. 4F Journaling Framework

The existing Phi journaling method is based on four layers.

## Fact

**What happened / what did I learn?**

Raw information, class content, examples, methods, observations.

Examples:
- a teacher demonstrated their problem-solving process
- a class discussed a specific framework
- a critique session revealed a new design method

Role in the product:

**Knowledge layer**

---

## Feeling

**What stayed with me strongly?**

Memorable, surprising, uncomfortable, exciting, or emotionally strong learning.

This indicates what the user personally found meaningful.

Role in the product:

**Personal significance layer**

---

## Finding

**What did I newly understand?**

The user's own interpretation, insight, realization, or newly formed principle.

This is more valuable than a simple class summary because it represents internalized knowledge.

Role in the product:

**Personal knowledge / insight layer**

---

## Future Item

**What will I actually do next?**

Concrete, executable actions derived from learning.

Examples:

- create a hypothesis before looking at references
- apply a specific UI component in the next project
- organize today's notes into an action item
- test a new method in next week's assignment

Role in the product:

**Action layer**

---

## 4F as a Learning Transformation

The product should treat 4F not merely as four tags but as a learning process.

```text
Fact
  ↓
Feeling
  ↓
Finding
  ↓
Future
```

Or:

```text
Information
  ↓
Importance
  ↓
Interpretation
  ↓
Action
```

This transformation can become one of the core conceptual frameworks of the product.

---

# 6. Product Vision

The system should evolve through three phases.

---

# Phase 1 — Journal Organizer

## Goal

Solve the immediate organizational problem.

## User Experience

The user writes one journal as usual.

Example:

```text
Fact

BI 수업을 들었다.
영준님이 자신의 사고 과정을 도식화해서 보여주셨다.

AOR 수업에서는 사전과제로 작성한 내용을 디벨롭했다.

Feeling

BI에서 전문가의 사고 과정이 나와 크게 다르지 않았지만
훨씬 구조적이라는 점이 인상적이었다.

Finding

사고의 결과보다 사고 과정을 가시화하는 습관이 중요하다.

Future Item

다음 프로젝트에서는 레퍼런스를 찾기 전에
내 가설을 먼저 작성한다.
```

The AI automatically processes it.

## Processing Pipeline

```text
Journal Input
      ↓
Semantic Fragmentation
      ↓
Course Classification
      ↓
4F Classification
      ↓
Insight Extraction
      ↓
Course Archive
```

### 1. Semantic Fragmentation

Break a journal entry into meaningful units.

Do not rely only on paragraph boundaries.

One paragraph may contain multiple learnings.

---

### 2. Course Classification

Determine which of the 12 courses each fragment belongs to.

Possible output:

```json
{
  "course": "Beautiful Interface",
  "confidence": 0.92
}
```

A fragment may belong to:

- one course
- multiple courses
- General / Unclassified

Users should be able to correct classification with minimal friction.

Example:

```text
BI → AOR
```

---

### 3. 4F Classification

Classify each fragment into:

```text
Fact
Feeling
Finding
Future Item
```

A fragment may contain more than one type when necessary.

---

### 4. Insight Extraction

Extract:

- important concepts
- personal insight
- action item
- repeated theme
- referenced method
- people / project / assignment if relevant

---

### 5. Archive

Store the fragment under the relevant course memory.

The result should transform:

```text
One daily journal
```

into:

```text
12 evolving course archives
```

without requiring additional writing from the user.

---

# Phase 2 — Course Agent

## Goal

Move from archive to active learning memory.

Each course becomes a specialized AI context.

Examples:

- Beautiful Interface Agent
- Art of Reading Agent
- Self Introduction Agent
- Visual Translation Agent

The first version does **not** need 12 separate LLMs.

Recommended architecture:

```text
One LLM
+
12 separate course contexts
+
12 separate memory spaces
```

From the user's perspective these can still appear as 12 distinct agents.

---

## Course Agent Responsibilities

Each Course Agent should:

1. detect relevant journal content
2. store course-specific memory
3. connect new learning to past learning
4. identify recurring concepts
5. identify contradictions or changes in thinking
6. track Future Items
7. surface unresolved actions
8. show progress over time
9. reference the user's previous assignments and work
10. ask useful reflective questions
11. help the user apply learning to actual projects

---

## Example Course Agent Context

```text
Agent:
Beautiful Interface

Purpose:
Help the user accumulate, connect, and apply learning from
the Beautiful Interface course.

Memory:
- previous BI journals
- BI assignments
- BI course materials
- user work
- teacher feedback
- extracted Findings
- Future Items

Responsibilities:
1. detect BI-related journal fragments
2. connect new learning to past learning
3. identify repeated learning patterns
4. track changes in the user's judgment
5. convert learning into actionable behaviors
6. retrieve relevant past insight at the right moment
```

---

# 7. Memory Expansion

At first, an agent only knows journals.

```text
Course Agent
   ↓
Journals
```

Later:

```text
Course Agent
   ↓
Journals
Assignments
```

Then:

```text
Course Agent
   ↓
Journals
Assignments
Figma Work
Images
Presentations
```

Eventually:

```text
Course Agent
   ↓
My Journals
My Work
Class Materials
Teacher Feedback
References
Assignments
Critiques
```

The important distinction is:

The product should not become a generic expert AI.

It should become:

> **an AI that understands how I personally learned this subject.**

---

# 8. Course Agent Output

A course page should not be just a folder of dated notes.

Example:

## Beautiful Interface

### What I Learned

- 사고 결과보다 사고 과정의 구조화가 중요하다.
- UI 컴포넌트보다 판단 기준을 먼저 정의해야 한다.
- 레퍼런스는 답을 찾는 도구가 아니라 가설을 검증하는 도구다.

### Recurring Insights

```text
가설
 ↓
탐색
 ↓
판단
```

This pattern has appeared repeatedly across recent journals.

### Growth

Earlier thinking:

> 좋은 UI 사례를 많이 찾는 것이 중요하다.

Later thinking:

> 좋은 UI를 선택할 수 있는 판단 기준을 만드는 것이 중요하다.

Potential system interpretation:

```text
Visual Observation
        ↓
Structured Judgment
```

---

# 9. Future Item System

Future Item should be treated differently from normal notes.

It is not just information.

It represents a commitment to apply learning.

Example:

```text
다음 BI 과제에서는
레퍼런스를 보기 전에 내 가설부터 작성해보기.
```

The system should remember this and surface it when useful.

Example:

```text
지난 BI 저널에서
"레퍼런스를 보기 전에 가설을 세운다"고 기록했습니다.

이번 과제에서 적용해볼까요?
```

Possible states:

```text
Created
Scheduled
In Progress
Applied
Skipped
Expired
Needs Review
```

Future versions may connect Future Items to:

- assignments
- deadlines
- project files
- calendar
- task systems

---

# 10. Phase 3 — Second Brain / Agent Village

## Goal

Connect the 12 Course Agents.

Instead of each agent existing independently, they begin exchanging relevant patterns.

Example:

### BI Agent

> The user is learning to define a hypothesis before searching for references.

### AOR Agent

> The user is also learning to define a viewpoint before interpreting a text.

### Meta Insight

> Multiple courses are reinforcing the same underlying capability:
> defining a position before exploration.

This allows the system to discover learning that exists across course boundaries.

---

# 11. Meta Agent / Phi Brain

A higher-level agent can sit above the 12 course agents.

Possible naming:

- Phi Brain
- Meta Agent
- Learning Agent
- Second Brain

Architecture:

```text
                    Phi Brain
                        │
        ─────────────────────────────
        │       │       │          │
       BI      AOR      SI        ...
        │       │       │
      Memory  Memory  Memory
```

Its role is not to summarize classes.

Its role is to answer questions such as:

- What kind of designer am I becoming?
- What abilities are improving across multiple classes?
- What themes keep appearing?
- Where are my biggest gaps?
- Which Future Items repeatedly fail to become action?
- Which class concepts connect with each other?
- How has my decision-making changed?
- What do I repeatedly find meaningful?
- How is my learning style changing?

---

# 12. Difference from a Normal Note App

Traditional second brain:

```text
Capture
   ↓
Organize
   ↓
Retrieve
```

Phi Second Brain:

```text
Capture
   ↓
Understand
   ↓
Classify
   ↓
Connect
   ↓
Reflect
   ↓
Suggest
   ↓
Act
```

The system should not stop at storing knowledge.

It should help transform knowledge into behavior.

---

# 13. Relationship to Generative Agents / Agent Village

A conceptual inspiration is the Stanford Generative Agents research.

Simplified Generative Agent loop:

```text
Experience
   ↓
Memory
   ↓
Retrieval
   ↓
Reflection
   ↓
Planning
   ↓
Action
```

For this project:

```text
Learning
   ↓
Memory
   ↓
Connection
   ↓
Reflection
   ↓
Insight
   ↓
Action
```

The original Agent Village asks:

> What happens when AI agents with memory coexist and interact?

Phi Second Brain reframes this as:

> What happens when specialized learning agents remember different parts of my learning and connect them together?

---

# 14. MVP Scope

The first MVP should remain intentionally small.

## Must Have

- journal input
- save raw journal
- semantic chunking
- 12-course classification
- 4F classification
- user correction of classification
- course-specific archive
- date-based original journal view
- course-based accumulated view
- basic extracted Finding view
- basic Future Item extraction

## Nice to Have

- AI-generated course summary
- recurring insight detection
- search
- tags
- confidence display
- General / Unclassified inbox

## Not Required for MVP

- 12 independently running LLM agents
- autonomous agent-to-agent conversation
- Figma integration
- Discord automation
- calendar integration
- vector knowledge graph visualization
- real-time swarm behavior
- autonomous task execution
- complex recommendation engine

Avoid overbuilding the first version.

---

# 15. Suggested MVP Screens

## 1. Home / Journal

Primary input.

```text
How was your day at Phi?

[ Journal Editor ]

[ Analyze Journal ]
```

Optional:

```text
Today
Recent Journals
Pending Future Items
```

---

## 2. Analysis Review

Before saving extracted data:

```text
Fragment 01

"영준님이 자신의 사고과정을 도식화해서 보여주셨다."

Course
[ Beautiful Interface ]

4F
[ Fact ]

Confidence
92%

[ Edit ]
```

The user can quickly correct AI mistakes.

---

## 3. Courses

```text
Beautiful Interface
Art of Reading
Visual Translation
...
```

Each course shows:

- number of journal fragments
- recent Finding
- unresolved Future Items
- recent learning themes

---

## 4. Course Detail

Recommended sections:

```text
Overview
Journal
Findings
Future Items
Growth
Files
Agent
```

For MVP, only some sections need to be implemented.

---

## 5. Future Items

Cross-course action dashboard.

Example:

```text
BI
□ 레퍼런스 보기 전에 가설 작성

AOR
□ 이번 글에서 관점을 먼저 정의

SI
□ 60분 제한을 두고 탐색 진행
```

---

# 16. Suggested Core Data Model

This can evolve, but the MVP should roughly support the following.

## User

```text
id
name
created_at
```

## Course

```text
id
name
short_name
description
agent_instruction
```

## Journal

```text
id
user_id
date
raw_text
created_at
updated_at
```

## JournalFragment

```text
id
journal_id
raw_text
summary
start_position
end_position
created_at
```

## FragmentCourse

Supports one fragment belonging to multiple courses.

```text
fragment_id
course_id
confidence
source
user_corrected
```

## FourFClassification

```text
fragment_id
type
confidence
```

Possible type:

```text
fact
feeling
finding
future
```

## Insight

```text
id
course_id
journal_fragment_id
title
content
importance
created_at
```

## FutureItem

```text
id
course_id
journal_fragment_id
content
status
due_date
applied_at
created_at
```

## Memory

For later agent architecture.

```text
id
course_id
source_type
source_id
content
embedding
importance
created_at
```

---

# 17. AI Output Contract

For the MVP, journal processing should return structured output.

Example:

```json
{
  "journal_summary": "오늘은 BI와 AOR 수업을 중심으로 사고 과정의 구조화에 대한 학습이 있었다.",
  "fragments": [
    {
      "text": "영준님이 자신의 사고 과정을 도식화해서 보여주셨다.",
      "courses": [
        {
          "name": "Beautiful Interface",
          "confidence": 0.94
        }
      ],
      "four_f": [
        {
          "type": "fact",
          "confidence": 0.98
        }
      ],
      "insight": null,
      "future_item": null
    },
    {
      "text": "사고의 결과보다 사고 과정을 가시화하는 습관이 중요하다.",
      "courses": [
        {
          "name": "Beautiful Interface",
          "confidence": 0.89
        }
      ],
      "four_f": [
        {
          "type": "finding",
          "confidence": 0.96
        }
      ],
      "insight": "사고 과정을 외부화하면 판단 기준을 더 명확하게 만들 수 있다.",
      "future_item": null
    }
  ]
}
```

The user should be able to correct this output before or after saving.

---

# 18. Product Principles

## 1. Write Once

Users should not duplicate notes.

## 2. Preserve the Original

Never destroy or replace the raw journal.

AI output should remain traceable to source text.

## 3. AI Organizes, User Owns Meaning

AI may classify and suggest, but users should easily correct it.

## 4. Learning Over Storage

The goal is not to create a larger archive.

The goal is to improve learning.

## 5. Action Matters

A Finding that never changes behavior is incomplete.

Future Items should remain visible.

## 6. Longitudinal Value

The product should become more useful after:

- one week
- one month
- one semester

not merely after one journal entry.

## 7. Personal Context Over Generic Expertise

The long-term value comes from knowing:

- what the user learned
- how they interpreted it
- how their thinking changed
- what they actually applied

---

# 19. Open Questions

These have not yet been fully decided.

### Journal Input

- Should users paste journals manually?
- Should Discord ingestion eventually be automated?
- Should markdown formatting be preserved?

### Classification

- Can one fragment belong to multiple courses?
- How should General content be handled?
- Should course abbreviations such as BI / AOR be used as explicit hints?

### Future Items

- Should the user manually mark an item as complete?
- Can the system infer completion from later journals?
- When should old Future Items resurface?

### Agent Memory

- What should be permanent memory?
- What should be temporary?
- What should be summarized?
- How should contradictory learnings be represented?

### Files

Future versions may ingest:

- Figma exports
- PDFs
- slides
- screenshots
- assignment briefs
- teacher feedback
- references
- course materials

### Agent Communication

- Should Course Agents directly communicate?
- Or should Phi Brain perform all cross-course synthesis?
- How visible should agent-to-agent reasoning be to users?

---

# 20. Recommended Development Order

## Step 1

Build basic journal creation and storage.

## Step 2

Implement AI semantic fragmentation.

## Step 3

Implement course + 4F classification.

## Step 4

Create correction UI.

## Step 5

Create course archive pages.

## Step 6

Extract Findings and Future Items.

## Step 7

Create Future Item dashboard.

## Step 8

Add course-level summaries and recurring insights.

## Step 9

Introduce Course Agent chat / reflection.

## Step 10

Add cross-course Phi Brain.

---

# 21. AI Collaboration Rules

When ChatGPT, Claude, Codex, or another AI works on this project:

1. Read this file first.
2. Do not redefine the project without explaining why.
3. Preserve the existing 4F framework.
4. Prioritize Phase 1 before building autonomous multi-agent features.
5. Keep the existing journaling habit intact.
6. Prefer simple architecture before agent complexity.
7. Treat AI classification as editable, not absolute.
8. Preserve the original user-written journal.
9. Design for accumulated learning over time.
10. When making a new major product decision, record it in this file.

---

# 22. Current Decisions

Confirmed so far:

- The project is a learning second-brain tool.
- The immediate problem is organizing integrated daily journals by course.
- Users continue writing one journal.
- AI performs semantic fragmentation and course classification.
- The 4F framework is retained.
- The first version focuses on organization and archive.
- The second version evolves each course into a specialized Course Agent.
- The long-term system connects Course Agents through a Meta Agent / Phi Brain.
- The initial architecture should prefer one LLM with separate course memories over 12 separate LLMs.
- Future Item is a core product object, not merely a note tag.
- Journals, work, assignments, materials, and feedback may eventually become agent memory.
- The final goal is to reveal how the user's thinking and capabilities evolve.

---

# 23. North Star

The product succeeds when the user can ask:

> **"나는 이번 학기에 무엇을 배웠지?"**

and receive more than a summary.

The system should be able to answer:

> **"당신의 사고방식은 이렇게 변화했고, 이 변화는 이 수업들과 작업들에서 반복적으로 나타났으며, 아직 행동으로 옮기지 못한 부분은 이것입니다."**

That is the difference between a journal archive and a true learning second brain.
