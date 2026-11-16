/* 펜 필기 — 교과 정리 슬라이드·시험 문제·오답풀이 화면 위에 바로 그리는 기능
 * - 저장: localStorage 'mg-study:ink:v1' (기기별). 화면(키)마다 따로 기록된다.
 * - 좌표: 캔버스 너비를 1로 둔 비율(x/W, y/W)로 저장해 화면 크기가 달라도 위치가 비슷하게 유지된다.
 * - 사용: Pen.show(키)            일반 화면(스크롤되는 문서 전체 위에 그림)
 *         Pen.show(키, iframe)    슬라이드처럼 iframe 위에 그림 (키는 함수로 줘도 됨: 슬라이드가 바뀌면 다시 호출)
 *         Pen.hide()              화면을 떠날 때 (라우터가 매번 호출) */
(function(){
'use strict';
var KEY='mg-study:ink:v1';
var COLORS={ red:'#e5383b', blue:'#2f6fe0', green:'#1f9d55' };
var COLOR_NAMES={ red:'빨강', blue:'파랑', green:'초록' };
var store=load(), key=null, keyFn=null, frame=null, open=false, tool='pen', color='red', finger=true;
var cv=null, ctx=null, fab=null, bar=null, drawing=null, poll=null, ro=null, W=1, H=1, queued=false;

function load(){ try{ var s=JSON.parse(localStorage.getItem(KEY)); return s&&typeof s==='object'?s:{}; }catch(e){ return {}; } }
function save(){
  try{ localStorage.setItem(KEY,JSON.stringify(store)); }
  catch(e){ var t=document.createElement('div'); t.className='toast'; t.textContent='필기를 기기에 저장하지 못했어요 (저장 공간 확인)'; document.body.appendChild(t); setTimeout(function(){ t.remove(); },2200); }
}
function list(){ return key?(store[key]||(store[key]=[])):[]; }
function tidy(){ if(key&&store[key]&&!store[key].length) delete store[key]; }

/* ───────── 스타일 ───────── */
function css(){
  if(document.getElementById('pen-css')) return;
  var s=document.createElement('style'); s.id='pen-css';
  s.textContent=
'.pen-cv{position:absolute;left:0;top:0;z-index:6;touch-action:none}'+
'.pen-cv.fixed{position:fixed}'+
'.pen-cv.off{pointer-events:none}'+
'.pen-cv.pen{cursor:crosshair}.pen-cv.eraser{cursor:cell}'+
'.pen-fab{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:calc(env(safe-area-inset-bottom) + 84px);z-index:40;display:flex;align-items:center;gap:6px;min-height:46px;padding:0 16px;border-radius:99px;border:1px solid var(--line,#c8d2cb);background:var(--card,#fff);color:var(--ink,#222);font:inherit;font-size:.95rem;box-shadow:0 6px 18px rgba(0,0,0,.2);cursor:pointer}'+
'.pen-fab.on{background:var(--ink,#222);color:var(--paper,#fff)}'+
'.pen-fab svg{width:20px;height:20px}'+
'.pen-bar{position:fixed;left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));bottom:calc(env(safe-area-inset-bottom) + 138px);z-index:40;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;width:fit-content;max-width:calc(100% - 20px);margin:0 auto;padding:8px 10px;border-radius:14px;border:1px solid var(--line,#c8d2cb);background:var(--card,#fff);color:var(--ink,#222);box-shadow:0 6px 22px rgba(0,0,0,.22)}'+
'.pen-bar[hidden]{display:none}'+
'.pen-bar button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:44px;min-height:44px;padding:0 10px;border-radius:10px;border:1px solid transparent;background:transparent;color:inherit;font:inherit;font-size:.9rem;cursor:pointer}'+
'.pen-bar button[aria-pressed="true"]{background:var(--ink,#222);color:var(--paper,#fff)}'+
'.pen-bar button svg{width:20px;height:20px;flex:none}'+
'.pen-bar .dot{padding:0;width:44px;background:transparent!important}'+
'.pen-bar .dot i{display:block;width:26px;height:26px;border-radius:50%;box-shadow:0 0 0 1px var(--line,#c8d2cb);border:3px solid transparent}'+
'.pen-bar .dot[aria-pressed="true"] i{border-color:var(--card,#fff);box-shadow:0 0 0 3px var(--ink,#222)}'+
'.pen-bar .sep{width:1px;align-self:stretch;background:var(--line,#c8d2cb);margin:4px 2px}'+
'.pen-bar .clr{color:#d0342c}'+
'.pen-bar .ask{display:flex;align-items:center;gap:6px;font-size:.9rem}.pen-bar .ask[hidden]{display:none}'+
'.pen-bar .ask .yes{background:#d0342c;color:#fff}'+
'.pen-bar .ask button{border-color:var(--line,#c8d2cb)}'+
'@media print{.pen-fab,.pen-bar{display:none}}';
  document.head.appendChild(s);
}
var I={
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  eraser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4-4a2 2 0 0 1 0-3l10-10a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3L12 21Z"/><path d="M22 21H7"/></svg>',
  hand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'
};

/* ───────── UI ───────── */
function el(tag,attrs,html){ var e=document.createElement(tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(html) e.innerHTML=html; return e; }
function build(){
  css();
  cv=el('canvas',{class:'pen-cv off','aria-label':'필기 영역'}); ctx=cv.getContext('2d');
  cv.addEventListener('pointerdown',down); cv.addEventListener('pointermove',move);
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  fab=el('button',{class:'pen-fab',type:'button','aria-expanded':'false'},I.pen+'<span>펜</span>');
  fab.onclick=function(){ open=!open; sync(); };
  bar=el('div',{class:'pen-bar',role:'toolbar','aria-label':'펜 도구',hidden:''});
  bar.innerHTML=
    '<button type="button" data-a="pen" aria-pressed="true">'+I.pen+'펜</button>'+
    ['red','blue','green'].map(function(c){ return '<button type="button" class="dot" data-c="'+c+'" aria-label="'+COLOR_NAMES[c]+'" aria-pressed="'+(c===color)+'"><i style="background:'+COLORS[c]+'"></i></button>'; }).join('')+
    '<span class="sep"></span>'+
    '<button type="button" data-a="eraser" aria-pressed="false">'+I.eraser+'지우개</button>'+
    '<button type="button" data-a="hand" aria-pressed="false" title="펜을 잠시 끄고 화면 넘기기">'+I.hand+'넘기기</button>'+
    '<span class="sep"></span>'+
    '<button type="button" class="clr" data-a="clear">'+I.trash+'전체 지우기</button>'+
    '<span class="ask" hidden><span>이 화면 필기를 모두 지울까요?</span><button type="button" class="yes" data-a="yes">지우기</button><button type="button" data-a="no">취소</button></span>';
  bar.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    var c=b.getAttribute('data-c'), a=b.getAttribute('data-a'), ask=bar.querySelector('.ask');
    if(c){ color=c; tool='pen'; hand=false; }
    else if(a==='pen'){ tool='pen'; hand=false; }
    else if(a==='eraser'){ tool='eraser'; hand=false; }
    else if(a==='hand'){ hand=!hand; }
    else if(a==='clear'){ ask.hidden=false; return; }
    else if(a==='no'){ ask.hidden=true; return; }
    else if(a==='yes'){ store[key]=[]; tidy(); save(); redraw(); ask.hidden=true; return; }
    sync();
  });
  document.body.appendChild(cv); document.body.appendChild(fab); document.body.appendChild(bar);
}
var hand=false;
function sync(){
  if(!cv) return;
  fab.classList.toggle('on',open); fab.setAttribute('aria-expanded',open);
  bar.hidden=!open;
  bar.querySelector('[data-a=pen]').setAttribute('aria-pressed',!hand&&tool==='pen');
  bar.querySelector('[data-a=eraser]').setAttribute('aria-pressed',!hand&&tool==='eraser');
  bar.querySelector('[data-a=hand]').setAttribute('aria-pressed',hand);
  [].forEach.call(bar.querySelectorAll('.dot'),function(d){ d.setAttribute('aria-pressed',d.getAttribute('data-c')===color&&!hand&&tool==='pen'); });
  var ask=bar.querySelector('.ask'); if(!open) ask.hidden=true;
  var active=open&&!hand;
  cv.className='pen-cv'+(frame?' fixed':'')+(active?(tool==='pen'?' pen':' eraser'):' off');
}

/* ───────── 그리기 ───────── */
function layout(){
  if(!cv) return;
  var d=Math.min(window.devicePixelRatio||1,2), w,h;
  if(frame){
    var r=frame.getBoundingClientRect(); w=r.width; h=r.height;
    cv.style.left=r.left+'px'; cv.style.top=r.top+'px';
  }else{
    cv.style.left='0'; cv.style.top='0'; cv.style.height='0';
    w=document.documentElement.clientWidth; h=Math.max(window.innerHeight,document.documentElement.scrollHeight);
  }
  if(h*d>8000) d=8000/h;
  cv.style.width=w+'px'; cv.style.height=h+'px';
  var bw=Math.max(1,Math.round(w*d)), bh=Math.max(1,Math.round(h*d));
  if(cv.width!==bw||cv.height!==bh){ cv.width=bw; cv.height=bh; }
  ctx.setTransform(bw/w,0,0,bh/h,0,0); W=w; H=h;
  redraw();
}
function later(){ if(queued) return; queued=true; requestAnimationFrame(function(){ queued=false; layout(); }); }
function stroke(s){
  var p=s.p; if(!p.length) return;
  ctx.strokeStyle=COLORS[s.c]||COLORS.red; ctx.lineWidth=Math.max(2.5,Math.min(W,900)*0.005);
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(p[0][0]*W,p[0][1]*W);
  if(p.length===1) ctx.lineTo(p[0][0]*W+.1,p[0][1]*W);
  for(var i=1;i<p.length;i++) ctx.lineTo(p[i][0]*W,p[i][1]*W);
  ctx.stroke();
}
function redraw(){ if(!ctx) return; ctx.clearRect(0,0,W,H); list().forEach(stroke); }
function pos(e){ var r=cv.getBoundingClientRect(); return [+((e.clientX-r.left)/W).toFixed(4),+((e.clientY-r.top)/W).toFixed(4)]; }
function eraseAt(pt){
  var l=list(), n=l.length, rad=16/W;
  var keep=l.filter(function(s){ return !s.p.some(function(q){ var dx=q[0]-pt[0], dy=q[1]-pt[1]; return dx*dx+dy*dy<rad*rad; }); });
  if(keep.length!==n){ store[key]=keep; redraw(); }
}
function down(e){
  if(!key||hand) return;
  if(e.pointerType==='touch'&&!finger) return;
  try{ cv.setPointerCapture(e.pointerId); }catch(x){}
  var pt=pos(e);
  if(tool==='eraser'){ drawing='erase'; eraseAt(pt); }
  else{ drawing={c:color,p:[pt]}; list().push(drawing); redraw(); }
  e.preventDefault();
}
function move(e){
  if(!drawing) return;
  var pt=pos(e);
  if(drawing==='erase'){ eraseAt(pt); return; }
  var last=drawing.p[drawing.p.length-1];
  if(Math.abs(pt[0]-last[0])*W+Math.abs(pt[1]-last[1])*W<2) return;
  drawing.p.push(pt); redraw();
}
function up(){ if(drawing){ drawing=null; tidy(); save(); } }

/* ───────── 화면 연결 ───────── */
function setKey(k){ if(k===key) return; key=k; var ask=bar&&bar.querySelector('.ask'); if(ask) ask.hidden=true; redraw(); }
function show(k,fr){
  teardown();   // 같은 화면을 다시 그릴 때(답 선택 등)는 펜 켜짐·색 상태를 유지한다
  keyFn=typeof k==='function'?k:null; key=keyFn?(keyFn()||''):k; frame=fr||null;
  if(!cv) build();
  sync(); layout();
  window.addEventListener('resize',later);
  var app=document.getElementById('app');
  if(window.ResizeObserver){ ro=new ResizeObserver(later); ro.observe(app); if(frame) ro.observe(frame); }
  if(frame){ poll=setInterval(function(){ if(keyFn){ var nk=keyFn(); if(nk&&nk!==key) setKey(nk); } later(); },400); }
  else{ poll=setInterval(later,1500); }   // 답을 펼치는 등 화면 높이가 바뀌어도 필기 영역이 따라가게 한다
}
function hide(){ open=false; hand=false; tool='pen'; teardown(); }
function teardown(){
  if(poll){ clearInterval(poll); poll=null; }
  if(ro){ ro.disconnect(); ro=null; }
  window.removeEventListener('resize',later);
  drawing=null; key=null; keyFn=null; frame=null;
  [cv,fab,bar].forEach(function(n){ if(n&&n.parentNode) n.parentNode.removeChild(n); });
  cv=fab=bar=ctx=null;
}

window.Pen={ show:show, hide:hide };
})();
