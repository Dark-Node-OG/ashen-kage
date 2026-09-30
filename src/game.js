// game.js — state machine, level manager, progression, menus.
import { Player } from './player.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { aabb, clamp } from './physics.js';
import { CHAPTERS } from './levels/index.js';
import { Audio } from './audio.js';
import { Save } from './save.js';

const $ = (id)=> document.getElementById(id);
const SPLASH_DUR = 3.8;   // DARK NODE studio splash seconds
const LOAD_DUR   = 4.0;   // ASHEN KAGE loading seconds

export class Game{
  constructor(canvas){
    this.renderer = new Renderer(canvas);
    this.cam = new Camera();
    this.audio = new Audio();
    this.player = new Player(0,0);
    this.state = 'menu';                 // menu|chapters|settings|play|pause|dead|complete|victory
    this.prevPlayState = 'play';
    this.time = 0; this.deaths = 0; this.chapterStart = 0;
    this.campaignDeaths = 0; this.campaignStart = 0;
    this.chapterIndex = 0;
    this.trial = false; this.ng = false;
    this.bot = false; this.invincible = false;          // watch-mode autopilot + god mode
    this._botJump = false; this._botLastX = 0; this._botStuckT = 0;
    this._stepMark = 0; this._prevGround = true; this._fallSpeed = 0;
    this.audioStarted = false;

    Save.load();
    this.ui = {
      splash:$('splashScreen'), loading:$('loadingScreen'), loadFill:$('loadFill'),
      menu:$('menuScreen'), chapters:$('chaptersScreen'), settings:$('settingsScreen'),
      pause:$('pauseScreen'), death:$('deathScreen'), complete:$('completeScreen'),
      victory:$('victoryScreen'), gameover:$('gameoverScreen'),
      chapter:$('chapterTitle'), deathC:$('deathCounter'), lives:$('livesHud'),
      stats:$('completeStats'), doneTitle:$('completeTitle'),
      victoryStats:$('victoryStats'), trialsBtn:$('trialsBtn'),
      chapterList:$('chapterList'), ngRow:$('ngRow'),
      volMaster:$('volMaster'), volMusic:$('volMusic'), volSfx:$('volSfx'),
    };
    this._bindUI();
    this._refreshMenu();
    this._loadSettingsUI();
    // build a first world so render has something behind the intro/menu
    this._loadChapter(0, { silent:true });
    // begin with the studio splash
    this.state = 'splash'; this.splashT = 0; this.loadT = 0; this.demo = false;
    this._show('splash');
    // hard timer fallback so the intro always advances even if the render loop stalls
    setTimeout(()=>{ if(this.state==='splash') this._toLoading(); }, SPLASH_DUR*1000 + 200);
  }

  // ---------------- UI ----------------
  _bindUI(){
    this.ui.menu.querySelectorAll('[data-act]').forEach(b=> b.onclick=()=>this._menuAct(b.dataset.act));
    this.ui.chapters.querySelectorAll('[data-act]').forEach(b=> b.onclick=()=>this._menuAct(b.dataset.act));
    this.ui.settings.querySelectorAll('[data-act]').forEach(b=> b.onclick=()=>this._menuAct(b.dataset.act));
    this.ui.pause.querySelectorAll('[data-act]').forEach(b=> b.onclick=()=>this._menuAct(b.dataset.act));
    this.ui.victory.querySelectorAll('[data-act]').forEach(b=> b.onclick=()=>this._menuAct(b.dataset.act));
    this.ui.gameover.querySelectorAll('[data-act]').forEach(b=> b.onclick=()=>this._menuAct(b.dataset.act));
    $('continueBtn').onclick = ()=> this._advance();
    $('pauseBtn').onclick = ()=> this._togglePause();

    const wire=(el,key)=>{ el.oninput=()=>{ const v=el.value/100;
      const s={...Save.getSettings(),[key]:v}; Save.setSettings(s); this.audio.setVolumes(s); }; };
    wire(this.ui.volMaster,'master'); wire(this.ui.volMusic,'music'); wire(this.ui.volSfx,'sfx');

    window.addEventListener('keydown',(e)=>{ if(e.code==='KeyM') this.audio.toggleMute(); });

    // first user interaction unlocks audio (browsers block autoplay) and can skip the splash
    const unlock=()=>{
      const first = !this.audioStarted;
      this._startAudio();
      if(first && this.state==='splash') this.audio.studioSting();
      if(this.state==='splash') this.splashT = Math.max(this.splashT, SPLASH_DUR-1.0);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }
  _loadSettingsUI(){ const s=Save.getSettings();
    this.ui.volMaster.value=s.master*100; this.ui.volMusic.value=s.music*100; this.ui.volSfx.value=s.sfx*100; }

  _show(name){
    ['splash','loading','menu','chapters','settings','pause','death','complete','victory','gameover'].forEach(k=>
      this.ui[k] && this.ui[k].classList.toggle('show', k===name));
    document.body.classList.toggle('playing', name===null);
  }

  _startAudio(){ if(!this.audioStarted){ this.audio.init(Save.getSettings()); this.audioStarted=true; } else this.audio.init(); }

  _menuAct(act){
    this._startAudio();
    switch(act){
      case 'new':      this.trial=false; this.ng=false; this.bot=false; this._newJourney(); break;
      case 'retry':    this._show(null); this.state='play'; this._loadChapter(this.chapterIndex); break;
      case 'continue': this.trial=false; this._continue(); break;
      case 'chapters': this.trial=false; this._openChapters(); break;
      case 'trials':   if(this._campaignDone()){ this.trial=true; this._openChapters(); } break;
      case 'settings': this.prevScreen=this.state; this.state='settings'; this._show('settings'); break;
      case 'back':
        if(this.state==='settings' && this.prevScreen==='pause'){ this.state='pause'; this._show('pause'); }
        else if(this.state==='settings' && this.prevScreen==='chapters'){ this._openChapters(); }
        else this._toMenu();
        break;
      case 'resume':   this._togglePause(); break;
      case 'restart':  this._show(null); this.state='play'; this._loadChapter(this.chapterIndex); break;
      case 'menu':     this._toMenu(); break;
      case 'wipe':     Save.wipe(); this._loadSettingsUI(); this._refreshMenu(); this._openChapters(); break;
    }
  }
  _toMenu(){ this.state='menu'; this._refreshMenu(); this._show('menu'); }

  _refreshMenu(){
    const done = this._campaignDone();
    this.ui.trialsBtn.disabled = !done;
    this.ui.trialsBtn.textContent = done ? 'Ashen Trials' : 'Ashen Trials 🔒';
  }

  _campaignDone(){ return !!(Save.getLevel(CHAPTERS[CHAPTERS.length-1].id)?.completed); }
  _unlocked(i){ if(i===0||this._campaignDone()) return true;
    return !!(Save.getLevel(CHAPTERS[i-1].id)?.completed); }
  _mastery(i){ const r=Save.getLevel(CHAPTERS[i].id); if(!r||!r.completed) return 0;
    let m=45; if(r.shrinesMax) m+=35*(r.shrines/r.shrinesMax); if(r.leastDeaths===0) m+=20;
    return Math.min(100,Math.round(m)); }

  _openChapters(){
    this.state='chapters';
    const list=this.ui.chapterList; list.innerHTML='';
    CHAPTERS.forEach((ch,i)=>{
      const rec=Save.getLevel(ch.id); const unlocked=this._unlocked(i); const m=this._mastery(i);
      const card=document.createElement('div');
      card.className='chapter-card'+(unlocked?'':' locked');
      const best= rec? `Best ${this._fmt(rec.bestTime)} · ${rec.leastDeaths} deaths · Shrines ${rec.shrines}/${rec.shrinesMax}` : 'Locked';
      card.innerHTML=`<div class="roman">CHAPTER ${ch.roman}</div>
        <div class="cname">${unlocked?ch.title:'— — —'}</div>
        <div class="cstat">${unlocked?(rec?best:'Not yet walked'):'Complete the previous chapter'}</div>
        <div class="bar"><i style="width:${m}%"></i></div>`;
      if(unlocked) card.onclick=()=>{ this._show(null); this.state='play';
        this.chapterIndex=i; this.campaignStart=this.time; this.campaignDeaths=0; this._loadChapter(i); };
      list.appendChild(card);
    });
    // NG+ toggle appears once the campaign is finished
    this.ui.ngRow.innerHTML='';
    if(this._campaignDone()){
      const t=document.createElement('button'); t.className='ng-toggle'+(this.ng?' on':'');
      t.textContent = this.ng?'NEW JOURNEY+  ON':'NEW JOURNEY+  OFF';
      t.onclick=()=>{ this.ng=!this.ng; this._openChapters(); };
      this.ui.ngRow.appendChild(t);
      if(this.trial){ const tag=document.createElement('div'); tag.className='cstat';
        tag.style.alignSelf='center'; tag.textContent='ASHEN TRIAL: reach the shrine without dying.';
        this.ui.ngRow.appendChild(tag); }
    }
    this._show('chapters');
  }

  _newJourney(){ this.chapterIndex=0; this.campaignStart=this.time; this.campaignDeaths=0;
    this.state='play'; this._show(null); this._loadChapter(0); }
  _continue(){ let i=0; for(let k=0;k<CHAPTERS.length;k++){ if(this._unlocked(k)) i=k; }
    this.chapterIndex=i; this.campaignStart=this.time; this.campaignDeaths=0;
    this.state='play'; this._show(null); this._loadChapter(i); }

  // ---------------- Level loading ----------------
  _loadChapter(i, opts={}){
    const def = CHAPTERS[i];
    const L = def.build();
    this.level = L; this.chapterIndex = i;
    if(this.ng) this._applyNGplus(L);
    this.checkpoint = { ...L.spawn };
    this.player.reset(L.spawn.x, L.spawn.y);
    this.cam.setBounds(L.bounds);
    this.cam.x = L.spawn.x - this.renderer.vw/2; this.cam.y = L.spawn.y - this.renderer.vh*0.55;
    this.deaths = 0; this.chapterStart = this.time;
    this.lives = 3; this._updateHearts();
    this._stepMark=0; this._prevGround=true; this._fallSpeed=0;
    this._botLastX=L.spawn.x; this._botStuckT=0; this._botJump=false;

    this.world = {
      statics:L.statics, boxes:L.boxes, spikes:L.spikes, gates:L.gates, plates:L.plates,
      levers:L.levers, mplats:L.mplats, crushers:L.crushers, collapses:L.collapses,
      rocks:L.rocks, waterZones:L.waterZones, traps:L.traps, ropes:L.ropes, boats:L.boats,
      checkpoints:L.checkpoints, lights:L.lights, story:L.story, goal:L.goal, theme:L.theme,
      solids: ()=> [ ...L.statics, ...L.gates, ...L.mplats, ...L.boxes, ...L.collapses, ...L.boats ],
      onJump: ()=> { this.cam.addShake(1.5); this.audio.jump(); },
    };

    if(!opts.silent){
      this.ui.chapter.textContent = `Chapter ${def.roman} · ${L.title}`+(this.trial?'  ·  TRIAL':'')+(this.ng?'  ·  NG+':'');
      this.ui.chapter.classList.add('show');
      clearTimeout(this._cardT);
      this._cardT=setTimeout(()=> this.ui.chapter.classList.remove('show'), 5000);
      this.audio.bell(147,0.16);
    }
  }
  _applyNGplus(L){
    L.crushers.forEach(k=> k.period *= 0.78);
    L.collapses.forEach(c=> c.fuse *= 0.65);
    L.mplats.forEach(m=> m.speed *= 1.2);
  }

  // ---------------- Loop ----------------
  update(dt){
    this.time += dt;

    if(this.state==='splash'){ this._splashStep(dt); return; }
    if(this.state==='loading'){ this._loadingStep(dt); return; }
    if(this.state==='dead'){ this.player.deathT+=dt; this.deathTimer-=dt; if(this.deathTimer<=0) this._respawn(); return; }
    // Escape toggles pause from either play or pause
    if((this.state==='play'||this.state==='pause') && Input.pausePressed){ this._togglePause(); return; }
    if(this.state!=='play'){ return; }

    if(this.bot) this._botInput(dt);            // autopilot writes the inputs

    const W=this.world;
    for(const b of W.boxes) b.update(dt, this.level.statics, W.boxes);
    for(const g of W.gates) g.update(dt);
    for(const m of W.mplats) m.update(dt);
    this.player.ridingBoat = null;
    for(const bt of W.boats){
      const rider = this.player.onGround && Math.abs((this.player.y+this.player.h)-bt.y)<6
                 && this.player.x+this.player.w>bt.x && this.player.x<bt.x+bt.w;
      if(rider && bt.inWater) this.player.ridingBoat = bt;
      const drive = (rider && bt.inWater) ? ((Input.actions.right?1:0)-(Input.actions.left?1:0)) : 0;
      bt.update(dt, this.level.statics, W.waterZones, drive);
    }
    for(const k of W.crushers) k.update(this.time);
    for(const cp of W.collapses) cp.update(dt, this.player);
    for(const r of W.rocks){ r.update(dt, this.player); if(r.justLanded){ this.cam.addShake(6); this.audio.land(1); } }
    for(const tr of W.traps){ tr.update(dt, this.player); if(tr.justSnapped){ tr.justSnapped=false; this.cam.addShake(5); } }
    for(const r of W.ropes){ if(r!==this.player.rope) r.idle(dt); }
    const weights=[ this.player, ...W.boxes ];
    for(const p of W.plates) p.update(weights);

    // lever interaction (edge-triggered J when standing by a lever)
    if(Input.grabPressed && !this.player.grabbing){
      for(const lv of W.levers){
        if(aabb(this.player,{x:lv.x-14,y:lv.y-6,w:lv.w+28,h:lv.h+12})){ lv.interact(); this.audio.chime(); break; }
      }
    }

    // player
    W.boxes.forEach(b=> b.grabbed = (b===this.player.grabbing));
    if(!this.player.onGround && this.player.vy>0) this._fallSpeed=this.player.vy;
    this.player.update(dt, W);

    // footsteps + landing
    if(this.player.onGround && Math.abs(this.player.vx)>40 && !this.player.inWater){
      const mark=Math.floor((this.player.anim?.cycle||0)/Math.PI);
      if(mark!==this._stepMark){ this._stepMark=mark; this.audio.footstep(); }
    }
    if(this.player.onGround && !this._prevGround && this._fallSpeed>260){
      this.audio.land(clamp(this._fallSpeed/1200,0,1));
      this.cam.addShake(this._fallSpeed>900?3:1);
    }
    this._prevGround=this.player.onGround; if(this.player.onGround) this._fallSpeed=0;

    this.cam.follow(this.player, this.renderer.vw, this.renderer.vh, dt);
    if(this.bot) this._botStuckCheck(dt);       // nudge the bot forward if it gets stuck

    // ---- death checks ----
    let dead=false, kind='spike';
    for(const s of W.spikes){ if(aabb(this.player,s)){ dead=true; kind='spike'; break; } }
    if(!dead) for(const k of W.crushers){ if(aabb(this.player,{x:k.x,y:k.y,w:k.w,h:k.h})){ dead=true; kind='crush'; break; } }
    if(!dead) for(const tr of W.traps){ if(tr.deadly && aabb(this.player,tr.rect)){ dead=true; kind='crush'; break; } }
    if(!dead) for(const r of W.rocks){ if(r.deadly && aabb(this.player,r)){ dead=true; kind='crush'; break; } }
    if(!dead && this.player.y>this.level.bounds.maxY+220){ dead=true; kind='fall'; }
    if(dead) return this._die(kind);

    // ---- checkpoints ----
    for(const cp of W.checkpoints){
      if(!cp.active && aabb(this.player,{x:cp.x-10,y:cp.y,w:cp.w+20,h:cp.h})){
        cp.active=true; this.checkpoint={ x:cp.x, y:cp.y-30 }; this.audio.chime();
      }
    }

    if(W.goal && (aabb(this.player,W.goal) ||
       (this.bot && (this.player.x+this.player.w/2) > W.goal.x+6))) this._complete();

    this.ui.deathC.textContent = this.deaths>0 ? ('DEATHS  '+this.deaths) : '';
  }
  _updateHearts(){
    if(!this.ui.lives) return;
    this.ui.lives.textContent = this.trial ? '' :
      '♥ '.repeat(Math.max(0,this.lives)) + '♡ '.repeat(Math.max(0,3-this.lives));
  }

  // ---------------- Intro: studio splash -> loading -> menu ----------------
  _splashStep(dt){
    this.splashT += dt;
    if(this.splashT >= SPLASH_DUR) this._toLoading();
  }
  _toLoading(){
    if(this.state==='loading') return;
    this.state='loading'; this.loadT=0; this.demo=true;
    this._loadChapter(0, { silent:true });      // fresh ch1 for the walking background
    this.ui.loadFill.style.width='0%';
    this._show('loading');
    this.audio.bell(196,0.16);
    clearTimeout(this._loadTimer);
    this._loadTimer = setTimeout(()=>{ if(this.state==='loading') this._introDone(); }, LOAD_DUR*1000 + 300);
  }
  _loadingStep(dt){
    // the wanderer walks on his own across the opening ground
    Input.actions.right = this.player.x < 820;  // stop before the first gap
    Input.actions.left  = false;
    for(const m of this.world.mplats) m.update(dt);
    this.player.update(dt, this.world);
    this.cam.follow(this.player, this.renderer.vw, this.renderer.vh, dt);
    if(this.player.onGround && Math.abs(this.player.vx)>40){
      const mk=Math.floor((this.player.anim?.cycle||0)/Math.PI);
      if(mk!==this._stepMark){ this._stepMark=mk; this.audio.footstep(); }
    }
    Input.actions.right=false;
    this.loadT += dt;
    this.ui.loadFill.style.width = Math.min(100, (this.loadT/LOAD_DUR)*100)+'%';
    if(this.loadT >= LOAD_DUR) this._introDone();
  }
  _introDone(){
    this.demo=false;
    this._loadChapter(0, { silent:true });       // reset the background to the start
    this._toMenu();
  }

  // ---------------- Watch-mode autopilot ----------------
  _botInput(dt){
    const p=this.player, W=this.world, A=Input.actions;
    A.left=A.right=A.up=A.down=A.grab=false;
    const goalX = W.goal ? W.goal.x+20 : this.level.bounds.maxX-80;
    const wantRight = (p.x+p.w/2) < goalX;

    if(p.inWater){ A.right=wantRight; A.up=true; A.jump=false; this._botJump=false; return; }
    A.right = wantRight;

    // open any lever it stands beside; push a crate directly ahead
    for(const lv of W.levers){ if(!lv.on && aabb(p,{x:lv.x-22,y:lv.y-12,w:lv.w+44,h:lv.h+24})){ lv.interact(); this.audio.chime(); } }
    for(const b of W.boxes){ if(b.x>p.x && (b.x-(p.x+p.w))<18 && (p.y+p.h)-b.y>10) A.grab=true; }

    // look ahead for gaps, hazards, walls, crushers
    const probeX=p.x+p.w+26, footY=p.y+p.h+6;
    const groundAhead = this._solidAt(probeX,footY)||this._solidAt(probeX,footY+22)
                      || this._solidAt(probeX,footY+52)||this._solidAt(probeX+34,footY+84);
    const hazard = this._deadlyAhead(p,152);
    const wall   = this._solidAt(p.x+p.w+6,p.y+p.h-8) && this._solidAt(p.x+p.w+6,p.y+p.h*0.4);
    const crusherWait = this._crusherWait(p,150);

    let wantJump=false;
    if(p.onGround){ if(!groundAhead) wantJump=true; if(hazard) wantJump=true; if(wall) wantJump=true; }
    if(crusherWait){ A.right=false; wantJump=false; }

    if(wantJump && p.onGround){ p.buffer=0.12; this._botJump=true; }
    if(this._botJump && !p.onGround && p.vy>=0) this._botJump=false;   // release at apex for full height
    A.jump = this._botJump;
  }
  _botStuckCheck(dt){
    const p=this.player;
    if(Math.abs(p.x-this._botLastX)<1.5) this._botStuckT+=dt; else { this._botStuckT=0; this._botLastX=p.x; }
    if(this._botStuckT>2.4){ this._botStuckT=0; this._botTeleport(); }
  }
  _botTeleport(){
    const p=this.player;
    for(let x=p.x+140; x<this.level.bounds.maxX; x+=36){
      const top=this._groundTopAt(x);
      if(top!=null){ p.x=x; p.y=top-p.h-1; p.vx=0; p.vy=0;
        if(p.rope){ p.rope.grabbed=false; p.rope=null; } this._botLastX=p.x; return; }
    }
  }
  _solidAt(x,y){ for(const s of this.world.solids()){ if(s.solid && x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h) return true; } return false; }
  _groundTopAt(x){ let best=null; for(const s of this.world.solids()){ if(!s.solid) continue;
    if(s.type==='gate'||s.type==='crusher') continue;
    if(x>=s.x&&x<=s.x+s.w && (best==null||s.y<best)) best=s.y; } return best; }
  _deadlyAhead(p,range){ const z={x:p.x+p.w,y:p.y-8,w:range,h:p.h+30};
    for(const s of this.world.spikes){ if(aabb(z,s)) return true; }
    for(const t of this.world.traps){ if(aabb(z,{x:t.x,y:t.y-30,w:t.w,h:36})) return true; }
    for(const r of this.world.rocks){ if(r.deadly && aabb(z,r)) return true; }
    return false; }
  _crusherWait(p,range){ for(const k of this.world.crushers){
    const ahead = k.x>p.x-20 && k.x<p.x+range;
    const lane  = (k.y<p.y+p.h) && (k.y+k.h>p.y-4);
    if(ahead && lane) return true; } return false; }

  _togglePause(){
    if(this.state==='play'){ this.state='pause'; this._show('pause'); }
    else if(this.state==='pause'){ this.state='play'; this._show(null); }
  }

  _die(kind='spike'){
    if(this.state!=='play') return;
    if(this.bot || this.invincible) return;      // watch-mode / god mode never die
    this.deaths++; this.campaignDeaths++;
    if(!this.trial){ this.lives--; this._updateHearts(); }
    this.player.kill(kind);
    const px=this.player.deathX, py=this.player.deathY;
    this.renderer.bloodBurst(px, py, kind);
    this.cam.addShake(kind==='crush'?14:10);
    if(kind==='crush') this.audio.crush(); else this.audio.death();
    this.state='dead'; this.deathTimer=1.35;
    if(this.trial){                      // Ashen Trial: any death restarts the chapter
      this._trialFailed=true;
      this.ui.death.querySelector('.death-text').textContent='TRIAL FAILED';
    } else {
      this.ui.death.querySelector('.death-text').textContent='…';
    }
    setTimeout(()=>{ if(this.state==='dead') this.ui.death.classList.add('show'); }, 450);
  }
  _respawn(){
    this.ui.death.classList.remove('show');
    if(this.trial && this._trialFailed){ this._trialFailed=false; this._loadChapter(this.chapterIndex); this.state='play'; return; }
    if(!this.trial && this.lives<=0){ this.state='gameover'; this._show('gameover'); return; }
    this.player.reset(this.checkpoint.x, this.checkpoint.y);
    this.state='play';
  }

  _fmt(s){ if(!isFinite(s)) return '--:--';
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.round(s)%60).padStart(2,'0')}`; }

  _complete(){
    if(this.state==='complete'||this.state==='victory') return;
    this.audio.bell(196,0.26); setTimeout(()=>this.audio.bell(147,0.20),700);
    const secs=Math.max(0,Math.floor(this.time-this.chapterStart));
    const found=this.world.checkpoints.filter(c=>c.active).length;
    const maxShrines=this.world.checkpoints.length;
    const def=CHAPTERS[this.chapterIndex];

    const { record, improved } = Save.recordLevel(def.id,
      { time:secs, deaths:this.deaths, shrines:found, shrinesMax:maxShrines });
    this._refreshMenu();

    const star=(on)=> on? ' <span style="color:#c9922e">★ best</span>':'';
    const trialLine = this.trial ? (this.deaths===0
      ? '<br/><span style="color:#c9922e">ASHEN TRIAL PASSED ★</span>'
      : '<br/><span style="color:#7a2419">Trial not clean</span>') : '';

    if(this.chapterIndex >= CHAPTERS.length-1 && !this.trial){
      // final chapter -> the story ends
      this.state='victory';
      const total=Math.max(0,Math.floor(this.time-this.campaignStart));
      this.ui.victoryStats.innerHTML =
        `Journey time&nbsp;&nbsp;${this._fmt(total)}<br/>Total deaths&nbsp;&nbsp;${this.campaignDeaths}`;
      this._show('victory');
      return;
    }

    this.state='complete';
    this.ui.doneTitle.textContent = `${def.roman}. ${def.title}`;
    this.ui.stats.innerHTML =
      `Time&nbsp;&nbsp;${this._fmt(secs)}${star(improved.time)}<br/>`+
      `Deaths&nbsp;&nbsp;${this.deaths}${star(improved.deaths)}<br/>`+
      `Shrines&nbsp;&nbsp;${found}/${maxShrines}`+
      `<br/><span style="opacity:.55;font-size:13px">Best ${this._fmt(record.bestTime)} · ${record.leastDeaths} deaths</span>`+
      trialLine;
    $('continueBtn').textContent = this.trial ? 'Back to Trials' : 'Walk On';
    this._show('complete');
    if(this.bot) setTimeout(()=>{ if(this.state==='complete') this._advance(); }, 2600);
  }

  _advance(){
    if(this.trial){ this._openChapters(); return; }
    const next=this.chapterIndex+1;
    if(next<CHAPTERS.length){ this.state='play'; this._show(null); this._loadChapter(next); }
    else { this._toMenu(); }
  }

  render(){ this.renderer.render(this.world, this.player, this.cam, this.time); }
}
