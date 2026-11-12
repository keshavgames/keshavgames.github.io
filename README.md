# Game Box

A static website of 34 original browser games. No build step, no dependencies, no downloads.

| Genre | Games |
|-------|-------|
| Horror | Hollow Ward (first-person horror) |
| RPG | Ember Keep (action RPG), Spellbound (deckbuilder) |
| Racing | Sunset Rush (3D arcade racer), Neon Drift (top-down racer) |
| Action | Dead Acre (zombie shooter), Lantern Night (horde survival), Dojo Duel (fighting), Blob Arena (eat-em-up), Star Defender (shooter), Gem Runner (runner), Cave Flyer |
| Adventure | Moss Hop (platformer), Shadow Heist (stealth) |
| Strategy | Gem Garrison (tower defense), Isle Conquest (RTS), Tank Duel (artillery) |
| Simulation | Tiny Acre (farming), Cafe Rush (time management), Frostbound (survival), Orbit Courier (space flight) |
| Puzzle | Crystal Cascade (match-3), Gem Pairs (memory) |
| Arcade | Star Pinball, Gem Snake, Brick Smash, Rock Dodge |
| Sports | Turbo Kickoff (2v2 soccer) |
| Casual | Style Studio (dress-up), Lakeside Lure (fishing), Gem Mine Tycoon (idle) |
| Music | Beat Lanes (rhythm) |
| Skill | Word Siege (typing), Target Rush (aim) |

Every game page shows its controls and a short description under the screen. Everywhere: Space starts, P pauses (except in Word Siege), Esc goes back to the list. High scores, the sound setting and Gem Mine Tycoon progress are saved in the browser (localStorage).

## Run it

Open `index.html` in Chrome. Each game has its own link, e.g. `index.html#horror`.

## Layout

- `index.html`: page, styles, home grid, player and controls panel
- `js/core.js`: game registry, router, game loop, input, sound synth, HUD helpers (`G.bar`, `G.text`, particles, shake)
- `js/games/<id>.js`: one file per game, each calls `GameBox.register({...})`
- `thumbs/<id>.svg`: 320x200 thumbnail for each game

## Add a game

1. Copy a game file in `js/games/`, give it a new `id`, `genre`, `kind`, `desc` and `controls`, and change `init`, `update` and `draw`.
2. Add `thumbs/<id>.svg`.
3. Add a `<script src="js/games/<id>.js">` tag at the bottom of `index.html`.

## Put it online with GitHub Pages

1. Create an empty repository named `game-box` on GitHub.
2. Push this folder to it:
   ```bash
   git remote add origin https://github.com/<your-username>/game-box.git
   git push -u origin main
   ```
3. In the repository, open Settings, then Pages, and deploy from the `main` branch, root folder.

The site is then at `https://<your-username>.github.io/game-box/`.
