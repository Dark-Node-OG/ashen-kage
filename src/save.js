// save.js — robust localStorage progression + settings. Survives corruption by
// falling back to defaults, and never throws into the game loop.
const KEY = 'ashenkage.save.v1';

const DEFAULTS = () => ({
  version: 1,
  settings: { master:0.8, music:0.7, sfx:0.9 },
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
          this.data = { ...DEFAULTS(), ...parsed,
            settings: { ...DEFAULTS().settings, ...(parsed.settings||{}) },
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
