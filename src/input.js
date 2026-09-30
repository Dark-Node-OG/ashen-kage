// input.js — keyboard + an analog on-screen joystick and branded action buttons (multitouch via Pointer Events)
export const Input = {
  actions: { left:false, right:false, up:false, down:false, jump:false, grab:false, pause:false },
  _prevJump:false, jumpPressed:false,
  _prevGrab:false, grabPressed:false,
  pausePressed:false, _prevPause:false,

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
  },

  _initTouch(){
    const joyBase = document.getElementById('joyBase');
    const joyKnob = document.getElementById('joyKnob');
    const btnJump = document.getElementById('btnJump');
    const btnGrab = document.getElementById('btnGrab');
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
      if(!playing()) return;
      const x=e.clientX, y=e.clientY;
      if(inEl(btnJump,x,y)){ jumpId=e.pointerId; this.actions.jump=true; e.preventDefault(); }
      else if(inEl(btnGrab,x,y)){ grabId=e.pointerId; this.actions.grab=true; e.preventDefault(); }
      else if(stickId===null && x < window.innerWidth*0.55){ stickId=e.pointerId; setStick(x,y); e.preventDefault(); }
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

  postUpdate(){ this._prevJump=this.actions.jump; this._prevGrab=this.actions.grab; this._prevPause=this.actions.pause; },
  preUpdate(){
    this.jumpPressed  = this.actions.jump  && !this._prevJump;
    this.grabPressed  = this.actions.grab  && !this._prevGrab;
    this.pausePressed = this.actions.pause && !this._prevPause;
  }
};
