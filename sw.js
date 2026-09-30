// sw.js — service worker: makes ASHEN KAGE work fully offline once loaded.
const CACHE = 'ashen-kage-v1';
const ASSETS = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icon.svg',
  './src/main.js', './src/input.js', './src/game.js', './src/player.js',
  './src/camera.js', './src/physics.js', './src/renderer.js', './src/character.js',
  './src/entities.js', './src/audio.js', './src/save.js',
  './src/levels/kit.js', './src/levels/index.js',
  './src/levels/ch1.js', './src/levels/ch2.js', './src/levels/ch3.js', './src/levels/ch4.js',
  './src/levels/ch5.js', './src/levels/ch6.js', './src/levels/ch7.js',
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', (e)=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(hit=> hit || fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=> caches.match('./index.html')))
  );
});
