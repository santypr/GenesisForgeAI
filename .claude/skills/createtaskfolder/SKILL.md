---
name: createtaskfolder
description: "Create `/docs/tasks/<task-id>/` with required tracking files."
---

# createTaskFolder Skill

## Purpose
Create `/docs/tasks/<task-id>/` with required tracking files.

## Required Inputs
- `task-id`
- User request summary

## Outputs
- `status.md`, `reasoning.md`, `user-input.md`, `output.md`

## Constraints
- Do not overwrite existing content unless explicitly requested.

## Example
Input: `task-42`. Output: new task folder scaffold with initialized sections.
