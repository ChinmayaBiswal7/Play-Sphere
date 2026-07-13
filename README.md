# 🎮 PlaySphere Console

PlaySphere Console is a next-generation web-based gaming console platform. It features a PS5-inspired dashboard with active background drifting particles, a link-controller pairing modal, user profile stats, and a dynamic 3D ambient sound system.

Players can instantly link their physical mobile phones as real-time joysticks/controllers by scanning QR codes, or play directly with keyboard hotkeys!

---

## 🚀 Key Features

*   **Sleek PS5 Dashboard**: High-fidelity landing grid with game card selections, rating pills, ambient soundtrack controller, and custom CSS boot up sequence.
*   **Dual Socket Mobile Controllers**: Low-latency WebSocket pairing. Drag virtual joysticks to move, tap responsive haptic action buttons to punch, kick, dodge, block, or serve.
*   **Targeted Phone Haptics**: Socket slot filtering ensures physical vibrations are routed directly to the specific phone controller performing the action (e.g. hitter feeling racket contact).
*   **Wrestler needle-struggle**: Real-time needle oscillations synced between the console screen and phone controllers for pinfall kick-outs.
*   **Single-Screen vs AI Modes**: Choose between playing locally with a friend (PvP) or challenging a computer bot.

---

## 🎰 The Games Catalog

| Game | Graphics | Mode | Controller Buttons | Special Features |
| :--- | :--- | :--- | :--- | :--- |
| **WWE Chibi Rumble** | 2.5D Canvas | PvP / AI | STRIKE, GRAPPLE, BLOCK, FINISHER | Irish Whip rope rebounds, Referee 1-2-3 counts, 6-wrestler roster |
| **Cricket Pro 2026** | 3D WebGL / Three.js | PvP / AI | BAT, TAP TIMING | Circular catch dials, DRS 3rd umpire reviews, batsman selection |
| **Chibi Tennis Duel** | 2.5D Canvas | PvP / AI | FLAT, LOB, POWER, DIVE | Official ITF rules, alternate serves, change of ends |
| **Football Pro 2026** | 3D WebGL / Cannon.js | PvP / AI | DRIBBLE, SHOOT, BOOST | Physics-driven ball curve trajectories, rocket-boost sprints |
| **Apex Stars F1** | 2.5D Canvas | PvP / AI | STEER, NITRO, SHOOT | Drifting kart physics, soda rocket attacks, speed stars |

---

## 🤼 WWE Chibi Rumble Gameplay Mechanics

1.  **Select Your Wrestler**: Choose between **Cody Rhodes**, **Roman Reigns**, **John Cena**, **Seth Rollins**, **Randy Orton**, or **The Rock**—each stylized with custom vector SVG cards and attribute stats.
2.  **Combat Controls**:
    *   **Light Strike**: Quick punch/kick combos.
    *   **Grapple Locking**: Lock up with your opponent to slam them, or press Grapple again to perform an **Irish Whip** throw into the ropes!
    *   **Rope Rebounds**: Whipped players bounce off elastic ropes for double damage Clothesline strikes.
    *   **Finisher Meter**: Fills on hits. Unleash a signature slam (e.g., *RKO* or *Spear*) with dramatic screen shakes and particle bursts!
    *   **Pinfall Struggles**: Stand over a downed opponent to pin them. Pinned players must tap their screen when the oscillating needle lands inside the green target zone to kick out at 2!

---

## ⌨️ PC Keyboard Fallback Mappings

If phone controllers are not connected, you can play locally using your keyboard:

*   **Player 1 (Left side)**:
    *   Locomotion: `W` (Up), `S` (Down), `A` (Left), `D` (Right)
    *   Combat Actions: `F` (Strike), `G` (Grapple), `Shift` (Block), `R` (Finisher)
    *   Kick-out struggle: `Space`
*   **Player 2 (Right side)**:
    *   Locomotion: `Arrow keys` (Up / Down / Left / Right)
    *   Combat Actions: `J` (Strike), `K` (Grapple), `L` (Block), `I` (Finisher)
    *   Kick-out struggle: `Enter`

---

## 🛠️ Local Development & Installation

1. Clone the repository and navigate to the directory:
   ```bash
   git clone https://github.com/ChinmayaBiswal7/Play-Sphere.git
   cd Play-Sphere
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the node server:
   ```bash
   node server.js
   ```
4. Access the console dashboard at [http://localhost:3000](http://localhost:3000) inside your web browser. Scan the generated QR code with your mobile device to connect!
