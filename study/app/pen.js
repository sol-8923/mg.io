/* 펜 필기 — 교과 정리 슬라이드·시험 문제·오답풀이 화면 위에 바로 그리는 기능
 * - 저장: localStorage 'mg-study:ink:v1' (기기별). 화면(키)마다 따로 기록된다.
 * - 좌표: 캔버스 너비를 1로 둔 비율(x/W, y/W)로 저장. 그림은 내용과 같은 문서 안에 얹어서 스크롤·확대에 내용과 함께 움직인다.
 * - 사용: Pen.show(키)                  일반 화면: 앱 문서 전체 위에 그림(문서와 함께 스크롤)
 *         Pen.show(키함수(staged), iframe)  슬라이드: iframe 안쪽 문서에 캔버스를 넣는다.
 *            · 태블릿(고정 무대 1920×1080): 무대 안에 넣어 슬라이드와 같이 확대·축소, 키는 슬라이드마다
 *            · 폰(세로로 이어 붙인 문서): 문서 맨 위에 넣어 문서와 함께 스크롤
 *         Pen.hide()                    화면을 떠날 때 (라우터가 매번 호출) */
(function(){
'use strict';
var KEY='mg-study:ink:v1';
var COLORS={ red:'#e5383b', blue:'#2f6fe0', green:'#1f9d55' };
var COLOR_NAMES={ red:'빨강', blue:'파랑', green:'초록' };
var store=load(), key=null, keyFn=null, frame=null, staged=false;
var open=false, tool='pen', color='red', hand=false, finger=true, askClear=false;
var cv=null, cvHost=null, ctx=null, dock=null, drawing=null, poll=null, ro=null, W=1, H=1, queued=false;

function load(){ try{ var s=JSON.parse(localStorage.getItem(KEY)); return s&&typeof s==='object'?s:{}; }catch(e){ return {}; } }
function save(){
  try{ localStorage.setItem(KEY,JSON.stringify(store)); }
  catch(e){ var t=document.createElement('div'); t.className='toast'; t.textContent='필기를 기기에 저장하지 못했어요 (저장 공간 확인)'; document.body.appendChild(t); setTimeout(function(){ t.remove(); },2200); }
}
function list(){ return key?(store[key]||(store[key]=[])):[]; }
function tidy(){ if(key&&store[key]&&!store[key].length) delete store[key]; }

/* ───────── 스타일 ───────── */
var CV_CSS='.pen-cv{position:absolute;left:0;top:0;z-index:30;touch-action:none;-webkit-tap-highlight-color:transparent}.pen-cv.off{pointer-events:none}.pen-cv.pen{cursor:crosshair}.pen-cv.eraser{cursor:cell}@media print{.pen-cv{display:none}}';
function css(doc){
  if(doc.getElementById('pen-css')) return;
  var s=doc.createElement('style'); s.id='pen-css'; s.textContent=CV_CSS; doc.head.appendChild(s);
}
var DOCK_CSS=
'.pen-dock{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:calc(env(safe-area-inset-bottom) + 6px + var(--pen-lift,0px));z-index:40;display:flex;align-items:center;gap:2px;max-width:calc(100% - 16px);padding:3px;border-radius:99px;border:1px solid var(--line,#c8d2cb);background:var(--card,#fff);color:var(--ink,#222);box-shadow:0 3px 12px rgba(0,0,0,.22)}'+
'.pen-dock button{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:40px;height:40px;padding:0 9px;border-radius:99px;border:0;background:transparent;color:inherit;font:inherit;font-size:.85rem;cursor:pointer;white-space:nowrap}'+
'.pen-dock button[aria-pressed="true"]{background:var(--ink,#222);color:var(--paper,#fff)}'+
'.pen-dock button svg{width:20px;height:20px;flex:none}'+
'.pen-dock .dot{padding:0;min-width:34px;background:transparent!important}'+
'.pen-dock .dot i{display:block;width:22px;height:22px;border-radius:50%;box-shadow:0 0 0 1px var(--line,#c8d2cb);border:3px solid transparent}'+
'.pen-dock .dot[aria-pressed="true"] i{border-color:var(--card,#fff);box-shadow:0 0 0 3px var(--ink,#222)}'+
'.pen-dock .sep{width:1px;height:22px;background:var(--line,#c8d2cb);margin:0 2px;flex:none}'+
'.pen-dock .clr{color:#d0342c}'+
'.pen-dock .yes{background:#d0342c;color:#fff}'+
'.pen-dock .ask{padding:0 8px;font-size:.85rem}'+
'.pen-dock .main[aria-pressed="true"]{background:var(--ink,#222);color:var(--paper,#fff)}'+
'@media print{.pen-dock{display:none}}';
var I={
  pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  eraser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4-4a2 2 0 0 1 0-3l10-10a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3L12 21Z"/><path d="M22 21H7"/></svg>',
  hand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};

/* ───────── 도구 막대 (맨 아래에 가늘게) ───────── */
function btn(attrs,html){ return '<button type="button" '+attrs+'>'+html+'</button>'; }
function renderDock(){
  if(!dock) return;
  if(!open){
    dock.innerHTML=btn('data-a="toggle" aria-label="펜 켜기" title="펜"',I.pen);
    return;
  }
  if(askClear){
    dock.innerHTML='<span class="ask">이 화면 필기를 모두 지울까요?</span>'+btn('data-a="yes" class="yes"','지우기')+btn('data-a="no"','취소');
    return;
  }
  var act=!hand;
  dock.innerHTML=
    btn('data-a="pen" aria-pressed="'+(act&&tool==='pen')+'" aria-label="펜" title="펜"',I.pen)+
    ['red','blue','green'].map(function(c){ return btn('class="dot" data-c="'+c+'" aria-label="'+COLOR_NAMES[c]+'" aria-pressed="'+(c===color&&act&&tool==='pen')+'"','<i style="background:'+COLORS[c]+'"></i>'); }).join('')+
    '<span class="sep"></span>'+
    btn('data-a="eraser" aria-pressed="'+(act&&tool==='eraser')+'" aria-label="지우개" title="지우개"',I.eraser)+
    btn('data-a="hand" aria-pressed="'+hand+'" aria-label="펜 끄고 넘기기" title="펜을 잠시 끄고 화면 넘기기"',I.hand+'<span>넘기기</span>')+
    btn('data-a="clear" class="clr" aria-label="전체 지우기" title="이 화면 전체 지우기"',I.trash)+
    '<span class="sep"></span>'+
    btn('data-a="toggle" aria-label="펜 닫기" title="닫기"',I.close);
}
function onDock(e){
  var b=e.target.closest('button'); if(!b) return;
  var c=b.getAttribute('data-c'), a=b.getAttribute('data-a');
  if(c){ color=c; tool='pen'; hand=false; }
  else if(a==='toggle'){ open=!open; askClear=false; }
  else if(a==='pen'){ tool='pen'; hand=false; }
  else if(a==='eraser'){ tool='eraser'; hand=false; }
  else if(a==='hand'){ hand=!hand; }
  else if(a==='clear'){ askClear=true; }
  else if(a==='no'){ askClear=false; }
  else if(a==='yes'){ store[key]=[]; tidy(); save(); redraw(); askClear=false; }
  sync();
}
function lift(){
  /* 시험 화면 아래쪽 이전/다음 버튼 줄이 있으면 그 바로 위에 붙인다 */
  var n=document.querySelector('.qnav'); if(dock) dock.style.setProperty('--pen-lift',(n?n.offsetHeight:0)+'px');
}
function sync(){
  if(!dock) return;
  renderDock(); lift();
  if(cv) cv.className='pen-cv '+((open&&!hand)?(tool==='pen'?'pen':'eraser'):'off');
}

/* ───────── 캔버스 붙이기 ───────── */
function makeCanvas(doc,host){
  css(doc);
  var c=doc.createElement('canvas'); c.className='pen-cv off'; c.setAttribute('aria-label','필기 영역');
  c.addEventListener('pointerdown',down); c.addEventListener('pointermove',move);
  c.addEventListener('pointerup',up); c.addEventListener('pointercancel',up);
  host.appendChild(c); cv=c; cvHost=host; ctx=c.getContext('2d');
}
function dropCanvas(){ if(cv&&cv.parentNode) cv.parentNode.removeChild(cv); cv=null; cvHost=null; ctx=null; }

/* iframe 안쪽 문서를 살펴 캔버스를 올바른 곳(무대 또는 문서)에 둔다. 아직 로딩 중이면 false */
function attachFrame(){
  var doc; try{ doc=frame.contentDocument; }catch(e){ return false; }
  if(!doc||!doc.body||doc.readyState==='loading'||!doc.querySelector('.slide')) return false;
  var stage=doc.querySelector('.deck-stage'), st=!!(stage&&doc.defaultView.getComputedStyle(stage).position==='absolute');
  var host=st?stage:doc.body;
  if(!cv||cvHost!==host||cv.ownerDocument!==doc||!cv.isConnected){ dropCanvas(); makeCanvas(doc,host); }
  if(st!==staged||!key){ staged=st; setKey(keyFn(staged)); }
  return true;
}

/* ───────── 그리기 ───────── */
function layout(){
  if(!cv) return;
  var d=Math.min(window.devicePixelRatio||1,2), k=1;
  if(frame){
    var doc=cv.ownerDocument;
    if(staged){ W=1920; H=1080; cv.style.width=W+'px'; cv.style.height=H+'px'; k=cv.getBoundingClientRect().width/1920||1; }
    else{
      cv.style.height='0'; W=doc.documentElement.clientWidth; H=Math.max(doc.documentElement.scrollHeight,frame.clientHeight);
      cv.style.width=W+'px'; cv.style.height=H+'px';
    }
  }else{
    cv.style.height='0'; W=document.documentElement.clientWidth; H=Math.max(window.innerHeight,document.documentElement.scrollHeight);
    cv.style.width=W+'px'; cv.style.height=H+'px';
  }
  var s=Math.max(1,Math.min(d*k,3)); if(H*s>8000) s=8000/H;   // 너무 큰 캔버스는 해상도를 낮춘다
  var bw=Math.max(1,Math.round(W*s)), bh=Math.max(1,Math.round(H*s));
  if(cv.width!==bw||cv.height!==bh){ cv.width=bw; cv.height=bh; }
  ctx.setTransform(bw/W,0,0,bh/H,0,0);
  redraw();
}
function later(){ if(queued) return; queued=true; requestAnimationFrame(function(){ queued=false; if(frame) attachFrame(); layout(); }); }
function scale(){ return cv.getBoundingClientRect().width/W||1; }   // 화면에 보이는 크기 ÷ 그림 좌표 크기
function stroke(s,k){
  var p=s.p; if(!p.length) return;
  ctx.strokeStyle=COLORS[s.c]||COLORS.red; ctx.lineWidth=Math.min(Math.max(0.004*W,2.8/k),0.012*W);
  ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(p[0][0]*W,p[0][1]*W);
  if(p.length===1) ctx.lineTo(p[0][0]*W+.1,p[0][1]*W);
  for(var i=1;i<p.length;i++) ctx.lineTo(p[i][0]*W,p[i][1]*W);
  ctx.stroke();
}
function redraw(){ if(!ctx) return; ctx.clearRect(0,0,W,H); var k=scale(); list().forEach(function(s){ stroke(s,k); }); }
function pos(e){ var r=cv.getBoundingClientRect(); return [+((e.clientX-r.left)/r.width).toFixed(4),+((e.clientY-r.top)/r.width).toFixed(4)]; }
function eraseAt(pt){
  var l=list(), n=l.length, rad=16/(scale()*W);
  var keep=l.filter(function(s){ return !s.p.some(function(q){ var dx=q[0]-pt[0], dy=q[1]-pt[1]; return dx*dx+dy*dy<rad*rad; }); });
  if(keep.length!==n){ store[key]=keep; redraw(); }
}
function down(e){
  if(!key||hand||!open) return;
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
  var last=drawing.p[drawing.p.length-1], k=scale();
  if((Math.abs(pt[0]-last[0])+Math.abs(pt[1]-last[1]))*W*k<2) return;
  drawing.p.push(pt); redraw();
}
function up(){ if(drawing){ drawing=null; tidy(); save(); } }

/* ───────── 화면 연결 ───────── */
function setKey(k){ if(k===key) return; key=k; askClear=false; if(dock) renderDock(); redraw(); }
function show(k,fr){
  teardown();   // 같은 화면을 다시 그릴 때(답 선택 등)는 펜 켜짐·색 상태를 유지한다
  frame=fr||null; keyFn=typeof k==='function'?k:function(){ return k; };
  css(document); var st=document.createElement('style'); st.id='pen-dock-css'; st.textContent=DOCK_CSS; document.head.appendChild(st);
  dock=document.createElement('div'); dock.className='pen-dock'; dock.addEventListener('click',onDock); document.body.appendChild(dock);
  if(frame){ staged=false; key=null; attachFrame(); frame.addEventListener('load',later); }
  else{ key=keyFn(); makeCanvas(document,document.body); }
  sync(); layout();
  window.addEventListener('resize',later);
  var app=document.getElementById('app');
  if(window.ResizeObserver){ ro=new ResizeObserver(later); if(app) ro.observe(app); if(frame) ro.observe(frame); }
  if(frame){ poll=setInterval(function(){ if(attachFrame()){ var nk=keyFn(staged); if(nk&&nk!==key) setKey(nk); } later(); },400); }
  else{ poll=setInterval(later,1500); }   // 답을 펼치는 등 화면 높이가 바뀌어도 필기 영역이 따라가게 한다
}
function hide(){ open=false; hand=false; tool='pen'; askClear=false; teardown(); }
function teardown(){
  if(poll){ clearInterval(poll); poll=null; }
  if(ro){ ro.disconnect(); ro=null; }
  window.removeEventListener('resize',later);
  if(frame){ try{ frame.removeEventListener('load',later); }catch(e){} }
  drawing=null; key=null; keyFn=null; frame=null;
  dropCanvas();
  var d=document.getElementById('pen-dock-css'); if(d) d.remove();
  if(dock&&dock.parentNode) dock.parentNode.removeChild(dock); dock=null;
}

window.Pen={ show:show, hide:hide };
})();
