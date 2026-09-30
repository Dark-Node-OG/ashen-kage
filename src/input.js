// input.js — keyboard + customizable analog joystick & action buttons (multitouch via Pointer Events)
export const Input = {
  actions: { left:false, right:false, up:false, down:false, jump:false, grab:false, pause:false },
  _prevJump:false, jumpPressed:false,
  _prevGrab:false, grabPressed:false,
  pausePressed:false, _prevPause:false,
  _els:{}, _layout:null,

  init(){
    const map = (code) => ({
      'ArrowLeft':'left','KeyA':'left', 'ArrowRight':'right','KeyD':'right',
      'ArrowUp':'up','KeyW':'up', 'ArrowDown':'down','KeyS':'down',
      'Space':'jump', 'KeyJ':'grab','ShiftLeft':'grab','KeyK':'grab',
      'Escape':'pause','KeyP':'pause',
    })[code];
    window.addEventListener('keydown', (e) => {
      const a = map(e.code);
      if(a){ this.actions[a] = true; if(a==='up') this.actions.jump = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      const a = map(e.code);
      if(a){ this.actions[a] = false; if(a==='up') this.actions.jump = false; }
    });

    if('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('is-touch');
    this._initTouch();
    window.addEventListener('resize', ()=>{ if(this._layout) this.applyLayout(this._layout); });
  },

  _initTouch(){
    const joyBase = document.getElementById('joyBase');
    const joyKnob = document.getElementById('joyKnob');
    const btnJump = document.getElementById('btnJump');
    const btnGrab = document.getElementById('btnGrab');
    this._els = { joy:joyBase, knob:joyKnob, jump:btnJump, grab:btnGrab };
    if(!joyBase) return;
    let stickId=null, jumpId=null, grabId=null;

    const playing = ()=> document.body.classList.contains('playing');
    const rect = (el)=> el.getBoundingClientRect();
    const inEl = (el,x,y)=>{ const r=rect(el); return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom; };

    const setStick=(x,y)=>{
      const r=rect(joyBase), cx=r.left+r.width/2, cy=r.top+r.height/2, rad=r.width/2;
      let dx=x-cx, dy=y-cy; const m=Math.hypot(dx,dy)||1;
      if(m>rad){ dx=dx/m*rad; dy=dy/m*rad; }
      joyKnob.style.transform=`translate(${dx}px,${dy}px)`;
      const nx=dx/rad, ny=dy/rad;
      this.actions.left = nx<-0.35; this.actions.right = nx>0.35;
      this.actions.up   = ny<-0.45; this.actions.down  = ny>0.45;
    };
    const clearStick=()=>{ joyKnob.style.transform='translate(0,0)';
      this.actions.left=this.actions.right=this.actions.up=this.actions.down=false; };

    const down=(e)=>{
      if(!playing() || document.body.classList.contains('editing')) return;
      const x=e.clientX, y=e.clientY;
      if(inEl(btnJump,x,y)){ jumpId=e.pointerId; this.actions.jump=true; e.preventDefault(); }
      else if(inEl(btnGrab,x,y)){ grabId=e.pointerId; this.actions.grab=true; e.preventDefault(); }
      else if(stickId===null && (inEl(joyBase,x,y) || x < window.innerWidth*0.5)){ stickId=e.pointerId; setStick(x,y); e.preventDefault(); }
    };
    const move=(e)=>{ if(e.pointerId===stickId){ setStick(e.clientX,e.clientY); e.preventDefault(); } };
    const up=(e)=>{
      if(e.pointerId===stickId){ stickId=null; clearStick(); }
      if(e.pointerId===jumpId){ jumpId=null; this.actions.jump=false; }
      if(e.pointerId===grabId){ grabId=null; this.actions.grab=false; }
    };
    window.addEventListener('pointerdown', down, {passive:false});
    window.addEventListener('pointermove', move, {passive:false});
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  },

  // ---- customizable layout ----
  applyLayout(cfg){
    this._layout = cfg;
    const e=this._els; if(!e || !e.joy) return;
    const vw=window.innerWidth, vh=window.innerHeight;
    const place=(el,c)=>{ if(!el||!c) return;
      el.style.width=c.size+'px'; el.style.height=c.size+'px';
      el.style.left=Math.round(c.cx*vw - c.size/2)+'px';
      el.style.top =Math.round(c.cy*vh - c.size/2)+'px';
      el.style.right='auto'; el.style.bottom='auto'; el.style.opacity=cfg.opacity; };
    place(e.joy,cfg.joy); place(e.jump,cfg.jump); place(e.grab,cfg.grab);
  },

  enableEdit(onChange){
    document.body.classList.add('editing');
    const e=this._els;
    const els=[['joy',e.joy],['jump',e.jump],['grab',e.grab]];
    this._drag=null;
    this._editDown=(ev)=>{ for(const [k,el] of els){ if(el && (el===ev.target || el.contains(ev.target))){ this._drag={k}; ev.preventDefault(); ev.stopPropagation(); return; } } };
    this._editMove=(ev)=>{ if(!this._drag) return; const vw=window.innerWidth, vh=window.innerHeight;
      const c=this._layout[this._drag.k];
      c.cx=Math.min(0.97,Math.max(0.03, ev.clientX/vw));
      c.cy=Math.min(0.97,Math.max(0.10, ev.clientY/vh));
      this.applyLayout(this._layout); ev.preventDefault(); };
    this._editUp=()=>{ if(this._drag){ this._drag=null; onChange && onChange(this._layout); } };
    window.addEventListener('pointerdown', this._editDown, {passive:false, capture:true});
    window.addEventListener('pointermove', this._editMove, {passive:false});
    window.addEventListener('pointerup', this._editUp);
  },
  disableEdit(){
    document.body.classList.remove('editing'); this._drag=null;
    window.removeEventListener('pointerdown', this._editDown, {capture:true});
    window.removeEventListener('pointermove', this._editMove);
    window.removeEventListener('pointerup', this._editUp);
  },

  postUpdate(){ this._prevJump=this.actions.jump; this._prevGrab=this.actions.grab; this._prevPause=this.actions.pause; },
  preUpdate(){
    this.jumpPressed  = this.actions.jump  && !this._prevJump;
    this.grabPressed  = this.actions.grab  && !this._prevGrab;
    this.pausePressed = this.actions.pause && !this._prevPause;
  }
};
