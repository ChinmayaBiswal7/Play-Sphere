/**
 * PlaySphere Music Player Component Logic
 * Streams real songs via YouTube IFrame API - unlimited, no API key required.
 */

(function () {
  'use strict';

  const PS5_PLAYLIST = [
    { id: 'JGwWNGJdvx8', title: 'Shape of You — Ed Sheeran' },
    { id: 'ktvTqknDobU', title: 'Radioactive — Imagine Dragons' },
    { id: 'RgKAFK5djSk', title: 'See You Again — Wiz Khalifa' },
    { id: 'hT_nvWreIhg', title: 'Counting Stars — OneRepublic' },
    { id: '09R8_2nJtjg', title: 'Sugar — Maroon 5' },
    { id: 'Y66j_BUCBMY', title: 'Despacito — Luis Fonsi' },
    { id: 'e-ORhEE9VVg', title: 'Girls Like You — Maroon 5' },
    { id: 'OPf0YbXqDm0', title: 'Mark Ronson — Uptown Funk' },
    { id: 'nfWlot6h_JM', title: 'Shake It Off — Taylor Swift' },
    { id: 'CevxZvSJLk8', title: 'Roar — Katy Perry' },
    { id: 'KYniUCGPGLs', title: 'Believer — Imagine Dragons' },
    { id: 'fRh_vgS2dFE', title: 'Sorry — Justin Bieber' },
    { id: 'bo_efYLyLSc', title: 'Hymn for the Weekend — Coldplay' },
    { id: '2Vv-BfVoq4g', title: 'Perfect — Ed Sheeran' },
    { id: 'pRpeEdMmmQ0', title: 'Happier — Marshmello' },
    { id: 'SlPhMPnQ58k', title: 'Thunder — Imagine Dragons' },
    { id: 'JRfuAukYTKg', title: 'Bad Guy — Billie Eilish' },
    { id: 'H7HmzwI67ec', title: 'Blinding Lights — The Weeknd' },
    { id: 'oygrmJFKYZY', title: 'Levitating — Dua Lipa' },
    { id: 'BQ0mxQXmLsk', title: 'Drivers License — Olivia Rodrigo' },
    { id: 'cNAdtkSjSps', title: 'Stay — Justin Bieber' },
    { id: 'Nh0KF3zFxOE', title: 'As It Was — Harry Styles' },
    { id: 'bCuhuePlcDo', title: 'Flowers — Miley Cyrus' },
    { id: 'mzkHdSgEJpM', title: 'Peaches — Justin Bieber' },
    { id: 'X7LARAi9wfs', title: 'Anti-Hero — Taylor Swift' },
  ];

  let ps5MusicIndex   = 0;
  let ps5MusicPlaying = false;
  let ps5MusicShuffle = false;
  let ps5YtPlayer     = null;
  let ps5YtReady      = false;

  // Load YouTube IFrame API script once
  function ps5LoadYouTubeAPI() {
    if (window.YT && window.YT.Player) { ps5OnYouTubeIframeAPIReady(); return; }
    if (document.getElementById('yt-api-script')) return;
    const tag = document.createElement('script');
    tag.id  = 'yt-api-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  // Called by YouTube API once loaded
  window.onYouTubeIframeAPIReady = function() { ps5OnYouTubeIframeAPIReady(); };

  function ps5OnYouTubeIframeAPIReady() {
    const container = document.getElementById('ps5-yt-container');
    if (!container) return;
    container.style.display = 'block';

    ps5YtPlayer = new YT.Player('ps5-yt-player', {
      width: '1',
      height: '1',
      videoId: PS5_PLAYLIST[ps5MusicIndex].id,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        autoplay: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (e) => {
          ps5YtReady = true;
          // Start on a random track each session
          ps5MusicIndex = Math.floor(Math.random() * PS5_PLAYLIST.length);
          ps5MusicShuffle = true;
          const btn = document.getElementById('ps5-music-shufflebtn');
          if (btn) btn.style.color = '#a78bfa';
          const track = PS5_PLAYLIST[ps5MusicIndex];
          ps5MusicSetTitle(track.title);
          e.target.setVolume(50);
          e.target.loadVideoById(track.id);
          e.target.playVideo();
        },
        onStateChange: (e) => {
          // YT.PlayerState.ENDED = 0
          if (e.data === 0) { ps5MusicNext(); }
          // YT.PlayerState.PLAYING = 1
          if (e.data === 1) { ps5SetVinylSpin(true);  ps5SetPlayIcon(true);  }
          // YT.PlayerState.PAUSED  = 2
          if (e.data === 2) { ps5SetVinylSpin(false); ps5SetPlayIcon(false); }
        },
        onError: (e) => {
          console.warn('YouTube player error:', e.data, '— skipping to next track');
          setTimeout(ps5MusicNext, 800);
        }
      }
    });

    window.ps5YtPlayer = ps5YtPlayer;
    window.ps5YtReady = true;
  }

  function ps5MusicSetTitle(title) {
    const el = document.getElementById('ps5-music-title');
    if (el) el.textContent = title;
  }

  function ps5SetVinylSpin(playing) {
    const v = document.getElementById('ps5-vinyl');
    if (v) v.style.animationPlayState = playing ? 'running' : 'paused';
    ps5MusicPlaying = playing;
  }

  function ps5SetPlayIcon(playing) {
    const icon = document.getElementById('ps5-music-play-icon');
    if (!icon) return;
    icon.innerHTML = playing
      ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'   // Pause icon
      : '<path d="M8 5v14l11-7z"/>';                     // Play icon
  }

  function ps5MusicLoad(index) {
    if (!ps5YtReady || !ps5YtPlayer) return;
    ps5MusicIndex = ((index % PS5_PLAYLIST.length) + PS5_PLAYLIST.length) % PS5_PLAYLIST.length;
    const track = PS5_PLAYLIST[ps5MusicIndex];
    ps5MusicSetTitle(track.title);
    ps5YtPlayer.loadVideoById(track.id);
    ps5YtPlayer.playVideo();
  }

  window.ps5MusicToggle = function() {
    if (!ps5YtReady) {
      // First interaction — load API and start playing
      ps5LoadYouTubeAPI();
      ps5MusicPlaying = true;
      return;
    }
    if (ps5MusicPlaying) {
      ps5YtPlayer.pauseVideo();
    } else {
      ps5YtPlayer.playVideo();
    }
  };

  window.ps5MusicNext = function() {
    if (!ps5YtReady) { ps5LoadYouTubeAPI(); return; }
    const next = ps5MusicShuffle
      ? Math.floor(Math.random() * PS5_PLAYLIST.length)
      : ps5MusicIndex + 1;
    ps5MusicLoad(next);
  };

  window.ps5MusicPrev = function() {
    if (!ps5YtReady) { ps5LoadYouTubeAPI(); return; }
    ps5MusicLoad(ps5MusicIndex - 1);
  };

  window.ps5MusicShuffle = function() {
    ps5MusicShuffle = !ps5MusicShuffle;
    const btn = document.getElementById('ps5-music-shufflebtn');
    if (btn) btn.style.color = ps5MusicShuffle ? '#a78bfa' : 'rgba(100,116,139,0.7)';
  };

  // Export so dashboard can see
  window.ps5LoadYouTubeAPI = ps5LoadYouTubeAPI;

})();
