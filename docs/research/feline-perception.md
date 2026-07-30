# Scientific foundation for Catflix curation

Status: product research baseline
Search closed: 29 July 2026
Scope: domestic-cat content curation, playback, audio, session design, device setup, and welfare safeguards

## Executive conclusion

Catflix can make defensible decisions about legibility, motion, novelty, sound, session structure, and physical safety, but it cannot claim that a video is enjoyable or beneficial merely because a cat looks at, tracks, or strikes the screen. The literature establishes several relevant capacities and repeatable attention effects. It contains far less direct evidence about voluntary screen preference and almost no strong household evidence about welfare after repeated cat-video exposure.

Four terms remain separate throughout this review:

- **Sensory capacity** is what a cat can detect or discriminate under stated conditions.
- **Attention** is orientation, looking, tracking, or approach caused by a stimulus.
- **Preference** is a voluntary choice between available alternatives, ideally with repeated access and opportunity to leave.
- **Welfare** is a positive, neutral, frustrating, stressful, or physically risky outcome assessed beyond momentary attention.

The evidence ledger contains 60 unique, peer-reviewed sources, 57 original empirical studies and 3 scholarly reviews. Every source has one primary domain and is counted once. The corpus is predominantly domestic-cat behavioral, field, developmental, or clinical research, with feline neurophysiology used for capacity questions. The direct display domain contains one television-enrichment trial and four screen or visual-media experiments. Only the television trial measured behavior in an enrichment setting. This is not enough to characterize cat-video viewing as a welfare intervention.

## Executive decision table

Every row is a complete recommendation: a decision, evidence, confidence, applicable conditions, prohibited inference, and validation need.

| Decision | Supporting evidence | Confidence | Applicable conditions | Prohibited inference | Validation need |
| --- | --- | --- | --- | --- | --- |
| Curate moving subjects with clear figure-ground separation, and store contrast as metadata. | COL-05, COL-07, SPA-03, SPA-04, SPA-07; feline detection changes with size, distance, luminance, contrast, and temporal conditions. | Moderate | Any programme intended to be visually legible at a known device size and approximate viewing distance. | Do not claim a universal best color or that high contrast is always preferred. | Observe each cat's orientation and tracking across matched clips that differ mainly in contrast. |
| Prefer coherent, prey-like or object-like trajectories over motion added only for intensity. | MOT-02, MOT-07, VID-01, VID-02, VID-03. | Moderate for attention; low for welfare | Short supervised trials with uncluttered backgrounds and an easy exit. | Do not call longer looking enjoyment, hunting satisfaction, or welfare benefit. | Compare matched linear, intermittent, and relational trajectories within cat and record disengagement. |
| Treat novelty as a consumable property and rotate clips rather than escalating speed or density. | HUN-05 and VID-01 show response decline with repetition; HUN-07 shows individual preference variation. | Moderate | Repeated household sessions using recognizable clip IDs. | Do not infer boredom from one disengagement or optimize for maximum continuous engagement. | Re-present clips after a washout period and record spontaneous re-engagement without prompting. |
| Keep sound optional, intermittent, source-coherent, and at the lowest level that produces ordinary orientation without distress. | AUD-02, AUD-05, AUD-06, AUD-07, AUD-08; WEL-05, WEL-06. | Moderate for localization and orientation; low for video welfare | Speakers are stable; the cat can leave; playback begins quietly; no known sound sensitivity. | Do not infer that high-frequency audibility makes ultrasonic content desirable, and do not infer enjoyment from ear or head movement. | Run sound-on/sound-off matched observations and stop on startle, avoidance, freezing, or persistent agitation. |
| Do not publish an exact minimum refresh-rate rule. Use modern displays without visible judder or flicker under the actual luminance and motion conditions. | SPA-01, SPA-03, SPA-04, SPA-05. | High that temporal sensitivity is context dependent; low for a product number | Device acceptance testing with the actual panel, brightness, codec, frame cadence, and clip motion. | A 40-55 Hz laboratory CFF range is not a universal frame-rate specification. | Inspect high-motion clips on each supported device and include a household no-flicker/no-judder check. |
| Default to short, voluntary, supervised sessions with visible opportunities to disengage. | VID-01 shows low average screen attention and decline across exposure; WEL-01 through WEL-08 show that stress indicators and individual coping vary. | Moderate as a precaution; low as an efficacy claim | Tablet or television is secured; the cat is healthy enough for normal play; a human can stop playback. | Do not prescribe a universal duration from the three-hour shelter protocol. | Household protocol records latency to disengage, repeated return, and post-session behavior; duration stays descriptive. |
| Offer a safe physical capture alternative after repeated screen strikes or edge searching. | HUN-01, HUN-04, HUN-05, HUN-08; VID-01. | Provisional | A cat repeatedly pounces, paws behind the screen, or continues searching after the target disappears. | Do not claim that every non-capture video causes frustration or that a toy automatically resolves it. | Compare post-session behavior with and without a brief physical play opportunity, without forcing interaction. |
| Use referee notes for Arri, Ozzy, and Mika, never cat profiles or automated preference scores. | HUN-06, HUN-07, IND-02, IND-03 show meaningful individual variation while also exposing measurement and context limits. | High for the governance boundary; moderate for individual variation | Notes are dated, descriptive, and tied to a clip and context. | Do not infer stable personality, breed rules, diagnosis, or a universal preference from household observations. | Periodically repeat matched observations and retain contradictory results rather than averaging them away. |
| Exclude or require extra supervision for rapidly flashing edits, unstable devices, loud or spatially incoherent audio, and clips that repeatedly provoke collision or distressed searching. | SPA-01, AUD-02, AUD-05, WEL-05, WEL-06; physical risk is a precautionary product constraint rather than a tested video effect. | Moderate precautionary confidence | All household playback, with stricter review for kittens, geriatric cats, and cats with visual, auditory, neurological, pain, or anxiety concerns. | Do not claim the literature supplies feline clinical thresholds for flashing, volume, or session dose. | Owner review, device stability check, and veterinary advice when health or neurological vulnerability is suspected. |
| Label all content-level evidence confidence and distinguish attention evidence from preference and welfare evidence. | Entire ledger, especially VID-01 through VID-05 and WEL-01 through WEL-08. | High | Editorial curation, referee notes, product copy, and future experiments. | Never turn “watched,” “tracked,” or “pounced” into “liked,” “beneficial,” or “safe” without the corresponding evidence. | Editorial audit of every public claim and traceability check against ledger IDs. |

No recommendation is labelled strong. The most defensible rules are moderate, conditional design choices or high-confidence epistemic and safety boundaries. This follows the pre-set rule that a strong product recommendation requires two independent studies including an awake behavioral study.

## Method

### Review question

What peer-reviewed evidence about domestic-cat vision, hearing, cognition, hunting, play, enrichment, stress, health, age, and individual variation can responsibly constrain Catflix curation and playback?

### Search process

Searches ran between 28 and 29 July 2026 and covered records published or indexed by 29 July 2026. Sources searched were PubMed, Crossref, OpenAlex, Semantic Scholar, ScienceDirect and other journal landing pages, plus backward and forward citation trails from direct display, color, temporal-modulation, music, play, and stress studies. Semantic Scholar's public API returned a rate-limit response during the reproducibility check, so its indexed web records were searched and inspected instead. OpenAlex supplemented bibliographic discovery; it was not part of the planned minimum but helped catch title and DOI variants.

Query families combined `cat`, `cats`, `domestic cat`, `Felis catus`, or `Felis silvestris catus` with:

1. `color vision`, `colour discrimination`, `spectral sensitivity`, `luminance`, `contrast`;
2. `visual acuity`, `spatial frequency`, `temporal modulation`, `flicker`, `motion perception`;
3. `trajectory`, `object permanence`, `occlusion`, `visual cognition`, `chasing`;
4. `hearing range`, `sound localization`, `vocal recognition`, `audiovisual`, `species appropriate music`;
5. `hunting`, `prey preference`, `object play`, `novelty`, `habituation`, `capture`;
6. `television`, `video`, `screen`, `tablet`, `visual enrichment`;
7. `welfare`, `stress`, `frustration`, `shelter`, `habituation`, `enrichment`;
8. `aging`, `geriatric`, `cognitive dysfunction`, `health`, `personality`, `individual differences`.

Representative database forms were:

```text
PubMed: cats[MeSH Terms] AND (vision OR visual perception OR color vision OR motion perception)
PubMed: cats[MeSH Terms] AND (hearing OR auditory perception OR sound localization OR vocalization)
PubMed: cats[MeSH Terms] AND (play OR hunting OR prey OR enrichment)
Crossref/OpenAlex/Semantic Scholar: "domestic cat" + each query family above
```

The direct shelter television paper, behavioral color-discrimination paper, behavioral temporal-modulation paper, and species-appropriate music paper were treated as seed records. Their reference and citation neighborhoods were screened for relevant domestic-cat studies.

### Eligibility and deduplication

Included records were peer-reviewed journal articles studying domestic cats directly. Behavioral, physiological, clinical, developmental, field, and review designs were eligible. A paper using dogs or another species alongside domestic cats remained eligible only when feline methods or results could be identified. Other felids and comparative display studies informed interpretation but were not used to reach 60.

Excluded records were books, theses, conference abstracts, preprints without a journal version, veterinary advice pages, commercial claims, social posts, studies about humans viewing cats, and articles in which “cat” meant computed tomography or an acronym. Veterinary guidance can support later clinical review but does not replace the peer-reviewed corpus.

Deduplication used normalized DOI first, then PMID, normalized title, year, and cohort. One paper receives one evidence ID and one primary domain. The ledger retains DOI and PMID when available. DOI-only records were checked against a journal or indexing landing page; older DOI-less records were checked against PubMed or the journal index. Duplicate publications and repeated appearances across search families were collapsed.

### Data extraction and appraisal

The ledger records population, sample size, stimulus, conditions and design, behavioral or physiological measure, effect, limitations, product directness, DOI or PMID, and full citation fields. `NR` means the sample size was not present in the stable indexing record consulted and must be recovered from full text before quantitative reuse. It does not mean that sample size was unreported in the paper.

Evidence confidence is based on directness to household video, awake behavioral evidence, replication, sample size, ecological validity, comparators, voluntary choice, welfare measurement, and risk of bias. Known hazards are named rather than silently averaged: very small trained cohorts, anesthetized or invasive physiology, shelter-to-home transfer, owner-report and online-video selection bias, historical apparatus, possible pseudoreplication, and causal claims unsupported by the design.

This is a reproducible product literature review, not a registered systematic review or meta-analysis. It does not estimate pooled effect sizes.

## Evidence map

| Primary domain | Sources | Original empirical | Reviews | Product interpretation |
| --- | ---: | ---: | ---: | --- |
| Color, spectral sensitivity, luminance, and contrast | 8 | 8 | 0 | Cats can make chromatic discriminations, but performance depends on brightness control, geometry, and training. No universal favored color is established. |
| Spatial acuity, temporal resolution, and display rendering | 8 | 8 | 0 | Spatial and temporal visibility depend on luminance, contrast, visual angle, development, and apparatus. Exact consumer-display prescriptions are unsupported. |
| Motion, shape, trajectory, occlusion, and visual cognition | 8 | 8 | 0 | Cats respond to motion relationships and can use hidden-object and spatial information. Looking-time results are attention or expectancy measures. |
| Hearing, localization, frequency, bandwidth, and audiovisual congruence | 8 | 8 | 0 | Cats localize broadband sound, discriminate familiar vocal patterns, and may approach cat-specific music. Audibility does not imply desirability. |
| Hunting, prey preferences, object play, novelty, and capture | 8 | 8 | 0 | Predatory play, hunger, novelty, and individual preference interact. Habituation is expected, but video-to-toy transfer is not established. |
| Television, tablet, and video enrichment | 5 | 5 | 0 | One shelter TV trial supports an attention effect and rapid decline; the other studies show screen-mediated visual capacity, not enrichment efficacy. |
| Welfare, frustration, habituation, stress, and safety | 8 | 7 | 1 | Stress is context- and individual-dependent and measures disagree. No study supplies a safe feline video dose. |
| Age, health, experience, and individual differences | 7 | 5 | 2 | Development, aging, health, and individual behavior matter, but do not justify breed modes or automated profiling. |
| **Total** | **60** | **57** | **3** | Majority-original, domestic-cat corpus with direct display evidence kept visibly sparse. |

## Synthesis by decision area

### Visual legibility, not a “best color”

Behavioral work shows that cats can discriminate chromatic stimuli when brightness cues are controlled (COL-01, COL-02, COL-05, COL-07, COL-08). Neural work establishes mechanisms capable of supporting those discriminations (COL-03, COL-04, COL-06), but neural responsiveness is not an awake choice and says nothing about enjoyment.

Stimulus size, shape, distance, luminance, and contrast change performance (COL-05, COL-07, SPA-04, SPA-07). Catflix should therefore store visual-angle inputs and contrast descriptors rather than attaching a preference label to a hue. “Blue and yellow are best for cats” is too coarse: detectability is a property of a foreground, background, illumination, device, distance, and task, not a swatch in isolation.

### Spatial and temporal rendering

The behavioral temporal-modulation study used three cats and found critical fusion values from 40 to 55 Hz under its tested conditions (SPA-01). That numerical result is useful evidence that temporal visibility matters, but it is not a minimum display refresh rate. Frame rate, panel refresh, sample-and-hold behavior, brightness, modulation depth, compression, shutter, motion speed, and viewing distance are not interchangeable.

Similarly, feline acuity estimates shift with testing conditions. The two-cat high-luminance study obtained higher grating values than many earlier studies (SPA-07), while SPA-04 shows luminance-dependent shifts in contrast sensitivity. Catflix should use actual-device acceptance tests and record apparent object size, not promise a resolution or refresh number detached from context.

### Motion, trajectory, and occlusion

Cats can discriminate motion under controlled tasks and show sensitivity to relational trajectories (MOT-02, MOT-07, VID-02, VID-03). They also use spatial and cross-modal information about occluded objects (MOT-01, MOT-03, MOT-04, MOT-06). These findings support coherent trajectories, legible occlusion and reappearance, and low background competition as curation variables.

They do not show that faster movement is better. A target can exceed useful trackability, become visually lost against a complex background, or produce repeated screen collisions. The product should preserve clips with varied speeds and intermittency, then learn only through descriptive household notes.

### Audio and screen-speaker coherence

Cats hear and localize a broad range of sound, with performance depending on frequency, bandwidth, and source position (AUD-01 through AUD-04). Familiar speech can trigger ear or head orientation (AUD-06, AUD-07), and cat-specific music prompted earlier approach or interaction in one study (AUD-08). Gaze shifts differ across auditory and visual targets (AUD-05).

The supported design choice is optional, quiet, coherent audio. The unsupported leap is ultrasonic content or a “scientific” equalizer preset. High-frequency capacity does not demonstrate preference, benefit, or safety, and most consumer speakers cannot reproduce such content faithfully. A sound apparently emitted by an on-screen subject should not pan arbitrarily away from it.

### Hunting, play, novelty, and capture

Object play overlaps with predatory behavior but is not a simple hunger response (HUN-01, HUN-04). Repetition reduces play and a changed stimulus can restore responding (HUN-05). Preferences vary substantially across cats (HUN-06, HUN-07), and regular physical object play can change real-world prey-return outcomes (HUN-08).

These findings justify clip rotation and an optional transition to physical play. They do not prove that video without capture frustrates every cat, nor that adding a final on-screen “catch” supplies the consequences of physical capture. Persistent screen striking, behind-screen searching, inability to settle, or displaced aggression are household stop or review signals, not engagement objectives.

### Direct display evidence

VID-01 randomized 125 shelter cats across five conditions. Across television-present conditions cats looked at the screen in only 6.10% of observations; animate and inanimate movement drew more attention than humans or a blank screen; attention declined over repeated exposure. The design supports an attention and habituation conclusion. It does not establish household preference, positive affect, or sustained welfare benefit.

The remaining display papers confirm that cats can respond to moving lights, random dots, optic flow, and animated relationships on two-dimensional surfaces (VID-02 through VID-05 and MOT-07). Most use tiny or selected cohorts, brief exposures, training, deprivation, invasive recording, owner-posted clips, or endpoints unrelated to welfare. Catflix should say “screen-visible and attention-relevant,” not “proven enriching.”

### Welfare and vulnerable cats

Feline stress can appear in activity, posture, intake, elimination, sickness behavior, cortisol, and social responses, and those measures need not agree (WEL-01 through WEL-08). Shelter, laboratory, hospital, and owned-cat findings cannot be transferred without qualification. There is no peer-reviewed feline video study that defines a maximum safe session, safe sound-pressure level, safe flash rate, or diagnostic stop score.

Health and age alter interpretation. Pain, sensory impairment, anxiety, and cognitive dysfunction can change orientation, vocalization, avoidance, and recovery (IND-04 through IND-07). A geriatric or neurologically vulnerable cat should receive quieter, simpler, more supervised trials, with veterinary advice when behavior changes are new or concerning. Catflix must not position playback as treatment.

## Curation metadata contract

Every curated programme or clip must have a stable `content_id`, `revision`, and the following editorial record. Values are observations or measurements about content and context, not predictions about a cat.

| Field | Required representation | Evidence and rule |
| --- | --- | --- |
| `subject_class` | Controlled term plus free-text detail: bird, small mammal, fish, insect, string/object, abstract motion, conspecific, human, mixed, unknown. | HUN-01, HUN-06, VID-01. Never call a class universally preferred. |
| `apparent_object_size` | Object height/width as percentage of frame; intended viewing-distance band; computed approximate visual-angle band when device size is known. | COL-05, COL-07, SPA-07. Never store pixels alone as apparent size. |
| `luminance_contrast` | Foreground/background relative luminance class: low, medium, high; measurement method or editorial basis; dark-scene flag. | SPA-04, SPA-07. A class is not a preference claim. |
| `chromatic_contrast` | Foreground and background color descriptors plus confidence that they remain separable without hue alone. | COL-01 through COL-08. No universal “cat color” label. |
| `motion` | Median and peak apparent speed class; trajectory type; intermittency; direction-change rate; entrance/exit edge; acceleration; occlusion frequency and duration. | MOT-02, MOT-07, VID-01 through VID-03. Do not optimize a single intensity score. |
| `background_complexity` | Low, medium, high, with edge density or editorial rubric and camouflage/visual-clutter note. | SPA-03 through SPA-05, VID-03. Keep the method with the value. |
| `audio_source` | Diegetic subject, ambience, music, human voice, synthetic effect, none, unknown. | AUD-05 through AUD-08. |
| `audio_level` | Mastering level relative to programme baseline; quiet-start flag; no absolute safe feline value claimed. | AUD-01, WEL-05, WEL-06. Household device volume remains contextual. |
| `audio_bandwidth` | Measured encoded frequency band and codec; ultrasonic-marketing flag must be false for approved content. | AUD-01, AUD-02. Audibility is not desirability. |
| `audio_intermittency` | Continuous, periodic, event-linked, sparse; onset count per minute. | AUD-05 through AUD-08. Sudden-onset review required. |
| `screen_speaker_coherence` | Coherent, ambiguous, intentionally non-diegetic, or incoherent; spatial rationale. | AUD-02 through AUD-05. |
| `novelty_family` | Reusable family ID for shared subject, background, trajectory, and soundtrack; revision relationship. | HUN-05, VID-01. Enables rotation without claiming boredom. |
| `expected_habituation` | Unknown, low-evidence, or observed-in-household; never a fixed countdown. | HUN-05, VID-01. Store observation dates. |
| `session_context` | Intended device class, distance band, light context, quiet-start requirement, voluntary exit, and human presence. | SPA-01, SPA-04, WEL-01 through WEL-08. |
| `supervision` | Standard, active, or do-not-play; rationale. | Physical-risk precaution plus WEL evidence. |
| `welfare_risk_flags` | Flash/judder, loud or startling onset, repeated no-capture loop, screen-edge exit, conspecific distress sound, collision risk, behind-screen search, unknown. | Precautionary; no flag is a diagnosis. |
| `physical_risk_flags` | Unstable device, reachable cables, breakable screen, sharp stand, tip risk, blocked exit, elevated fall risk. | Product safety constraint; verify in each household. |
| `evidence_confidence` | Direct-moderate, direct-low, supporting, indirect-capacity, or unknown; list evidence IDs and endpoint type. | Keeps capacity, attention, preference, and welfare separate. |
| `referee_notes` | Separate arrays for Arri, Ozzy, and Mika; date, clip revision, context, observed behavior, and observer. | Descriptive household validation only; no aggregate cat score. |

An approved record must also state `evidence_endpoint`: `capacity`, `attention`, `preference`, `welfare`, or a combination with separate citations. If a rule is supported only by physiology, `indirect-capacity` is mandatory.

## Playback and safety principles

1. Playback is always optional for the cat. Do not place or hold a cat in front of a screen. MOT-07 demonstrates why handling during testing limits transfer to voluntary preference.
2. Secure televisions and tablets against tipping, sliding, claw damage, cable access, and falls before playback. This precaution follows screen-directed reaching and striking in VID-01, VID-02, and VID-04; no device-injury trial establishes a threshold.
3. Begin without sound or at the household's quietest ordinary level. Increase only when calm behavior continues; never use ultrasonic content. See AUD-01, AUD-02, WEL-05, and WEL-06.
4. Provide an unobstructed exit and do not restart merely to regain attention. See HUN-05 and VID-01.
5. Stop immediately after collision, repeated hard screen strikes, marked startle, freezing, hiding, distressed vocalization, redirected aggression, persistent behind-screen searching, loss of balance, or behavior the observer considers abnormal. This conservative stop rule is informed by VID-01, WEL-05, and WEL-06; it is not a validated feline-video scale.
6. Treat ordinary orientation, tracking, pouncing, disengagement, and later return as separate observations. None alone is a welfare verdict. See VID-01, AUD-06, and AUD-07.
7. For kittens, geriatric cats, or cats with visual, auditory, neurological, pain, anxiety, or cognitive concerns, use simpler and quieter content with active supervision. Seek veterinary advice for new or persistent changes. See IND-01 and IND-04 through IND-07.
8. A physical toy or food should not be used to force approach. A brief voluntary physical play opportunity may follow repeated predatory interaction, but its effect must be observed rather than assumed. See HUN-01, HUN-04, HUN-05, and HUN-08.
9. Do not loop a clip indefinitely. Rotation is preferable to escalating motion, sound, or cut rate. See HUN-05 and VID-01.
10. Human-facing motion and accessibility requirements in the interface remain separate from feline content curation.

## Household observation protocol for Arri, Ozzy, and Mika

This protocol is lightweight product validation. It is not an experiment, diagnosis, biometric system, or automated profile.

### Setup

- Test one cat at a time only when that cat approaches or remains voluntarily.
- Secure the device, cables, and surrounding objects. Keep the usual exit route open.
- Record cat, date/time, `content_id` and revision, device, approximate viewing distance, room light, sound state, recent meal/play context, and observer.
- Use a matched A/B pair when possible, changing one primary feature such as contrast, trajectory, sound, or novelty family.
- Do not lure, place, restrain, wake, or repeatedly call the cat toward the screen.

### Event vocabulary

| Event | Operational note |
| --- | --- |
| `voluntary_approach` | Cat moves toward the playback area without lure or handling. |
| `orientation` | Head, ears, or eyes turn toward the screen or speaker. Record modality when clear. |
| `tracking` | Head or gaze follows a visible object's path for more than a moment. |
| `pouncing` | Deliberate leap, paw strike, or capture-like movement toward the display area. Record contact and force descriptively. |
| `disengagement` | Cat looks away, leaves, grooms, rests, or redirects to another activity. Do not treat this as failure. |
| `re_engagement` | Cat returns attention after at least 10 seconds of disengagement without a human prompt. The interval is an observation rule, not a biological threshold. |
| `post_session_behavior` | For the next ordinary few minutes, note settled, play-seeking, searching, hiding, agitated, aggressive, vocal, or other descriptive behavior. Do not score mood. |

### Session note

Record event timestamps or rough sequence, reason playback ended, any safety event, and one plain-language observation. Example: “Mika approached during the second bird entrance, tracked two left-to-right passes, tapped the lower bezel once, then left and groomed. No return before playback ended.” Do not write “Mika loved birds.”

Repeat a comparison on more than one day before adding a curator note. Preserve non-response and contradictory sessions. Referee notes may say “tracked in two quiet evening observations” or “no approach observed,” never “favorite,” “addicted,” “calming,” or “therapeutic” without evidence that actually measures the corresponding construct.

## Product claim rules

- **Permitted:** “Includes intermittent small-animal movement on a low-complexity background; evidence supports visibility and attention relevance.”
- **Permitted:** “Arri tracked this revision in two supervised household observations.”
- **Not permitted:** “Scientifically proven to entertain cats.”
- **Not permitted:** “Optimized for feline color vision” unless the exact contrast, device, and validation method are stated.
- **Not permitted:** “60 Hz is required for cats,” “ultrasonic enrichment,” “anti-anxiety video,” or “prevents cognitive decline.”
- **Not permitted:** breed modes, stable personality profiles, or ranking content by maximum uninterrupted engagement.

## Limitations and research gaps

1. The evidence directly testing television or tablet enrichment in domestic cats is extremely sparse. The largest direct trial used shelter cats, CRT-era video, long exposure blocks, and scan-sampled looking behavior.
2. Many foundational visual and auditory studies use two to five highly trained cats. Several physiological studies are invasive or anesthetized. They establish mechanisms or thresholds, not spontaneous household choices.
3. A device changes apparent size, luminance, contrast, temporal rendering, latency, compression, and speaker location simultaneously. A result from a laboratory screen does not create a device-independent prescription.
4. Orientation and looking are often the only feasible endpoints. They can signal novelty, expectancy violation, vigilance, attraction, or concern. They are not interchangeable with positive affect.
5. Shelter, cattery, colony, veterinary-clinic, and laboratory findings may not transfer to a familiar home. Owned-cat surveys add recall, volunteer, and owner-interpretation bias.
6. Online and community-science video studies have selection, compliance, attrition, and pseudoreplication risks. A popular clip is not a random sample of cats or exposures.
7. No included study directly tests whether unresolved on-screen pursuit causes frustration, whether a physical capture opportunity mitigates it, or what session duration is optimal.
8. No included study supplies validated safety thresholds for feline video flash rate, sound pressure, acceleration, cut density, or exposure dose. Any exact prescription would overstate the evidence.
9. Age and clinical literature supports caution but not a Catflix diagnostic mode. New disorientation, vocalization, startle, avoidance, or motor change belongs with a veterinarian.
10. Several older records expose only abstracts through stable indexes. `NR` sample sizes in the ledger require full-text recovery before numerical synthesis.

## Next research step

Use the household protocol to test implementation assumptions, not to “prove” the literature. The first useful comparisons are matched contrast, motion intermittency, sound-on/sound-off, and repeated-versus-rotated clips. Before publishing clinical or safety-facing claims, have a veterinarian or feline-welfare specialist review the language and its limits. A later formal study would need preregistered within-cat counterbalancing, blinded video coding, a voluntary choice design, repeated follow-up, explicit welfare outcomes, device photometry and acoustics, and a sample beyond Arri, Ozzy, and Mika.

## Numbered bibliography

The number order follows the evidence ledger by domain. Evidence IDs are included to make product rules traceable.

1. **COL-01.** Sechzer JA; Brown JL (1964). “Color discrimination in the cat.” *Science*. [Stable record](https://doi.org/10.1126/science.144.3617.427)
2. **COL-02.** Mello NK; Peterson NJ (1964). “Behavioral evidence for color discrimination in cat.” *Journal of Neurophysiology*. [Stable record](https://doi.org/10.1152/jn.1964.27.3.323)
3. **COL-03.** Daw NW; Pearlman AL (1969). “Cat colour vision: one cone process or several?” *Journal of Physiology*. [Stable record](https://pubmed.ncbi.nlm.nih.gov/5767891/)
4. **COL-04.** Ringo J; Wolbarsht ML; Wagner HG; Crocker R; Amthor F (1977). “Trichromatic vision in the cat.” *Science*. [Stable record](https://doi.org/10.1126/science.910161)
5. **COL-05.** Loop MS; Bruce LL (1978). “Cat color vision: the effect of stimulus size.” *Science*. [Stable record](https://doi.org/10.1126/science.628838)
6. **COL-06.** Hammond P (1978). “The neural basis for colour discrimination in the domestic cat.” *Vision Research*. [Stable record](https://doi.org/10.1016/0042-6989(78)90193-1)
7. **COL-07.** Loop MS; Bruce LL; Petuchowski S (1979). “Cat color vision: the effect of stimulus size, shape and viewing distance.” *Vision Research*. [Stable record](https://doi.org/10.1016/0042-6989(79)90135-4)
8. **COL-08.** Clark DL; Clark RA (2016). “Neutral point testing of color vision in the domestic cat.” *Experimental Eye Research*. [Stable record](https://doi.org/10.1016/j.exer.2016.10.002)
9. **SPA-01.** Loop MS; Berkley MA (1975). “Temporal modulation sensitivity of the cat I: behavioral measures.” *Vision Research*. [Stable record](https://doi.org/10.1016/0042-6989(75)90302-8)
10. **SPA-02.** Mitchell DE; Giffin F; Wilkinson F; Anderson P; Smith ML (1976). “Visual resolution in young kittens.” *Vision Research*. [Stable record](https://doi.org/10.1016/0042-6989(76)90197-8)
11. **SPA-03.** Blake R; Camisa JM (1977). “Temporal aspects of spatial vision in the cat.” *Experimental Brain Research*. [Stable record](https://doi.org/10.1007/BF00235714)
12. **SPA-04.** Pasternak T; Merigan WH (1981). “The luminance dependence of spatial vision in the cat.” *Vision Research*. [Stable record](https://doi.org/10.1016/0042-6989(81)90240-6)
13. **SPA-05.** Frishman LJ; Freeman AW; Troy JB; Schweitzer-Tong DE; Enroth-Cugell C (1987). “Spatiotemporal frequency responses of cat retinal ganglion cells.” *Journal of General Physiology*. [Stable record](https://doi.org/10.1085/jgp.89.4.599)
14. **SPA-06.** Milleret C; Buser P (1988). “Function of the Y optic nerve fibres in the cat: do they contribute to acuity and ability to discriminate fast motion?” *Journal of Physiology*. [Stable record](https://pubmed.ncbi.nlm.nih.gov/3446784/)
15. **SPA-07.** Clark DL; Clark RA (2013). “The effects of time, luminance, and high contrast targets: revisiting grating acuity in the domestic cat.” *Experimental Eye Research*. [Stable record](https://doi.org/10.1016/j.exer.2013.08.004)
16. **SPA-08.** MacNeill K; Myatt A; Duffy KR; Mitchell DE (2021). “Documentation of the development of various visuomotor responses in typically reared kittens and those reared with early selected visual exposure by use of a new procedure.” *Frontiers in Neuroscience*. [Stable record](https://doi.org/10.3389/fnins.2021.781516)
17. **MOT-01.** Triana E; Pasnak R (1981). “Object permanence in cats and dogs.” *Animal Learning & Behavior*. [Stable record](https://doi.org/10.3758/BF03212035)
18. **MOT-02.** Pasternak T; Leinen LJ (1986). “Pattern and motion vision in cats with selective loss of cortical directional selectivity.” *Journal of Neuroscience*. [Stable record](https://doi.org/10.1523/JNEUROSCI.06-04-00938.1986)
19. **MOT-03.** Doré FY; Fiset S; Goulet S; Dumas MC; Gagnon S (1996). “Search behavior in cats and dogs: interspecific differences in working memory and spatial cognition.” *Animal Learning & Behavior*. [Stable record](https://doi.org/10.3758/BF03198962)
20. **MOT-04.** Takagi S; Arahori M; Chijiiwa H; Tsuzuki M; Hataji Y; Fujita K (2016). “There's no ball without noise: cats' prediction of an object from noise.” *Animal Cognition*. [Stable record](https://doi.org/10.1007/s10071-016-1001-6)
21. **MOT-05.** Miklósi Á; Pongrácz P; Lakatos G; Topál J; Csányi V (2005). “A comparative study of the use of visual communicative signals in interactions between dogs (Canis familiaris) and humans and cats (Felis catus) and humans.” *Journal of Comparative Psychology*. [Stable record](https://doi.org/10.1037/0735-7036.119.2.179)
22. **MOT-06.** Takagi S; Chijiiwa H; Arahori M; Saito A; Fujita K; Kuroshima H (2021). “Socio-spatial cognition in cats: mentally mapping owner's location from voice.” *PLOS ONE*. [Stable record](https://doi.org/10.1371/journal.pone.0257611)
23. **MOT-07.** Abdai J; Uccheddu S; Gácsi M; Miklósi Á (2022). “Chasing perception in domestic cats and dogs.” *Animal Cognition*. [Stable record](https://doi.org/10.1007/s10071-022-01643-3)
24. **MOT-08.** Smith GE; Chouinard PA; Lin I; Tsoi KT; Agrillo C; Byosiere SE (2022). “Seeing things: a community science investigation into motion illusion susceptibility in domestic cats (Felis silvestris catus) and dogs (Canis lupus familiaris).” *Animals*. [Stable record](https://doi.org/10.3390/ani12243562)
25. **AUD-01.** Heffner RS; Heffner HE (1985). “Hearing range of the domestic cat.” *Hearing Research*. [Stable record](https://doi.org/10.1016/0378-5955(85)90100-5)
26. **AUD-02.** Martin RL; Webster WR (1987). “The auditory spatial acuity of the domestic cat in the interaural horizontal and median vertical planes.” *Hearing Research*. [Stable record](https://doi.org/10.1016/0378-5955(87)90140-7)
27. **AUD-03.** Populin LC; Yin TCT (1998). “Behavioral studies of sound localization in the cat.” *Journal of Neuroscience*. [Stable record](https://doi.org/10.1523/JNEUROSCI.18-06-02147.1998)
28. **AUD-04.** Mickey BJ; Middlebrooks JC (2003). “Representation of auditory space by cortical neurons in awake cats.” *Journal of Neuroscience*. [Stable record](https://doi.org/10.1523/JNEUROSCI.23-25-08649.2003)
29. **AUD-05.** Ruhland JL; Yin TCT; Tollin DJ (2013). “Gaze shifts to auditory and visual stimuli in cats.” *Journal of the Association for Research in Otolaryngology*. [Stable record](https://doi.org/10.1007/s10162-013-0401-4)
30. **AUD-06.** Saito A; Shinozuka K (2013). “Vocal recognition of owners by domestic cats (Felis catus).” *Animal Cognition*. [Stable record](https://doi.org/10.1007/s10071-013-0620-4)
31. **AUD-07.** Saito A; Shinozuka K; Ito Y; Hasegawa T (2019). “Domestic cats (Felis catus) discriminate their names from other words.” *Scientific Reports*. [Stable record](https://doi.org/10.1038/s41598-019-40616-4)
32. **AUD-08.** Snowdon CT; Teie D; Savage M (2015). “Cats prefer species-appropriate music.” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/j.applanim.2015.02.012)
33. **HUN-01.** Biben M (1979). “Predation and predatory play behaviour of domestic cats.” *Animal Behaviour*. [Stable record](https://doi.org/10.1016/0003-3472(79)90129-5)
34. **HUN-02.** Martin P; Bateson P (1985). “The ontogeny of locomotor play behaviour in the domestic cat.” *Animal Behaviour*. [Stable record](https://doi.org/10.1016/S0003-3472(85)80073-7)
35. **HUN-03.** Bateson P; Mendl M; Feaver J (1990). “Play in the domestic cat is enhanced by rationing of the mother during lactation.” *Animal Behaviour*. [Stable record](https://doi.org/10.1016/S0003-3472(05)80532-9)
36. **HUN-04.** Hall SL; Bradshaw JWS (1998). “The influence of hunger on object play by adult domestic cats.” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/S0168-1591(97)00136-6)
37. **HUN-05.** Hall SL; Bradshaw JWS; Robinson IH (2002). “Object play in adult domestic cats: the roles of habituation and disinhibition.” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/S0168-1591(02)00153-3)
38. **HUN-06.** Dickman CR; Newsome TM (2015). “Individual hunting behaviour and prey specialisation in the house cat Felis catus: implications for conservation and management.” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/j.applanim.2014.09.021)
39. **HUN-07.** Vitale Shreve KR; Mehrkam LR; Udell MAR (2017). “Social interaction, food, scent or toys? A formal assessment of domestic pet and shelter cat (Felis silvestris catus) preferences.” *Behavioural Processes*. [Stable record](https://doi.org/10.1016/j.beproc.2017.03.016)
40. **HUN-08.** Cecchetti M; Crowley SL; Goodwin CED; McDonald RA (2021). “Provision of high meat content food and object play reduce predation of wild animals by domestic cats Felis catus.” *Current Biology*. [Stable record](https://doi.org/10.1016/j.cub.2020.12.044)
41. **VID-01.** Ellis SLH; Wells DL (2008). “The influence of visual stimulation on the behaviour of cats housed in a rescue shelter.” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/j.applanim.2007.11.002)
42. **VID-02.** Fabre-Thorpe M; Viévard A; André C; Fuzellier J; Buser P (1984). “Visually guided movements in the cat: a test using a randomly moving target.” *Behavioural Brain Research*. [Stable record](https://doi.org/10.1016/0166-4328(84)90004-4)
43. **VID-03.** Burnat K; Vandenbussche E; Zernicki B (2002). “Global motion detection is impaired in cats deprived early of pattern vision.” *Behavioural Brain Research*. [Stable record](https://doi.org/10.1016/S0166-4328(01)00456-9)
44. **VID-04.** Nagypál T; Gombkötő P; Barkóczi B; Benedek G; Nagy A (2015). “Activity of caudate nucleus neurons in a visual fixation paradigm in behaving cats.” *PLOS ONE*. [Stable record](https://doi.org/10.1371/journal.pone.0142526)
45. **VID-05.** Kim Y; Johns P (2025). “Using online media to study animal cognition: domestic cat responses to reflective images.” *Animal Behavior and Cognition*. [Stable record](https://doi.org/10.26451/abc.12.02.05.2025)
46. **WEL-01.** Carlstead K; Brown JL; Strawn W (1993). “Behavioral and physiological correlates of stress in laboratory cats.” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/0168-1591(93)90062-T)
47. **WEL-02.** Kessler MR; Turner DC (1997). “Stress and adaptation of cats housed singly, in pairs and in groups in boarding catteries.” *Animal Welfare*. [Stable record](https://doi.org/10.1017/S0962728600019837)
48. **WEL-03.** Kessler MR; Turner DC (1999). “Socialization and stress in cats housed singly and in groups in animal shelters.” *Animal Welfare*. [Stable record](https://doi.org/10.1017/S0962728600021163)
49. **WEL-04.** McCobb EC; Patronek GJ; Marder A; Dinnage JD; Stone MS (2005). “Assessment of stress levels among cats in four animal shelters.” *JAVMA*. [Stable record](https://doi.org/10.2460/javma.2005.226.548)
50. **WEL-05.** Stella JL; Lord LK; Buffington CAT (2011). “Sickness behaviors in response to unusual external events in healthy cats and cats with feline interstitial cystitis.” *JAVMA*. [Stable record](https://doi.org/10.2460/javma.238.1.67)
51. **WEL-06.** Stella J; Croney C; Buffington T (2013). “Effects of stressors on the behavior and physiology of domestic cats.” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/j.applanim.2012.10.014)
52. **WEL-07.** Vinke CM; Godijn LM; van der Leij WJR (2014). “Will a hiding box provide stress reduction for shelter cats?” *Applied Animal Behaviour Science*. [Stable record](https://doi.org/10.1016/j.applanim.2014.09.002)
53. **WEL-08.** Amat M; Camps T; Manteca X (2015). “Stress in owned cats: behavioural changes and welfare implications.” *Journal of Feline Medicine and Surgery*. [Stable record](https://doi.org/10.1177/1098612X15590867)
54. **IND-01.** Beaver BV (1980). “Sensory development of Felis catus.” *Laboratory Animals*. [Stable record](https://doi.org/10.1258/002367780780937472)
55. **IND-02.** Bennett PC; Rutter NJ; Woodhead JK; Howell TJ (2017). “Assessment of domestic cat personality, as perceived by 416 owners, suggests six dimensions.” *Behavioural Processes*. [Stable record](https://doi.org/10.1016/j.beproc.2017.02.020)
56. **IND-03.** Wells DL; Millsopp S (2009). “Lateralized behaviour in the domestic cat Felis silvestris catus.” *Animal Behaviour*. [Stable record](https://doi.org/10.1016/j.anbehav.2009.06.010)
57. **IND-04.** Bellows J; Center S; Daristotle L; Estrada AH; Flickinger EA; Horwitz DF; Lascelles BDX; Lepine A; Perea S; Scherk M; Shoveller AK (2016). “Aging in cats.” *Journal of Feline Medicine and Surgery*. [Stable record](https://doi.org/10.1177/1098612X16649523)
58. **IND-05.** Černá P; Gardiner H; Sordo L; Tørnqvist-Johnsen C; Gunn-Moore DA (2020). “Potential causes of increased vocalisation in elderly cats with cognitive dysfunction syndrome as assessed by their owners.” *Animals*. [Stable record](https://doi.org/10.3390/ani10061092)
59. **IND-06.** Sordo L; Gunn-Moore DA (2021). “Cognitive dysfunction in cats: update on neuropathological and behavioural changes plus clinical management.” *Veterinary Record*. [Stable record](https://doi.org/10.1002/vetr.3)
60. **IND-07.** Azadian A; Gunn-Moore DA (2022). “Age-related cognitive impairments in domestic cats naturally infected with feline immunodeficiency virus.” *Veterinary Record*. [Stable record](https://doi.org/10.1002/vetr.1683)
