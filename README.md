# Old Town — an open-world crime game

![gta6-01](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/Rifat7600/gta6-01-4/rank.svg)
![reward](https://make.fun/badge/gta6-01/Rifat7600/gta6-01-4/reward.svg)

An entry for the [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) on make.fun.

## The game

Old Town is a rainy riverside city, and you are Ray Calloway — a wheelman back
in the town that raised him, working jobs for Mara Voss to pay off an old debt.
Explore the city on foot or behind the wheel, steal cars, outrun the Old Town
PD, and run five story jobs across the river bridge, the docks, the plaza and
the old park.

What is in the game:

- A full open-world city to explore on foot and by car: roads, traffic,
  pedestrians, a riverside with a bridge, a plaza, a park and the docks.
- Cars to steal and drive, with arcade handling, handbrake turns and damage.
- A wanted level (1–5 stars) with police cars that chase, ram and arrest you.
- Five story missions with objectives and rewards, plus cash pickups to find.
- Combat on foot and from the car: fists and a pistol.
- A HUD with a live minimap, wanted stars, health, money and mission text.
- A start screen, pause, and progress that saves to localStorage.
- Synthesized sound (engine, sirens, pickups) with an M mute toggle, and
  animated rain with lightning over the wet streets.

## Controls

- **WASD / arrows** — move on foot, drive the car
- **E** — steal a car / get out of the car
- **F or mouse click** — punch, or shoot toward the mouse
- **Space** — handbrake
- **1–5** — start a job (jobs unlock in order)
- **R** — retry the current job
- **P** — pause, **M** — mute, **Enter** — start / continue

## How it is built

The game is plain static files under `game/` — one HTML page, one stylesheet
and a set of small JavaScript modules, each with one clear job (city, player,
traffic, police, missions, HUD, audio, scenes). No libraries, no build step,
no network requests: every script, style and sound is generated locally.
`main.ts` copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the kit's `buildDossier` library.

Screenshots in `screenshots/` are real renders of the game running in a
desktop browser, taken with the game's own `?scene=` presets: a drive down the
main avenue, a police chase, a mission in progress, and on-foot action at the
plaza.
