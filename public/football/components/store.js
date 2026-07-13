/**
 * Football Legends 2026 - Store and Packs Opening Component
 */

import { gameState } from '../state.js';
import { AudioSynth } from '../audio.js';
import { FirebaseSync } from '../profile.js';

export function renderStore(container) {
  const updateStorePills = () => {
    const coinEl = document.querySelector('.sub-coin-count');
    const gemEl = document.querySelector('.sub-gem-count');
    if (coinEl) coinEl.innerText = (FirebaseSync.profile.coins || 12450).toLocaleString();
    if (gemEl) gemEl.innerText = (FirebaseSync.profile.gems || 860).toLocaleString();
    
    // Also update main dashboard ones if visible in DOM
    FirebaseSync.updateProfileHUD();
  };

  container.innerHTML = `
    <div class="subscreen-layout">
      <!-- Left Tabs -->
      <aside class="subscreen-sidebar">
        <button class="sub-tab-btn active">FEATURED</button>
        <button class="sub-tab-btn">PACKS</button>
        <button class="sub-tab-btn">COINS</button>
        <button class="sub-tab-btn">GEMS</button>
        <button class="sub-tab-btn">BOOSTS</button>
        <button class="sub-tab-btn">DAILY DEALS</button>
      </aside>

      <!-- Main Body -->
      <main class="subscreen-main-content store-layout-content">
        
        <!-- Packs Row -->
        <h3 class="panel-section-title">CARD PACKS</h3>
        <div class="store-packs-grid">
          
          <!-- Starter Pack -->
          <div class="store-pack-card pack-starter">
            <div class="pack-badge">GEM</div>
            <div class="pack-glow-effect"></div>
            <strong>STARTER PACK</strong>
            <p>Guaranteed 1 OVR 75+ player to boost your chemistry.</p>
            <button class="menu-btn primary-btn buy-pack-btn" data-cost="700" data-name="STARTER PACK">💎 700</button>
          </div>

          <!-- Premium Pack -->
          <div class="store-pack-card pack-premium">
            <div class="pack-badge">GEM</div>
            <div class="pack-glow-effect"></div>
            <strong>PREMIUM PACK</strong>
            <p>Guaranteed 1 OVR 80+ player + 200 coins.</p>
            <button class="menu-btn primary-btn buy-pack-btn" data-cost="1500" data-name="PREMIUM PACK">💎 1,500</button>
          </div>

          <!-- Legendary Pack -->
          <div class="store-pack-card pack-legendary">
            <div class="pack-badge">GEM</div>
            <div class="pack-glow-effect"></div>
            <strong>LEGENDARY PACK</strong>
            <p>Guaranteed 1 OVR 85+ superstar player.</p>
            <button class="menu-btn primary-btn buy-pack-btn" data-cost="3000" data-name="LEGENDARY PACK">💎 3,000</button>
          </div>

          <!-- Ultimate Pack -->
          <div class="store-pack-card pack-ultimate">
            <div class="pack-badge">GEM</div>
            <div class="pack-glow-effect"></div>
            <strong>ULTIMATE PACK</strong>
            <p>2 guaranteed OVR 88+ icons + 1,000 coins.</p>
            <button class="menu-btn primary-btn buy-pack-btn" data-cost="5000" data-name="ULTIMATE PACK">💎 5,000</button>
          </div>

        </div>

        <!-- Daily Deals -->
        <h3 class="panel-section-title" style="margin-top: 20px;">DAILY DEALS</h3>
        <div class="store-deals-row">
          
          <div class="deal-card" id="deal-free-coins">
            <span class="deal-badge">FREE</span>
            <div class="deal-icon">🪙</div>
            <strong>100 COINS</strong>
            <p>Claim daily bonus</p>
          </div>

          <div class="deal-card" id="deal-gems">
            <span class="deal-badge">HOT</span>
            <div class="deal-icon">💎</div>
            <strong>250 GEMS</strong>
            <p>₹89.00 INR</p>
          </div>

          <div class="deal-card" id="deal-xp">
            <span class="deal-badge">BOOST</span>
            <div class="deal-icon">⚡</div>
            <strong>XP BOOST</strong>
            <p>₹59.00 INR</p>
          </div>

          <div class="deal-card" id="deal-energy">
            <span class="deal-badge">REFILL</span>
            <div class="deal-icon">⚡</div>
            <strong>FULL ENERGY</strong>
            <p>₹39.00 INR</p>
          </div>

        </div>

      </main>
    </div>
  `;

  // Bind buys
  document.querySelectorAll('.buy-pack-btn').forEach(btn => {
    btn.onclick = () => {
      const cost = parseInt(btn.getAttribute('data-cost'));
      const packName = btn.getAttribute('data-name');
      const profileGems = FirebaseSync.profile.gems || 860;

      if (profileGems < cost) {
        AudioSynth.playPost();
        alert(`Insufficient Diamonds! You need ${cost - profileGems} more Diamonds to purchase the ${packName}.`);
      } else {
        AudioSynth.playCheer();
        FirebaseSync.profile.gems = profileGems - cost;
        
        // Award OVR boost
        alert(`Congratulations! You opened the ${packName} and unlocked an OVR 89 Superstar player! OVR rating boosted!`);
        
        FirebaseSync.recordMatchStats(0, 0); 
        updateStorePills();
      }
    };
  });

  document.getElementById('deal-free-coins').onclick = () => {
    AudioSynth.playCheer();
    FirebaseSync.profile.coins = (FirebaseSync.profile.coins || 12450) + 100;
    alert("Claimed 100 FREE Coins daily deal!");
    FirebaseSync.recordMatchStats(0, 0);
    updateStorePills();
  };
}
