---
name: generatedocumentation
description: "Generate initial documentation set under `/docs` from project metadata."
---

# generateDocumentation Skill

## Purpose
Generate initial documentation set under `/docs` from project metadata.

## Required Inputs
- `project.json`
- Architecture summary

## Outputs
- Populated docs skeleton in architecture/analysis/planning/testing/changelog

## Constraints
- Markdown only, English only, deterministic output.

## Example
Input: full-stack project manifest. Output: full docs baseline with roadmap and test plan.
