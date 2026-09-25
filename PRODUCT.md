# Product

Catflix is a personal streaming shelf built around three cats: Arri, Ozzy, and
Mika. The cats are the referees. Their observed attention shapes short curator
notes and approval labels, and the interface never pretends to measure them
automatically.

## Who it's for

One person curating a small household watchlist for three cats. They choose the
scenes, run the sessions, and write the notes. Nothing is inferred on their
behalf.

## What it's for

Catflix treats a personally curated list of cat-directed videos as a considered
streaming destination, not a novelty pet product. It works when the owner can
filter by theme, animal or subject, and motion; pick a programme; deliberately
restart an earlier encounter; and control playback comfortably from a laptop or
tablet.

## Voice and feel

Fashion-film, editorial, surreal. The voice is knowing and composed, with an
occasional dry wink. Feline attention should feel cinematic and important.

Not a cute pet-store brand: no paw-print wallpaper, baby talk, or childish
rainbow palettes. Small static ink-line cat details can appear in owner-facing
dividers and empty or saved states, but they never imply animal approval and
never appear inside an active encounter. Avoid literal Netflix cloning.

## Design principles

1. Treat every viewing choice as a premiere, not a content tile.
2. Make animal perception the visual subject: movement, contrast, peripheral
   interest, and patience.
3. Use surrealism with precision; one striking scene beats nonstop decoration.
4. Stay confidently editorial while keeping every action immediately legible.
5. Respect the owner's space with a refined, collectible-feeling interface.
6. Keep curation human: Arri, Ozzy, and Mika may approve a video, but they are
   never filters, accounts, or algorithmic profiles.

## The scientific boundary

Catflix separates sensory capacity, attention, voluntary preference, and
welfare. Looking, tracking, approaching, or pouncing may establish attention;
none of them alone establishes enjoyment, benefit, safety, or a stable
preference. Product copy and curator notes must preserve that distinction.

The research baseline is
[Scientific foundation for Catflix curation](docs/research/feline-perception.md),
and the source-level record is
[evidence-ledger.csv](docs/research/evidence-ledger.csv). Evidence IDs below
refer to that ledger.

### Curation

1. Record subject class, apparent object size at the intended distance,
   luminance and chromatic contrast, motion, occlusion, background complexity,
   audio, novelty family, session context, risk flags, and evidence confidence
   for every programme. The complete contract is normative in the research
   baseline. (COL-05, COL-07, SPA-04, SPA-07, MOT-07, VID-01)
2. Prefer legible figure-ground separation and coherent trajectories. Don't
   advertise a universal best color, speed, direction, or prey class:
   detectability changes with size, viewing distance, luminance, contrast, and
   task. (COL-01 through COL-08; SPA-03, SPA-04, SPA-07)
3. Treat motion as structured information, not an intensity score. Store speed,
   trajectory, intermittency, direction changes, entry and exit edge, and
   occlusion separately. (MOT-02, MOT-07, VID-01 through VID-04)
4. Rotate novelty families after repeated exposure instead of escalating speed,
   sound, cut rate, or background density to regain attention. (HUN-05, VID-01)
5. Keep evidence confidence and the endpoint visible to editors. Physiology
   supports capacity; orientation supports attention; choice supports preference;
   welfare claims require welfare outcomes. (Entire ledger, especially VID-01
   through VID-05 and WEL-01 through WEL-08)
6. Don't build breed modes, "feline-optimized" palette claims, ultrasonic tracks,
   exact universal refresh-rate requirements, or maximum-engagement ranking. The
   evidence does not support them. (COL-01 through COL-08; SPA-01; AUD-01;
   HUN-07; IND-02)

### Playback

1. Use modern playback free of visible flicker, cadence errors, and motion judder
   on the actual supported device. Don't turn the 40-55 Hz three-cat laboratory
   flicker study into a consumer-display specification: temporal visibility
   depends on luminance, contrast, modulation, motion, panel behavior, and
   viewing conditions. (SPA-01, SPA-03 through SPA-05)
2. Keep playback voluntary. Never instruct a person to hold, place, wake, lure,
   or repeatedly call a cat toward the screen. (WEL-01 through WEL-08)
3. Allow immediate pause and stop. Disengagement is a valid outcome and must not
   trigger automatic intensity escalation or replay. (HUN-05, VID-01)
4. Avoid indefinite loops. Repeated attention decline is expected, but no fixed
   habituation countdown is scientifically established. (HUN-05, VID-01)

### Audio

Catflix synthesizes each event's sound locally with the Web Audio API at
playback time; no environmental recording is bundled or streamed. These rules
govern that synthesized source.

1. Keep sound optional, and start it off or at the quietest ordinary household
   level. No included study establishes a feline-safe product sound-pressure
   prescription. (AUD-01, WEL-05, WEL-06)
2. Prefer intermittent, source-coherent audio. Record whether sound is diegetic,
   ambient, musical, vocal, synthetic, or unknown, and whether the apparent
   screen source matches the speaker presentation. (AUD-02 through AUD-08)
3. Don't add ultrasonic content. High-frequency audibility is not evidence of
   preference or benefit, and it does not establish safe reproduction. (AUD-01,
   AUD-02)
4. Ear or head orientation to a voice or sound is attention, not proof of
   enjoyment. (AUD-06, AUD-07)

### Sessions

1. Default to short, supervised, voluntary viewing, but don't publish a universal
   duration. The direct shelter study used three-hour daily exposures and cannot
   supply a household dose. (VID-01)
2. Stop rather than restart when a cat leaves. Record unprompted re-engagement
   separately. (HUN-05, VID-01)
3. When a cat repeatedly strikes the screen or searches behind it, stop or offer
   an optional, safe physical play opportunity. This is precautionary: the
   literature does not prove that every non-capture sequence is frustrating or
   that physical play always resolves it. (HUN-01, HUN-04, HUN-05, HUN-08)
4. Arri, Ozzy, and Mika may receive separate dated referee notes tied to content
   revision and context. Notes stay descriptive household validation, never
   scientific measurement, automatic profiling, diagnosis, or a permanent
   preference score. (HUN-06, HUN-07, IND-02, IND-03)

### Safety

1. Require a stable television or tablet, protected cables, no sharp or
   breakable contact point, no tip or slide risk, and an unobstructed exit before
   playback. This is a precautionary control because cats can make
   screen-directed reaches and strikes; the ledger contains no device-injury
   trial. (VID-01, VID-02, VID-04)
2. Stop immediately after a collision, repeated hard screen strikes, marked
   startle, freezing, hiding, distressed vocalization, redirected aggression,
   persistent behind-screen searching, loss of balance, or behavior the observer
   considers abnormal. This is a conservative stop rule, not a validated
   feline-video scale. (VID-01, WEL-05, WEL-06)
3. Exclude or actively supervise content with rapid flashing edits, unstable
   cadence, loud or startling onsets, spatially incoherent sound, screen-edge
   escape loops, or conspecific distress sounds. This is a conservative product
   constraint; the literature supplies no feline clinical threshold for these
   features. (SPA-01, AUD-02, AUD-05, WEL-05, WEL-06)
4. Kittens, geriatric cats, and cats with visual, auditory, neurological, pain,
   anxiety, or cognitive concerns need simpler, quieter, actively supervised
   trials. New or concerning behavioral change belongs with a veterinarian;
   Catflix is not treatment or a diagnostic tool. (IND-01, IND-04 through IND-07)

## Accessibility

Use strong contrast, semantic controls, keyboard focus, and reduced-motion
support. The high-motion editorial presentation is an intentional default, while
an alternative must stay available for motion-sensitive users.
