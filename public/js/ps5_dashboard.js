/**
 * PlaySphere 5 Console Dashboard Bootstrapper
 * Groups separate sub-components into the main console root layout and initializes boot.
 */

(function () {
  'use strict';

  function injectConsoleUI() {
    let root = document.getElementById('ps5-console-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'ps5-console-root';
      document.body.appendChild(root);
    }

    // Move loaded components from document body to the console root
    const componentsToMove = [
      'ps5-boot',
      'ps5-dash',
      'ps5-store-view',
      'ps5-friends-modal',
      'ps5-profile-modal',
      'ps5-controller-modal',
      'ps5-launch'
    ];

    componentsToMove.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        root.appendChild(el);
      }
    });

    // Nest the music player inside the dashboard home so it inherits its visibility lifecycle
    const dash = document.getElementById('ps5-dash');
    const musicPlayer = document.getElementById('ps5-music-player');
    if (dash && musicPlayer) {
      dash.appendChild(musicPlayer);
    }

    // Setup close/click outside listeners for modals
    const friendsModal = document.getElementById('ps5-friends-modal');
    if (friendsModal) {
      friendsModal.onclick = (e) => {
        if (e.target === friendsModal && window.friendsManager) {
          window.friendsManager.closeFriendsModal();
        }
      };
    }

    const controllerModal = document.getElementById('ps5-controller-modal');
    if (controllerModal) {
      controllerModal.onclick = (e) => {
        if (e.target === controllerModal) {
          controllerModal.classList.remove('show');
        }
      };
    }

    const profileModal = document.getElementById('ps5-profile-modal');
    if (profileModal) {
      profileModal.onclick = (e) => {
        if (e.target === profileModal) {
          const currentUser = window.currentUser;
          if (currentUser && !window.profileNeedsComplete) {
            delete profileModal.dataset.userOpened;
            profileModal.classList.remove('show');
          }
        }
      };
    }

    console.log("PlaySphere Console UI Subviews Grouped.");
  }

  function initConsoleDashboard() {
    injectConsoleUI();

    // Start pre-checking Firebase auth status immediately in the background
    if (typeof window.ensureFirebase === 'function') {
      window.ensureFirebase().catch(err => console.warn("Background Firebase init error:", err));
    }
  }

  // Run bootstrapper immediately since components are already parsed in the DOM via document.write
  initConsoleDashboard();

})();
