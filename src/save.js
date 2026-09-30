// save.js — robust localStorage progression + settings. Survives corruption by
// falling back to defaults, and never throws into the game loop.
const KEY = 'ashenkage.save.v1';

const CONTROLS = () => ({
  opacity: 0.82,
  joy:  { size:100, cx:0.10, cy:0.80 },
  jump: { size:70,  cx:0.90, cy:0.80 },
  grab: { size:58,  cx:0.795, cy:0.82 },
});
const DEFAULTS = () => ({
  version: 1,
  settings: { master:0.8, music:0.7, sfx:0.9 },
  controls: CONTROLS(),
  levels: {},            // id -> { completed, bestTime, leastDeaths, shrines, shrinesMax }
});

export const Save = {
  data: DEFAULTS(),

  load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(parsed && typeof parsed === 'object'){
          const d=DEFAULTS(), pc=parsed.controls||{};
          this.data = { ...d, ...parsed,
            settings: { ...d.settings, ...(parsed.settings||{}) },
            controls: { ...d.controls, ...pc,
              joy:{...d.controls.joy,...(pc.joy||{})}, jump:{...d.controls.jump,...(pc.jump||{})}, grab:{...d.controls.grab,...(pc.grab||{})} },
            levels: parsed.levels || {} };
        }
      }
    }catch(e){ console.warn('save load failed, using defaults', e); this.data = DEFAULTS(); }
    return this.data;
  },

  _persist(){
    try{ localStorage.setItem(KEY, JSON.stringify(this.data)); }
    catch(e){ console.warn('save write failed', e); }
  },

  getSettings(){ return this.data.settings; },
  setSettings(s){ this.data.settings = { ...this.data.settings, ...s }; this._persist(); },

  getControls(){ return this.data.controls; },
  setControls(c){ this.data.controls = c; this._persist(); },
  resetControls(){ this.data.controls = CONTROLS(); this._persist(); return this.data.controls; },

  getLevel(id){ return this.data.levels[id] || null; },

  // record a completed run; keeps the BEST time / FEWEST deaths / MOST shrines
  recordLevel(id, run){
    const prev = this.data.levels[id] || { completed:false, bestTime:Infinity, leastDeaths:Infinity, shrines:0, shrinesMax:run.shrinesMax||0 };
    const next = {
      completed: true,
      bestTime: Math.min(prev.bestTime ?? Infinity, run.time),
      leastDeaths: Math.min(prev.leastDeaths ?? Infinity, run.deaths),
      shrines: Math.max(prev.shrines || 0, run.shrines || 0),
      shrinesMax: run.shrinesMax || prev.shrinesMax || 0,
    };
    const improved = {
      time:   run.time   <= (prev.bestTime ?? Infinity),
      deaths: run.deaths <= (prev.leastDeaths ?? Infinity),
    };
    this.data.levels[id] = next;
    this._persist();
    return { record: next, improved };
  },

  wipe(){ this.data = DEFAULTS(); this._persist(); },
};
