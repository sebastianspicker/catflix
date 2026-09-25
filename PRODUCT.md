# Catflix product principles

*For contributors of any discipline — design, writing, or development — who
need to apply Catflix's rules without a research background.*

## In brief

Catflix is a personal "streaming shelf" of five short, computer-animated
scenes for three household cats — Arri, Ozzy, and Mika — curated by one
person [PRODUCT, Intro]. It is built like a considered streaming product, not
a novelty pet gadget, and every rule in this document exists to keep one
promise: Catflix never claims more than the evidence shows about what cats
get out of watching it.

That promise rests on one distinction, explained in full below: a cat
**looking at**, **tracking**, or **pouncing on** something on screen shows
**attention**. It does not by itself show that the cat **prefers** it or that
watching improves the cat's **welfare**. If you write copy, design a screen,
or build a feature for Catflix, this document tells you what you may say,
what you must not say, and which rule to check before you ship a change.
Every rule below cites the study or studies behind it by **evidence ID**
(for example `VID-01`) — a short label used in the [research
review](docs/research/feline-perception.md) and the underlying [evidence
ledger](docs/research/evidence-ledger.csv), the spreadsheet of individual
studies. Follow the evidence ID back to that review whenever you need the
full reasoning; this document only summarizes it.

## Who it's for

One person curates a small household watchlist for three cats. That person
chooses the scenes, runs the viewing sessions, and writes the notes. Nothing
about a cat's response is inferred automatically on their behalf — Catflix
never guesses what a cat felt or wanted [PRODUCT, Who it's for].

## What it's for

Catflix treats a personally curated list of cat-directed videos as a
considered streaming destination, not a novelty pet product. Concretely, it
works when the owner can:

- filter the catalogue by theme, animal or subject, and motion;
- pick a programme to play;
- deliberately restart an earlier encounter (an *encounter* is one finite,
  timed viewing session); and
- control playback comfortably from a laptop or tablet.

[PRODUCT, What it's for]

## Voice and feel

Catflix's voice is **fashion-film, editorial, surreal** — knowing and
composed, with an occasional dry wink. The aim is for feline attention itself
to feel cinematic and important, the way a well-shot fashion film makes
clothing feel important.

It is deliberately **not** a cute pet-store brand: no paw-print wallpaper,
baby talk, or childish rainbow palettes. Small, static ink-line cat
illustrations may appear in owner-facing dividers and in empty or saved
states (for example, an empty watchlist) — but never inside an active
encounter, and never in a way that implies the cats have approved anything.
Avoid literally cloning Netflix's look. [PRODUCT, Voice and feel]

If you are writing copy or designing a screen and are unsure whether
something matches this voice, ask: does it treat the cat's attention as
worth taking seriously, without pretending to know how the cat feels?

## Design principles

These six principles define the product. They apply to visual design, motion
design, and copywriting alike:

1. **Treat every viewing choice as a premiere, not a content tile.** Make
   selecting a scene feel like an occasion, not a scroll through a grid.
2. **Make animal perception the visual subject.** Movement, contrast,
   peripheral interest, and patience should be visible in the design itself,
   not just described in copy.
3. **Use surrealism with precision.** One striking scene beats nonstop
   decoration — restraint is part of the effect.
4. **Stay confidently editorial while keeping every action immediately
   legible.** A composed voice must never make a control harder to find or
   understand.
5. **Respect the owner's space with a refined, collectible-feeling
   interface.**
6. **Keep curation human.** Arri, Ozzy, and Mika may "approve" a video in the
   editorial voice of a note, but they are never filters, accounts, or
   algorithmic profiles that drive the interface.

[PRODUCT, Design principles]

## The scientific boundary

Catflix's copy, curator notes, and every rule below keep four ideas
separate. These are plain-language versions of terms from the [research
review](docs/research/feline-perception.md):

- **Sensory capacity** — what a cat *can detect*: whether a cat's eyes or
  ears are physically capable of registering something (a color, a flicker
  rate, a quiet sound), regardless of whether the cat notices or cares.
- **Attention** — a cat looking, orienting toward, tracking, or approaching
  something. Attention is observable and countable.
- **Preference** — a **voluntary choice** between two or more available
  options, ideally shown more than once, with the cat free to leave. Simply
  watching something is not preference.
- **Welfare** — how the cat fares **beyond the moment**: whether the
  experience is positive, neutral, stressful, or physically risky over time.
  Welfare is not something a single viewing session can establish.

A cat looking, tracking, approaching, or pouncing at the screen may establish
**attention**. None of those actions alone establishes enjoyment, benefit,
safety, or a stable **preference** — and none of them alone establishes
**welfare**. Product copy and curator notes must preserve that distinction at
all times. [PRODUCT, The scientific boundary]

## Rules by area

Every rule below is written as what to **do**, what not to do (**don't**),
and **why**, with the evidence IDs that support it. Where a rule includes a
hedge such as "precautionary," "conservative," or "not a validated
feline-video scale," that hedge is load-bearing: it tells you the rule is a
careful design choice, not a proven fact, and you should not strengthen the
wording when you use it in copy or code.

### Curation

Curation is the editorial work of describing and organizing scenes before
they reach the player.

1. **Record full metadata for every scene.** Do: log subject class (what
   kind of animal or object appears), apparent object size at the intended
   viewing distance, brightness contrast and color contrast, motion,
   **occlusion** (moments where the subject passes behind something),
   background complexity, audio, **clip family** (which clips share a
   subject, background, motion, and sound — the source term is *novelty
   family*), session context, risk flags, and evidence confidence. Why: the
   complete field list is set out as a normative contract in the research
   review, and it is what makes later rules checkable. (`COL-05`, `COL-07`,
   `SPA-04`, `SPA-07`, `MOT-07`, `VID-01`)
2. **Choose legible scenes, not a "best" formula.** Do: prefer clear
   **figure-ground separation** (how distinctly the subject stands out from
   its background) and believable, coherent movement paths. Don't advertise
   a universal best color, speed, direction, or prey type. Why: how
   detectable something is changes with its size, the viewing distance,
   brightness, contrast, and the task — there is no single formula that
   works everywhere. (`COL-01` through `COL-08`; `SPA-03`, `SPA-04`,
   `SPA-07`)
3. **Describe motion as structured data, not a single intensity number.** Do:
   store speed, trajectory, intermittency (how steadily or irregularly
   something moves), direction changes, the edge a subject enters or exits
   from, and occlusion separately. Why: motion is a set of properties a
   curator can compare, not a dial to turn up. (`MOT-02`, `MOT-07`, `VID-01`
   through `VID-04`)
4. **Rotate clips instead of intensifying them.** Do: rotate clip families
   after a cat has seen them repeatedly. Don't escalate speed, sound, cut
   rate, or background density to win attention back. Why: this follows the
   evidence that response to a repeated stimulus declines over time
   (**habituation**) and that individual cats vary in what holds their
   interest. (`HUN-05`, `VID-01`)
5. **Keep evidence confidence and its type visible to editors.** Do: label
   what kind of evidence backs each claim — physiology supports *capacity*
   claims, orientation supports *attention* claims, a voluntary choice
   supports *preference* claims, and only a welfare outcome supports a
   *welfare* claim. Why: this is how the whole evidence ledger (every study,
   organized by ID) stays traceable to what it actually shows. (Entire
   ledger, especially `VID-01` through `VID-05` and `WEL-01` through
   `WEL-08`)
6. **Don't build features the evidence doesn't support.** Don't add breed
   modes, "feline-optimized" palette claims, ultrasonic tracks (sound above
   the range of human hearing), an exact universal refresh-rate requirement,
   or a ranking by maximum engagement. Why: no study in the ledger supports
   any of these. (`COL-01` through `COL-08`; `SPA-01`; `AUD-01`; `HUN-07`;
   `IND-02`)

### Playback

1. **Use clean, modern playback — but don't turn one lab number into a
   spec.** Do: use playback that is free of visible flicker, stuttering
   motion (**cadence errors** and **judder**), on the device actually being
   used. Don't treat the 40–55 Hz range from a three-cat laboratory flicker
   study as a required refresh rate for consumer screens. Why: that number
   describes the point where flicker stopped being visible to three trained
   cats under specific lab conditions — it depends on brightness, contrast,
   how strongly the image flickers, motion, and the panel itself, not on a
   single frame-rate figure. (`SPA-01`, `SPA-03` through `SPA-05`)
2. **Keep playback voluntary.** Don't ever instruct a person to hold, place,
   wake, lure, or repeatedly call a cat toward the screen. (`WEL-01` through
   `WEL-08`)
3. **Let a cat leave at any point.** Do: allow immediate pause and stop.
   Don't treat a cat disengaging (looking away, leaving) as a problem to fix
   — it is a valid outcome, and it must never trigger the scene automatically
   getting more intense or replaying. (`HUN-05`, `VID-01`)
4. **Avoid indefinite loops.** Do: expect and accept that repeated attention
   naturally declines. Don't build a fixed "habituation countdown" — no study
   establishes one. (`HUN-05`, `VID-01`)

### Audio

Catflix **synthesizes** each scene's sound locally in the browser, using the
Web Audio API (the browser's built-in sound-generation tool), at the moment
of playback. No recorded environmental sound is bundled with the app or
streamed from anywhere. The rules below govern that synthesized sound.

1. **Sound is optional and starts quiet.** Do: keep sound off by default, or
   at the quietest ordinary household volume, when playback starts. Why: no
   study in the ledger establishes a feline-safe volume for a product like
   this — this is a precautionary choice, not a measured safe level.
   (`AUD-01`, `WEL-05`, `WEL-06`)
2. **Prefer sound that matches what's on screen.** Do: use intermittent
   sound that seems to come from the thing being shown (**source-coherent**
   or **diegetic** sound) rather than continuous background noise. Do:
   record whether each sound is diegetic, ambient, musical, vocal,
   synthetic, or unknown, and whether the apparent on-screen source matches
   where the sound plays from. (`AUD-02` through `AUD-08`)
3. **No ultrasonic content.** Don't add sound above the range of human
   hearing (**ultrasonic** content). Why: that a cat can physically detect a
   high-frequency sound is not evidence that the cat prefers or benefits from
   it, and it does not establish that reproducing it is safe. (`AUD-01`,
   `AUD-02`)
4. **Orientation to sound is attention, not enjoyment.** A cat turning its
   ears or head toward a voice or sound shows attention. It is not proof of
   enjoyment. (`AUD-06`, `AUD-07`)

### Sessions

A *session* is one supervised viewing encounter.

1. **Keep sessions short, supervised, and voluntary — with no fixed length.**
   Do: default to short sessions. Don't publish a universal recommended
   duration. Why: the one direct shelter study used three-hour daily
   exposures, which cannot supply a household dose — it tells us nothing
   about how long a home session should be. (`VID-01`)
2. **Stop, don't restart.** Do: end the session and record it when a cat
   leaves. Do: separately record if the cat returns on its own
   (**re-engagement**). Don't restart playback just to regain the cat's
   attention. (`HUN-05`, `VID-01`)
3. **Watch for repeated screen strikes or searching behind the screen.** Do:
   stop, or offer an optional, safe physical play opportunity, if a cat
   repeatedly strikes the screen or searches behind it. Why this is
   **precautionary**: the literature does not prove that every sequence
   without a "catch" is frustrating for the cat, nor that physical play
   always resolves it — this is a careful default, not a proven fix.
   (`HUN-01`, `HUN-04`, `HUN-05`, `HUN-08`)
4. **Referee notes describe behavior; they never score it.** Arri, Ozzy, and
   Mika may each receive separate, dated **referee notes** — short,
   descriptive notes about one cat, tied to which clip version and what
   context. Don't turn these into scientific measurement, an automatic
   profile, a diagnosis, or a permanent preference score. (`HUN-06`,
   `HUN-07`, `IND-02`, `IND-03`)

### Safety

1. **Set up the room before playback, not after.** Do: require a stable
   television or tablet, protected cables, no sharp or breakable point the
   cat could strike, no risk of the device tipping or sliding, and a clear,
   unobstructed exit — before playback starts. Why this is **precautionary**:
   cats can make screen-directed reaches and strikes, and the evidence
   ledger contains no study of device-related injury to calibrate against.
   (`VID-01`, `VID-02`, `VID-04`)
2. **Stop immediately on any warning sign.** Do: stop right away after a
   collision with the screen, repeated hard screen strikes, marked startle,
   freezing, hiding, distressed vocalization, redirected aggression toward
   another animal or person, persistent searching behind the screen, loss of
   balance, or any behavior the observer considers abnormal. Why: this is a
   **conservative stop rule** — it is **not a validated feline-video scale**;
   it is a deliberately cautious list, not a scientifically calibrated one.
   (`VID-01`, `WEL-05`, `WEL-06`)
3. **Exclude or closely supervise risky content.** Don't allow, without
   active supervision, rapid flashing edits, unstable motion cadence, loud or
   startling sound onsets, sound that seems to come from the wrong place,
   loops where the subject repeatedly escapes off the edge of the screen, or
   sounds of another cat in distress. Why: this is a **conservative product
   constraint** — the literature supplies no feline clinical threshold for
   any of these features, so Catflix sets its own cautious limit. (`SPA-01`,
   `AUD-02`, `AUD-05`, `WEL-05`, `WEL-06`)
4. **Take extra care with vulnerable cats.** Do: use simpler, quieter
   content with active supervision for kittens, geriatric cats, and cats
   with visual, hearing, neurological, pain, anxiety, or cognitive concerns.
   Do: direct the owner to a veterinarian for any new or concerning
   behavioral change. Don't present Catflix as treatment or as a diagnostic
   tool — it is neither. (`IND-01`, `IND-04` through `IND-07`)

## Accessibility

Use strong visual contrast, semantic controls (interface elements that are
built and labeled as their true role — a button coded as a button, not a
styled `<div>`), visible keyboard focus, and support for
"reduce motion" operating-system settings. The high-motion editorial look is
an intentional default for most viewers, but an alternative with reduced
motion must always stay available for motion-sensitive users. [PRODUCT,
Accessibility]

## Limits of these rules

No rule in this document is labeled "strong" in the research review, because
none of the underlying evidence reaches that bar there. The strongest rules
here are either **high-confidence limits on what may be claimed** (for
example, that attention is not preference) or **moderate-confidence,
conditional design choices** (for example, preferring legible motion). Many
of the safety and session rules above are explicitly **precautionary** or
**conservative**: careful defaults chosen in the absence of direct evidence,
not conclusions the evidence proves. When a rule doesn't give you an exact
number — a session length, a volume, a refresh rate — that is deliberate:
no study behind Catflix supplies one, and this document does not invent one.
If you need the underlying reasoning for any rule, evidence ID, or hedge
above, read the corresponding section of the [research
review](docs/research/feline-perception.md).

## Glossary

- **Attention** — a cat looking at, orienting toward, tracking, or
  approaching something. Observable, but not proof of enjoyment.
- **Cadence errors / judder** — uneven, stuttering motion during playback.
- **Clip family** (source term: *novelty family*) — a group of clips that
  share a subject, background, motion, and sound, so they can be rotated as
  a set.
- **Diegetic / source-coherent sound** — sound that seems to come from the
  thing shown on screen, rather than from an unrelated background track.
- **Evidence ID** — a short label (for example `VID-01`) identifying one
  study in the evidence ledger.
- **Evidence ledger** — the spreadsheet recording every study behind
  Catflix's rules, one row per study: [evidence-ledger.csv](docs/research/evidence-ledger.csv).
- **Figure-ground separation** — how clearly a subject stands out from its
  background.
- **Habituation** — responding less to something the more it is repeated.
- **Occlusion** — a subject passing behind something else and becoming
  temporarily hidden.
- **Preference** — a voluntary choice between two or more available options,
  distinct from simply watching one thing.
- **Referee notes** — dated, descriptive notes about one named cat's
  observed behavior; never a score or profile.
- **Sensory capacity** — what a cat can physically detect, regardless of
  whether it responds.
- **Ultrasonic** — sound at a frequency above the range of human hearing.
- **Welfare** — how a cat fares over time, beyond a single moment of
  attention; positive, neutral, stressful, or physically risky.
