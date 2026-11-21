# AI Boss Fight — Boss Jo Seekhta Hai (Expanded Edition)

An 8-level top-down shooter built with vanilla HTML, CSS and JavaScript.

## Run
1. Extract the ZIP.
2. Open the `ai_boss_fight` folder in VS Code.
3. Open `index.html` in a browser, or use the VS Code Live Server extension.

## Controls
- WASD / Arrow keys: move
- Mouse: aim
- Left click / Space: shoot
- Shift: dash

## What's new
- **8 campaign levels** with different arena palettes and increasing boss health/speed.
- **Human-like stylised fighters:** visible head, torso, arms, hands, legs, boots, visor and handgun.
- **Animation:** walking stride, moving boss, weapon muzzle flashes, glowing projectiles, hit particles, damage feedback, camera shake and level banners.
- **Adaptive boss:** records movement direction, stationary behaviour and shooting rhythm; uses these observations to lead shots or widen its spread.
- **Progression:** health refill between levels and a final campaign victory screen.

## Files
- `index.html`: layout and HUD
- `style.css`: interface styling
- `game.js`: game engine, fighter drawing, animations, collision, levels and adaptation

No frameworks, external assets, AI API or installation required. The fighter artwork is drawn directly in Canvas so the project stays self-contained and editable.
