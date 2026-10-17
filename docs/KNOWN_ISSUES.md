# Catflix alpha: known issues

Thank you for testing Catflix. This page lists what we already know about, so
you don't spend time reporting it, and explains how to report anything else.

Catflix keeps everything in your own browser. Nothing you record is sent
anywhere, which also means we can't see your problem unless you describe it.

## What this alpha covers

You should be able to browse the five scenes, add them to your watchlist, pass
the safety checklist, play a scene on a tablet or a television (with pause and
stop), write down what you observed, and export, import or delete your local
records. The research page and the screenshot tour are part of the alpha too.

Use a current version of Chrome, Edge, Firefox or Safari on a desktop, laptop
or tablet. Older browsers and phones have not been tested.

## Known issues

**If your saved records can't be loaded, changes in that tab aren't kept.**
In rare cases the page can't read your saved records when it opens. It then
shows a message saying so, and watchlist or scene-motion changes made in that
tab are not saved.
*Workaround:* reload the page. If a "Local storage warning" appears instead,
changes in that tab are kept only until you close it.

**Notes are limited to 20,000 characters.**
A note or safety event can be up to 20,000 characters (several pages). The
form stops accepting text at that point and says so; text pasted beyond the
limit is cut off.
*Workaround:* keep very long notes elsewhere and summarize them here.

**Saving can feel slow when your local record is nearly full.**
Catflix keeps up to about 5 MB of records. Close to that limit, each save or
watchlist change takes longer, which you may notice on older tablets.
*Workaround:* export your records, then delete old observations you no longer
need.

**Two tabs can overwrite each other's scene-motion setting.**
If Catflix is open in two tabs and you change the scene-motion setting in both,
the last change wins.
*Workaround:* use Catflix in one tab at a time.

**Exports have not been confirmed in Firefox and Safari.**
Exports are confirmed in Chrome. We changed how the download starts so it
should also work in Firefox and Safari, but haven't confirmed that yet.
*Workaround:* if nothing downloads, try the export button again, or use Chrome
or Edge. Please tell us if it happens.

**A damaged record is left out of exports without a warning.**
If a record was damaged (for example, created by an early development build),
both the normal and the recovery export skip it without saying so. A fresh
install won't have damaged records.

**Two details in the research sources are still being checked.**
One study's sample size and another's publication year in the source list
haven't been confirmed against the original papers yet. Neither changes what
Catflix does.

## Behaving as designed

- **Importing replaces everything.** Confirming an import replaces all of your
  local records with the file's contents. Export first if you might want your
  current records back.
- **Closing the observation form asks first.** If you press Escape, the close
  button, or "Finish without saving", Catflix asks before discarding the
  session, because a discarded session can't be recorded later. Press Escape
  again or choose "Keep editing" to go back to your notes.
- **Scenes never replay or speed up by themselves**, and sound always starts
  muted.

## How to report a bug

Open an issue at <https://github.com/sebastianspicker/catflix/issues> and choose
**Bug report**. Please include:

1. **Version and build:** shown at the very bottom of the catalogue page, for
   example "Version 0.2.0 · build 1a2b3c4". Also say whether you used the
   website or your own copy.
2. **What you were doing:** catalogue, safety checklist, tablet scene,
   television scene, local records, research page or screenshot tour.
3. **Steps:** the shortest sequence that makes the problem happen again.
4. **What you expected and what happened instead.**
5. **Browser and device**, for example "Safari 19 on an iPad, landscape".
6. **Whether a "Local storage warning" message was showing.**
7. **Any red errors from the browser console**, copied as text or as a
   screenshot. To open the console: in Chrome or Edge press F12 (Windows) or
   Cmd+Option+J (Mac); in Firefox press F12 or Cmd+Option+K; in Safari, first
   turn on "Show features for web developers" in Settings › Advanced, then
   press Cmd+Option+C.

**Please don't attach exported files, and don't include your cats' names or
other household details.** Exports contain your private notes. Describe what
you saw instead. If you believe you found a security problem, don't post it
publicly; contact the repository owner privately.
