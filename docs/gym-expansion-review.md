# Gym library expansion review, 24 November 2026

Prepared on feat/balanced-gym-library. Not released.

35 additions: 19 shared movements and 16 women-tagged variants. Total built-in catalog183, women's entries34, women's gym-tagged entries21. Existing IDs, programs, edits, logs and deletion tombstones are retained. Shared content remains available to women. No program template was changed.

Each addition has Arabic and English setup, steps, expected effort, common mistakes and safety notes. Women's setup and steps use feminine Arabic. Cardio is logged in seconds with zero external weight, no strength PR, no tonnage and no automatic strength rest timer. Duration input supports up to3600seconds.

33 new exercises have two locally bundled generated illustration frames. Two rejected demos remain hidden: single-arm-cable-chest-press (wrong cable direction) and barbell-front-squat (unclear front rack). They retain complete text guides. The corrected supported-row pair was checked with both arms rowing together. These are generated illustrations, not certified exercise footage or a substitute for coaching. No stock photographs were copied. Provenance hashes and review status are in the two expansion art manifests.

Verification:496tests in100files passed; Vite production build passed. Mobile browser checked Arabic and English guides,21women's gym cards, filters across groups, loaded imagery and no horizontal overflow at412px and360px. A1800-second cardio log survived reload and produced zero tonnage/no PR. Existing-data backfill and tombstones have regression tests. This batch has not had a native emulator release-build test, server deployment or production mutation.

Delivery: APK23 remote-content rows do not load these new detailed guide modules. The complete set needs a new application bundle. Do not promise a background-only content update. Release requires the owner's separate explicit go.

## Sources used
- https://www.puregym.com/blog/how-to-use-gym-equipment/
- https://www.puregym.com/blog/best-treadmill-incline-workouts/
- https://www.puregym.com/exercises/abs/pallof-press/
- https://www.puregym.com/exercises/arms-and-shoulders/shoulder-press/single-arm-landmine-press/
- https://www.acefitness.org/continuing-education/certified/september-2025/8948/the-ace-workout-builder-for-landmine-training/
- https://www.concept2.com/training/rowing-technique
- https://www.puregym.com/exercises/chest/bench-press/single-arm-chest-press/
- https://www.muscleandfitness.com/exercise/workouts/chest-exercises/single-arm-cable-chest-press/
- https://www.puregym.com/exercises/back/rows/
- https://www.puregym.com/exercises/back/pull-up/assisted-pull-ups/
- https://www.nhsaaa.net/wp-content/uploads/section-1-weak-and-painful-shoulder.pdf
- https://www.acefitness.org/resources/everyone/blog/7101/five-ways-to-improve-posture-and-mobility-at-the-office/
- https://www.puregym.com/exercises/legs/quad-exercises/lunges/reverse-lunges/
- https://whitecoattrainer.com/blog/cable-pull-through
- https://gravitus.com/exercises/single-arm-bayesian-cable-curl/
- https://www.puregym.com/exercises/arms-and-shoulders/tricep-extension/overhead-tricep-extension/
- https://www.acefitness.org/resources/everyone/exercise-library/358/suitcase-carry/
- https://b3pt.com/supine-heel-taps/
- https://www.puregym.com/exercises/legs/quad-exercises/squats/front-squat/

Same-movement women variants also reuse existing source-linked guides in the repository. Medical rehabilitation sources were used only for basic mechanics, not a rehabilitation prescription or a claim that pain should be ignored.
