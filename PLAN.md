# Game Box: 100-game plan

Owner request (13 Nov 2026): 100 games, at least 5 per genre; simulate play and tune for an impatient
third grader; drastically improve every game (level-based games get 50 levels); 1v1 shooters friends can
play (tactical, like the big competitive shooters), a battle royale with friends or bots; a shell-gamble
horror game in the spirit of popular Steam indies; scarier horror monsters modelled in Blender with
screams; Blender for models; top quality. All games stay original: genre and mechanics only, no names,
characters, maps or art from existing games.

## Kid rules (impatient third grader)
- Play starts in under a second. No intro screens, no walls of text: one short hint line in-game.
- First levels are very easy; difficulty ramps slowly. Lose fast, retry faster (one key / auto).
- Loud, juicy feedback: big popups, confetti, stars, sounds, screen shake.
- Short levels (30-90 s). Progress saves. Stars and unlocks to chase.
- Bright, readable visuals. Nothing too dark to see. Big buttons.
- Remove waiting, long timers, fiddly controls, unfair instant deaths, reading-heavy menus.

## Architecture additions
- `G.levels`: games with `levels: 50` + `level(n)` get a level-select grid, stars, saved progress.
- `G.win(stars)` / `G.lose()`: celebration overlay, Next / Retry, confetti.
- Modes: games with `modes: ['bot','local','online']` show a mode picker (vs bot, 2 players one keyboard, online room code).
- Online: PeerJS (WebRTC) room codes, host-authoritative state sync. Works on keshavgames.github.io (not inside the claude.ai artifact).
- Shared raycaster `js/lib/ray.js` for first-person games (textures, sprites, split screen).
- Blender assets in `art/` (scripts) rendered to `img/` PNGs; loaded with `G.img()`.

## Games (target 100)
Status: [x] done, [~] in progress, [ ] todo. (L50) = 50 levels.

### Shooter
- [x] Dead Acre (zombie)  - [x] Star Defender
- [x] Strike Point: 1v1 tactical FPS, bomb rounds, buy phase, bot / 2P split / online
- [x] Storm Royale: battle royale, 24 players, storm, loot, build walls, bots + duo + online
- [x] Laser Arena: neon FPS free-for-all vs bots, 3 arenas, 20 matches
- [x] Tank Clash: Blender tanks, bot waves (30) or 2P duel
- [x] Sky Ace: Blender biplanes, 30 waves or 2P duel
- [x] Sniper Ridge: scope, breath, wind, Blender tin robots, 50 missions

### Horror
- [x] Hollow Ward: Blender monster, screams, jumpscare, 50 floors, fuse compass
- [x] Last Shell: carnival shell-gamble duel vs a Blender Ringmaster, items, tickets
- [x] Night Shift: wax museum cameras and doors, Blender wax figures, 20 nights
- [x] Whisper Woods: first-person forest, lanterns, Blender antlered stalker, 30 nights
- [x] Crawlspace: side-view chase, lockers, Blender Crawler and kid, 50 houses
- [x] Doll House: top-down, Blender doll that moves in the dark, 50 houses
- [x] Dead Signal: first-person station, relays, tracker, bulkheads, Blender Signal, 30 decks

### Action
- [x] Lantern Night  - [x] Dojo Duel  - [x] Blob Arena  - [x] Gem Runner  - [x] Cave Flyer
- [ ] Ninja Dash: side-scroll slasher (L50)
- [ ] Street Brawl: beat-em-up, 2P co-op local (L50)

### Adventure
- [x] Moss Hop -> L50  - [x] Shadow Heist -> L50
- [ ] Temple Escape: top-down dungeon with keys, blocks, traps (L50)
- [ ] Pirate Isle: treasure hunt adventure
- [ ] Rope Swing: swing platformer (L50)
- [ ] Cave Diver: metroidvania-lite
- [ ] Escape Room: point-and-click rooms (L50)

### RPG
- [x] Ember Keep -> 50 floors  - [x] Spellbound -> 50 floors
- [ ] Dungeon Tactics: turn-based squad grid battles (L50)
- [x] Monster Tamer: eight original Blender creatures, 30 areas
- [ ] Loot Crawler: roguelike grid dungeon (50 floors)
- [ ] Slime Kingdom: auto-battler
- [ ] Knight Quest: overworld action RPG

### Racing
- [x] Sunset Rush  - [x] Neon Drift
- [x] Kart Chaos: Blender karts, items, drift, 30 tracks, 2P split
- [x] Moto Stunt: Blender bike, flips, checkpoints, 50 tracks
- [x] Snow Rally: pseudo-3D ice rally, Blender cars, 30 stages
- [x] Drag Strip: launch and shift timing, nitro, 30 rivals, 2P
- [x] Boat Blitz: Blender speedboats, buoy gates, ramps, 30 courses, 2P

### Arcade
- [x] Star Pinball  - [x] Gem Snake  - [x] Brick Smash -> L50  - [x] Rock Dodge
- [x] Road Hopper: Blender karts as traffic, boats to ride, trains, 30 levels
- [x] Stack Tower: timing stacker, 30 levels
- [x] Maze Muncher: maze chase, four beetle personalities, 50 mazes

### Puzzle
- [x] Crystal Cascade -> L50  - [x] Gem Pairs
- [x] Crate Push (L50)  - [x] Pipe Flow (L50)  - [x] Laser Mirrors (L50)  - [x] Color Flood (L50)  - [x] Word Hunt (30)

### Strategy
- [x] Gem Garrison  - [x] Isle Conquest  - [x] Tank Duel
- [x] Checkers vs bot / 2P  - [x] Sea Battle  - [x] Lane Wars  - [x] Drop Four (replaces Castle Builder)

### Simulation
- [x] Tiny Acre  - [x] Cafe Rush  - [x] Frostbound  - [x] Orbit Courier
- [ ] Pet Pal  - [ ] Pizza Maker  - [ ] Aquarium Keeper

### Sports
- [x] Turbo Kickoff
- [x] Hoop Shot  - [x] Mini Golf (50 holes)  - [x] Bowling  - [x] Air Hockey 2P  - [x] Home Run Derby  - [x] Table Tennis 2P

### Casual
- [x] Style Studio  - [x] Gem Mine Tycoon  - [x] Lakeside Lure
- [ ] Paint Studio  - [ ] Pop It  - [ ] Cake Maker  - [ ] Sticker Scene

### Music
- [x] Beat Lanes
- [x] Tile Tap  - [x] Drum Pad  - [x] Echo Lights  - [x] Beat Maker

### Skill
- [x] Word Siege  - [x] Target Rush
- [x] Quick Draw 2P  - [x] Axe Toss (L50)  - [x] Tightrope  - [x] Steady Hand (L50)

## Progress log
- 13 Nov 2026: plan written.
- 13 Nov 2026: core v3 (levels, modes, online rooms), shared raycaster, Blender monster + soldier kit, Hollow Ward rebuilt, Strike Point, Storm Royale. 36 games.
- 13 Nov 2026: horror set done (Last Shell, Night Shift, Whisper Woods, Crawlspace, Doll House, Dead Signal). tools/harness.js added for headless sims and thumbnails. 42 games.
- 16 Nov 2026: shooter set (Laser Arena, Tank Clash, Sky Ace, Sniper Ridge) and racing set (Kart Chaos, Moto Stunt, Snow Rally, Drag Strip, Boat Blitz) done. 51 games.
- 17 Nov 2026: Mini Golf, Monster Tamer, music, skill, sports, puzzle, arcade (+Pogo Jump) and strategy sets done. 79 games. Left: adventure 5, RPG 4, simulation 3+Lemonade Stand, casual 4, action 2+Robo Rumble.
