# Machine frames — Quarto RevealJS

Copy `machine-frames.html` next to your `.qmd`, then:

```markdown
---
format:
  revealjs:
    width: 1152
    height: 768
---

## {background-iframe="machine-frames.html" background-interactive="true"}
```

- Self-contained, except three.js, which loads from esm.sh, so an internet connection is needed.
- The page scales itself to fit the slide at a fixed 3:2 ratio.
- `background-interactive` lets you use the mouse on it. RevealJS keyboard navigation stops working while a field has focus; click outside to resume.
