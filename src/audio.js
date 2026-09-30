// audio.js — all sound is SYNTHESISED live with the Web Audio API (no files to download).
// Wind + insects ambience, footsteps, jump/land, death, checkpoint chime, temple bell.
export class Audio{
  constructor(){
    this.ok = false;
    this.vol = { master:0.8, music:0.7, sfx:0.9 };
    this.muted = false;
    this.ctx = null;
  }

  // must be called from a user gesture (the Start button)
  init(vol){
    if(this.ctx) { this.ctx.resume && this.ctx.resume(); return; }
    if(vol) this.vol = { ...this.vol, ...vol };
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const c = this.ctx;

      this.master = c.createGain(); this.master.gain.value = this.vol.master;
      this.master.connect(c.destination);

      this.musicG = c.createGain(); this.musicG.gain.value = this.vol.music; this.musicG.connect(this.master);
      this.sfxG   = c.createGain(); this.sfxG.gain.value   = this.vol.sfx;   this.sfxG.connect(this.master);

      this._noiseBuf = this._makeNoise(2.0);
      this.ok = true;
      this._startAmbience();
    }catch(e){ console.warn('audio init failed', e); this.ok=false; }
  }

  setVolumes(v){ this.vol={...this.vol,...v};
    if(!this.ok) return;
    this.master.gain.value = this.muted?0:this.vol.master;
    this.musicG.gain.value = this.vol.music;
    this.sfxG.gain.value   = this.vol.sfx;
  }
  toggleMute(){ this.muted=!this.muted; if(this.ok) this.master.gain.value = this.muted?0:this.vol.master; return this.muted; }

  _makeNoise(sec){
    const c=this.ctx, n=Math.floor(c.sampleRate*sec);
    const buf=c.createBuffer(1,n,c.sampleRate); const d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    return buf;
  }
  _noiseSource(loop=false){ const s=this.ctx.createBufferSource(); s.buffer=this._noiseBuf; s.loop=loop; return s; }

  // ---------- looping wind + night ambience ----------
  _startAmbience(){
    const c=this.ctx;
    // wind = looped noise -> lowpass, gusts via slow LFO on filter + gain
    const src=this._noiseSource(true);
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420; lp.Q.value=0.7;
    const g=c.createGain(); g.gain.value=0.10;
    src.connect(lp); lp.connect(g); g.connect(this.musicG);

    const lfo=c.createOscillator(); lfo.frequency.value=0.08;
    const lfoG=c.createGain(); lfoG.gain.value=260;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);

    const lfo2=c.createOscillator(); lfo2.frequency.value=0.05;
    const lfo2G=c.createGain(); lfo2G.gain.value=0.06;
    lfo2.connect(lfo2G); lfo2G.connect(g.gain);

    // a low drone bed for dread
    const drone=c.createOscillator(); drone.type='sine'; drone.frequency.value=55;
    const dg=c.createGain(); dg.gain.value=0.04; drone.connect(dg); dg.connect(this.musicG);
    const drone2=c.createOscillator(); drone2.type='sine'; drone2.frequency.value=82.4;
    const dg2=c.createGain(); dg2.gain.value=0.02; drone2.connect(dg2); dg2.connect(this.musicG);

    src.start(); lfo.start(); lfo2.start(); drone.start(); drone2.start();
    this._wind={src,g,lp};
  }

  // ---------- one-shot helpers ----------
  _env(node, t0, a, peak, d){ const g=node.gain;
    g.setValueAtTime(0.0001,t0); g.exponentialRampToValueAtTime(peak,t0+a);
    g.exponentialRampToValueAtTime(0.0001,t0+a+d); }

  footstep(){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;
    const s=this._noiseSource(); const bp=c.createBiquadFilter(); bp.type='bandpass';
    bp.frequency.value=520+Math.random()*180; bp.Q.value=1.2;
    const g=c.createGain(); s.connect(bp); bp.connect(g); g.connect(this.sfxG);
    this._env(g,t,0.005,0.18,0.09); s.start(t); s.stop(t+0.14);
  }
  jump(){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;
    const o=c.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(180,t);
    o.frequency.exponentialRampToValueAtTime(90,t+0.16);
    const g=c.createGain(); o.connect(g); g.connect(this.sfxG);
    this._env(g,t,0.005,0.14,0.16); o.start(t); o.stop(t+0.24);
  }
  land(power=1){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;
    const s=this._noiseSource(); const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=300;
    const g=c.createGain(); s.connect(lp); lp.connect(g); g.connect(this.sfxG);
    this._env(g,t,0.004,0.12+0.12*power,0.14); s.start(t); s.stop(t+0.2);
  }
  chime(){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;   // checkpoint shrine lights
    [880,1320].forEach((f,i)=>{ const o=c.createOscillator(); o.type='sine'; o.frequency.value=f;
      const g=c.createGain(); o.connect(g); g.connect(this.sfxG);
      this._env(g,t+i*0.06,0.01,0.10,0.9); o.start(t+i*0.06); o.stop(t+i*0.06+1.1); });
  }
  death(){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;
    const o=c.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(160,t);
    o.frequency.exponentialRampToValueAtTime(40,t+0.5);
    const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600;
    const g=c.createGain(); o.connect(lp); lp.connect(g); g.connect(this.sfxG);
    this._env(g,t,0.005,0.32,0.6); o.start(t); o.stop(t+0.7);
    const s=this._noiseSource(); const g2=c.createGain(); s.connect(g2); g2.connect(this.sfxG);
    this._env(g2,t,0.004,0.24,0.3); s.start(t); s.stop(t+0.4);
  }
  // heavy crush: low body thud + wet splat + a sharp snap
  crush(){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;
    const o=c.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(120,t);
    o.frequency.exponentialRampToValueAtTime(32,t+0.25);
    const g=c.createGain(); o.connect(g); g.connect(this.sfxG);
    this._env(g,t,0.003,0.5,0.32); o.start(t); o.stop(t+0.4);
    const s=this._noiseSource(); const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=900;
    const g2=c.createGain(); s.connect(lp); lp.connect(g2); g2.connect(this.sfxG);
    this._env(g2,t,0.002,0.4,0.2); s.start(t); s.stop(t+0.3);          // wet splat
    const snap=this._noiseSource(); const bp=c.createBiquadFilter(); bp.type='bandpass';
    bp.frequency.value=2600; bp.Q.value=6; const g3=c.createGain(); snap.connect(bp); bp.connect(g3); g3.connect(this.sfxG);
    this._env(g3,t+0.01,0.001,0.3,0.05); snap.start(t); snap.stop(t+0.1); // bone snap
  }
  // studio splash sting: a low swell + two soft bells
  studioSting(){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;
    const o=c.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(65,t);
    o.frequency.exponentialRampToValueAtTime(98,t+1.2);
    const g=c.createGain(); o.connect(g); g.connect(this.musicG);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.12,t+0.4);
    g.gain.exponentialRampToValueAtTime(0.0001,t+2.0); o.start(t); o.stop(t+2.1);
    this.bell(98,0.16); setTimeout(()=>this.bell(147,0.13),520);
  }
  // deep temple bell (inharmonic partials, long decay)
  bell(base=196, level=0.22){ if(!this.ok) return; const c=this.ctx,t=c.currentTime;
    const partials=[[1,1.0,3.2],[2.0,0.5,2.6],[2.76,0.35,2.0],[4.07,0.22,1.5],[5.43,0.14,1.0]];
    partials.forEach(([r,a,dur])=>{ const o=c.createOscillator(); o.type='sine';
      o.frequency.value=base*r*(1+ (Math.random()-0.5)*0.004);
      const g=c.createGain(); o.connect(g); g.connect(this.musicG);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(level*a,t+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.01+dur);
      o.start(t); o.stop(t+dur+0.1); });
  }
}
