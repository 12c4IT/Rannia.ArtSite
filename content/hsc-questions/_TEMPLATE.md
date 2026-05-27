---
# ═══════════════════════════════════════════════════════════════════════════
# HSC QUESTION TEMPLATE
#
# Copy to src/content/questions/hsc-YYYY-sX-qN.md
# Question text MUST be transcribed verbatim from the NESA past paper.
# No paraphrasing. No silent corrections.
# ═══════════════════════════════════════════════════════════════════════════

id: hsc-YYYY-sX-qN              # e.g. hsc-2019-s2-q9

year: 2019                       # HSC paper year

paper: visual-arts

section: II                      # I (short answer) or II (extended response)

questionNumber: "9"              # string, allows '9(a)' etc.

marks: 25

# ─── Question text: VERBATIM from the NESA past paper ───
text: |
  [Paste the question text exactly as it appears in the NESA paper.
   Preserve line breaks, dot points, capitalisation, punctuation.
   Do not silently correct typos — NESA's text is the text.]

# ─── Stimulus / Plate ───
stimulus:
  hasPlate: false
  plateDescription: ""          # only if hasPlate is true
  # plateImage: {...}           # only if rights allow direct reproduction

# ─── Tags ───
frames:                          # which frames the question rewards
  - cultural
contentAreas:
  - identity

questionType: extended-response  # short-answer | extended-response | plate-based-short | plate-based-extended

# ─── Scaffold (our educational content; not NESA's) ───
scaffold:
  decode: |
    [Unpack the question.
     - Verbs: identify each directive verb and what it asks for
       ('analyse' = break into parts and show how they relate;
        'evaluate' = make a judgement with criteria;
        'explain' = make clear, give reasons;
        'discuss' = present points for and against;
        'to what extent...' = signals the answer should not be all-or-nothing)
     - Key terms: define any specialised terms in plain English
     - Scope: what is in and out of scope]

  plan: |
    [Paragraph-by-paragraph structure students could use.
     - Intro: thesis statement, frame nominated, case studies named
     - Body 1: ...
     - Body 2: ...
     - Body 3: ...
     - Conclusion: return to thesis]

  sentenceStems:
    - "The cultural frame reveals that..."
    - "By recontextualising X within Y, the artist..."
    - "The audience's reception of this work was shaped by..."
    - "In contrast to [other work], this work foregrounds..."

  markersView: |
    [What earns marks at each band, paraphrased from NESA marking guidelines
     where available — link to the marking guideline in `source.url` if it's
     a separate PDF.
     - Band 6: sustained argument, integrated frames, precise vocabulary,
               substantial case study evidence
     - Band 5: clear argument, mostly integrated frames, good vocabulary
     - Band 4: argument present but uneven, frames named but not always integrated
     - Band 3 and below: ...]

  exemplarStructure: |
    [A paragraph-by-paragraph outline of a strong response — NOT a full
     exemplar essay (that's the student's job to write), but the skeleton
     a Band 6 response might use, with case studies named.]

# ─── Linked case studies (anchors for student responses) ───
linkedCaseStudySlugs:
  - "[case-study-slug-1]"
  - "[case-study-slug-2]"

source:
  url: "https://educationstandards.nsw.edu.au/.../visual-arts-YYYY.pdf"
  type: nesa-paper

status: draft
lastReviewed: 2026-05-17
reviewedBy: "[Reviewer name]"
---

<!--
Optional Markdown body for additional context, common pitfalls,
or further reading. The frontmatter scaffold object carries the
structured content; this body is freeform supplementary.
-->
