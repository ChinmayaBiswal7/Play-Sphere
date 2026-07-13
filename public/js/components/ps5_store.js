/**
 * PlaySphere Store Component Logic
 */

(function () {
  'use strict';

  const storeItems = {
    golden: { price: 40, name: 'Golden Bat' },
    carbon: { price: 80, name: 'Carbon Fibre Bat' },
    melbourne: { price: 120, name: 'Melbourne Ground' }
  };

  window.buyStoreItem = function(itemId) {
    const profile = window.profile;
    if (!profile) return;
    profile.unlockedItems = profile.unlockedItems || [];
    
    const item = storeItems[itemId];
    if (!item) return;

    const isUnlocked = profile.unlockedItems.includes(itemId);

    if (!isUnlocked) {
      // Attempt Purchase
      const price = item.price;
      const balance = profile.coins || 0;
      if (balance < price) {
        alert(`Insufficient coins! You need ${price} coins to buy ${item.name}. Complete game achievements to earn more.`);
        return;
      }
      
      // Deduct coins & unlock
      profile.coins = balance - price;
      profile.unlockedItems.push(itemId);
    }

    // If it's a bat item, automatically equip it!
    if (itemId === 'golden' || itemId === 'carbon') {
      profile.equippedBat = (profile.equippedBat === itemId) ? 'default' : itemId;
    }
    
    // If it is a stadium item, equip it!
    if (itemId === 'melbourne') {
      if (window.MATCH) {
        window.MATCH.stadiumName = 'melbourne';
      }
    }

    // Save changes
    if (typeof window.saveProfile === 'function') {
      window.saveProfile();
    }
  };

  window.updateStoreButtonsState = function() {
    const profile = window.profile;
    if (!profile) return;
    profile.unlockedItems = profile.unlockedItems || [];

    const items = ['golden', 'carbon', 'melbourne'];
    items.forEach(itemId => {
      const btn = document.getElementById(`store-btn-${itemId}`);
      if (!btn) return;

      const isUnlocked = profile.unlockedItems.includes(itemId);
      const isEquipped = (profile.equippedBat === itemId) || (itemId === 'melbourne' && window.MATCH && window.MATCH.stadiumName === 'melbourne');

      if (isEquipped) {
        btn.textContent = 'EQUIPPED';
        btn.className = 'ps5-store-btn equipped';
      } else if (isUnlocked) {
        btn.textContent = 'EQUIP';
        btn.className = 'ps5-store-btn';
      } else {
        btn.textContent = 'BUY';
        btn.className = 'ps5-store-btn';
      }
    });
  };

})();
