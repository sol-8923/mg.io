/* 민겸이 공부 공간 — 앱 엔진
 * 화면: 홈 / 책장(시험·오답노트) / 책(시험 범위 선택) / 시험 / 결과 / 오답풀이(한 문제 한 페이지) / 오답노트
 * 데이터: library/catalog.json, library/<책>/book.json (문제 은행)
 * 저장: localStorage 'mg-study:v1' (기기별) — 오답노트 DB, 본 문제 기록, 시험 기록
 */
(function(){
'use strict';

/* ───────── 설정: 홈 메뉴 (여기에 추가하면 홈에 카드가 생김) ───────── */
var MENUS = [
  { id:'exam',  color:'#2f6b52', icon:'exam',  title:'시험으로 풀어보기', desc:'학년·학기·과목을 고르면 들어갈 때마다 새로운 시험을 볼 수 있어요.', href:'#/exam' },
  { id:'notes', color:'#a8362c', icon:'notes', title:'오답노트', desc:'틀린 문제만 모아 다시 풀어요. 두 번 연속 맞히면 졸업!', href:'#/notes' },
  { id:'stats', color:'#2a4468', icon:'chart', title:'공부 기록', desc:'시험 횟수·점수 추이·공부 달력·취약 개념을 한눈에 봐요.', href:'#/stats' }
];
var SUBJECTS = {
  '국어':{c:'#9b3a32',e:'ko'}, '영어':{c:'#2d5a8c',e:'en'}, '수학':{c:'#2a3f66',e:'math'}, '과학':{c:'#2f6b52',e:'sci'},
  '사회':{c:'#b0672a',e:'soc'}, '역사':{c:'#6b4a2f',e:'his'}, '도덕':{c:'#7a5a8c',e:'eth'}, '기술·가정':{c:'#4f7a7a',e:'tech'},
  '정보':{c:'#3d6e8f',e:'info'}, '한문':{c:'#8a3f55',e:'han'}
};
var CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧'];
var TYPE_ORDER = {mc:0, ox:1, short:2, essay:3};

/* ───────── 아이콘 ───────── */
var ICONS = {
  exam:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="6" width="26" height="36" rx="3"/><path d="M15 15h14M15 22h14M15 29h8"/><path d="M33 38l9-9 3 3-9 9h-3z" fill="currentColor" fill-opacity=".15"/><path d="M15 36l2 2 4-4"/></svg>',
  notes:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6h24a3 3 0 0 1 3 3v33H15a3 3 0 0 1-3-3z"/><path d="M12 39a3 3 0 0 1 3-3h24"/><path d="M28 6v14l4-3 4 3V6" fill="currentColor" fill-opacity=".18"/><path d="M8 13h6M8 20h6M8 27h6"/></svg>',
  chart:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 40h34"/><rect x="10" y="24" width="6" height="12" rx="1.5" fill="currentColor" fill-opacity=".15"/><rect x="21" y="16" width="6" height="20" rx="1.5" fill="currentColor" fill-opacity=".15"/><rect x="32" y="9" width="6" height="27" rx="1.5" fill="currentColor" fill-opacity=".15"/></svg>',
  openbook:'<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M32 16c-6-5-15-6-24-5v36c9-1 18 0 24 5 6-5 15-6 24-5V11c-9-1-18 0-24 5z"/><path d="M32 16v36"/><path d="M14 20c4 0 8 1 12 3M14 27c4 0 8 1 12 3M14 34c4 0 8 1 12 3M50 20c-4 0-8 1-12 3M50 27c-4 0-8 1-12 3M50 34c-4 0-8 1-12 3"/></svg>',
  sci:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5h10M17 5v10L8 31a3 3 0 0 0 2.6 4.5h18.8A3 3 0 0 0 32 31l-9-16V5"/><path d="M11.5 25h17"/><circle cx="18" cy="29" r="1.4" fill="currentColor"/><circle cx="23" cy="31" r="1" fill="currentColor"/></svg>',
  math:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 11h24M14 11v20M25 11v15c0 3 2 5 5 4"/></svg>',
  soc:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="20" cy="20" r="13"/><path d="M7 20h26M20 7c-5 5-5 21 0 26M20 7c5 5 5 21 0 26"/></svg>',
  his:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M11 8h20v20a4 4 0 0 1-4 4H9"/><path d="M11 8a3 3 0 0 0-3 3v17a4 4 0 0 0 4 4"/><path d="M15 15h11M15 21h11"/></svg>'
};
ICONS.chat='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10h32a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H22l-9 8v-8H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"/><path d="M14 20h20M14 27h12"/></svg>';
ICONS.photo='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="38" height="28" rx="4"/><circle cx="17" cy="21" r="3.5"/><path d="M6 36l11-9 9 7 6-5 11 8"/></svg>';
ICONS.meron='<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="25"/><path d="M18 23l8 4-8 4M46 23l-8 4 8 4"/><ellipse cx="13.5" cy="38" rx="4" ry="2.6" fill="#f6c4cb" stroke="none" opacity=".55"/><ellipse cx="50.5" cy="38" rx="4" ry="2.6" fill="#f6c4cb" stroke="none" opacity=".55"/><path d="M33 43v8.5a4.6 4.6 0 0 0 9.2 0V41.5" fill="#f6c4cb" stroke="#f6c4cb"/><path d="M37.6 47v4.5" stroke="#d98a96" stroke-width="1.8"/><path d="M21 40q11 7 22 0"/><path d="M54 13l4-3M57 20h5M53 6l1.5-4"/></svg>';
function emblem(sub){
  var s=(SUBJECTS[sub]||{}).e;
  if(ICONS[s]) return ICONS[s];
  var t={ko:'가',en:'Aa',eth:'德',tech:'⚙',info:'</>',han:'漢'}[s]||sub.slice(0,1);
  return '<svg viewBox="0 0 40 40"><text x="20" y="27" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor" font-family="Noto Serif KR,serif">'+t.replace(/</g,'&lt;')+'</text></svg>';
}

/* ───────── 유틸 ───────── */
function h(tag, attrs, kids){
  var el=document.createElement(tag);
  if(attrs) for(var k in attrs){
    var v=attrs[k]; if(v===false||v==null) continue;
    if(k==='class') el.className=v; else if(k==='text') el.textContent=v; else if(k==='html') el.innerHTML=v;
    else if(k==='style') el.setAttribute('style',v);
    else if(k.slice(0,2)==='on') el.addEventListener(k.slice(2),v); else el.setAttribute(k,v);
  }
  (kids||[]).forEach(function(c){ if(c==null||c===false) return; el.appendChild(typeof c==='string'?document.createTextNode(c):c); });
  return el;
}
function $app(){ var a=document.getElementById('app'); a.innerHTML=''; return a; }
function go(hash){ if(location.hash===hash) route(); else location.hash=hash; }
function norm(s){ return String(s==null?'':s).toLowerCase().replace(/[\s.,·・'"‘’“”()\[\]{}~\-_/!?]/g,''); }
function sameSet(a,b){ if(a.length!==b.length) return false; var x=a.slice().sort(),y=b.slice().sort(); for(var i=0;i<x.length;i++) if(x[i]!==y[i]) return false; return true; }
function isMulti(q){ return q.type==='mc' && Array.isArray(q.answer); }
function empty(a){ return a==null||a===''||(Array.isArray(a)&&!a.length); }
function shuffle(arr){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function fmtTime(sec){ sec=Math.max(0,Math.round(sec)); var m=Math.floor(sec/60),s=sec%60; return m+':'+(s<10?'0':'')+s; }
function fmtDate(iso){ try{ var d=new Date(iso); return (d.getMonth()+1)+'/'+d.getDate(); }catch(e){ return ''; } }
function toast(msg){ var t=h('div',{class:'toast',text:msg}); document.body.appendChild(t); setTimeout(function(){ t.remove(); },2200); }
function bookLabel(b){ return b.grade+'학년 '+b.semester+'학기 '+b.subject; }

/* ───────── 저장소 (오답노트 DB) ───────── */
var KEY='mg-study:v1';
var Store={
  d:null,
  load:function(){ if(this.d) return this.d; try{ this.d=JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ this.d={}; } this.d.books=this.d.books||{}; return this.d; },
  save:function(){ try{ localStorage.setItem(KEY,JSON.stringify(this.d)); }catch(e){ toast('기기에 저장하지 못했어요 (저장 공간 확인)'); } },
  book:function(id){ var d=this.load(); return d.books[id]||(d.books[id]={seen:{},notes:{},history:[]}); }
};
function noteCounts(id){ var n=Store.book(id).notes, l=0, m=0; for(var k in n){ if(n[k].mastered) m++; else l++; } return {learning:l, mastered:m}; }

/* ───────── 데이터 ───────── */
var Data={ catalog:null, books:{},
  catalogP:function(){ var self=this; if(self.catalog) return Promise.resolve(self.catalog);
    return fetch('library/catalog.json',{cache:'no-cache'}).then(function(r){ if(!r.ok) throw new Error('catalog'); return r.json(); }).then(function(c){ self.catalog=c; return c; }); },
  bookP:function(id){ var self=this; if(self.books[id]) return Promise.resolve(self.books[id]);
    return fetch('library/'+encodeURIComponent(id)+'/book.json',{cache:'no-cache'}).then(function(r){ if(!r.ok) throw new Error('book'); return r.json(); }).then(function(b){ self.books[id]=b; return b; }); }
};

/* ───────── 상태 ───────── */
var S={ exam:null, review:null, mode:'practice', timerId:null, nav:null };
function stopTimer(){ if(S.timerId){ clearInterval(S.timerId); S.timerId=null; } }
function removeNav(){ if(S.nav){ S.nav.remove(); S.nav=null; } }

/* ───────── 라우터 ───────── */
function route(){
  stopTimer(); removeNav(); closeModals(); if(S.chatUnsub){ S.chatUnsub(); S.chatUnsub=null; }
  var p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  var a=p[0], b=p[1];
  var done=function(){ window.scrollTo(0,0); };
  try{
    if(!a) return renderHome(), done();
    if(a==='exam') return (isSem(b)?renderShelf('exam',b):renderDoors('exam')).then(done);
    if(a==='notes' && !b) return renderDoors('notes').then(done);
    if(a==='notes' && isSem(b)) return renderShelf('notes',b).then(done);
    if(a==='notes') return renderNotebook(b).then(done);
    if(a==='book') return renderBook(b).then(done);
    if(a==='stats') return renderStats(b).then(done);
    if(a==='plan') return renderPlan(b), done();
    if(a==='chat') return renderChat(), done();
    if(a==='quiz') return S.exam&&!S.exam.done ? (renderQ(),done()) : go('#/exam');
    if(a==='result') return S.exam&&S.exam.done ? (renderResult(),done()) : go('#/exam');
    if(a==='review') return renderReview(parseInt(b||'1',10));
    renderHome();
  }catch(e){ renderError(e); }
}
window.addEventListener('hashchange',route);
function renderError(e){
  var app=$app();
  var local=location.protocol==='file:';
  app.appendChild(h('div',{class:'page'},[h('div',{class:'card'},[
    h('h2',{text:'자료를 불러오지 못했어요'}),
    h('p',{class:'muted',text: local ? 'PC에서 파일로 직접 열면 자료를 읽을 수 없어요. study 폴더에서 "python -m http.server" 실행 후 http://localhost:8000 으로 열어 주세요.' : '잠시 후 다시 시도해 주세요. ('+(e&&e.message||e)+')'}),
    h('a',{class:'btn',href:'#/'},['홈으로'])
  ])]));
}

/* ───────── 테마 ───────── */
try{ var th=localStorage.getItem('mg-study:theme'); if(th) document.documentElement.setAttribute('data-theme',th); }catch(e){}
/* ───────── 효과음(파일 없이 브라우저에서 합성) ───────── */
var Snd=(function(){
  var ctx=null, on=true;
  try{ on=localStorage.getItem('mg-study:sound')!=='off'; }catch(e){}
  function ac(){ if(!ctx){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return null; try{ ctx=new C(); }catch(e){ return null; } } if(ctx.state==='suspended') ctx.resume(); return ctx; }
  function noise(c,dur){ var n=Math.floor(c.sampleRate*dur), b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0); for(var i=0;i<n;i++) d[i]=Math.random()*2-1; var s=c.createBufferSource(); s.buffer=b; return s; }
  function env(g,t,peak,att,dur){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+att); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); }
  return {
    get on(){ return on; },
    toggle:function(){ on=!on; try{ localStorage.setItem('mg-study:sound',on?'on':'off'); }catch(e){} if(on) this.page(); return on; },
    /* 문 여는 소리: 낮은 삐걱임 + 바람 섞인 소리 */
    door:function(){ if(!on) return; var c=ac(); if(!c) return; var t=c.currentTime;
      var o=c.createOscillator(), f=c.createBiquadFilter(), g=c.createGain();
      o.type='sawtooth'; o.frequency.setValueAtTime(95,t); o.frequency.linearRampToValueAtTime(150,t+0.22); o.frequency.linearRampToValueAtTime(110,t+0.45);
      f.type='bandpass'; f.frequency.value=520; f.Q.value=6; env(g,t,0.09,0.06,0.5);
      o.connect(f); f.connect(g); g.connect(c.destination); o.start(t); o.stop(t+0.55);
      var n=noise(c,0.5), nf=c.createBiquadFilter(), ng=c.createGain(); nf.type='lowpass'; nf.frequency.value=900; env(ng,t,0.05,0.1,0.5);
      n.connect(nf); nf.connect(ng); ng.connect(c.destination); n.start(t);
      var k=c.createOscillator(), kg=c.createGain(); k.type='sine'; k.frequency.setValueAtTime(180,t+0.38); k.frequency.exponentialRampToValueAtTime(70,t+0.5); env(kg,t+0.38,0.12,0.01,0.14); /* 문틀에 닿는 작은 소리 */
      k.connect(kg); kg.connect(c.destination); k.start(t+0.38); k.stop(t+0.55); },
    /* 종이 넘기는 소리: 고음 쪽 잡음이 쓱 지나감 */
    page:function(){ if(!on) return; var c=ac(); if(!c) return; var t=c.currentTime;
      [0,0.11].forEach(function(dt,i){ var n=noise(c,0.3), f=c.createBiquadFilter(), g=c.createGain();
        f.type='bandpass'; f.Q.value=0.8; f.frequency.setValueAtTime(2500+i*600,t+dt); f.frequency.exponentialRampToValueAtTime(6500,t+dt+0.2);
        env(g,t+dt,i?0.12:0.2,0.03,0.22); n.connect(f); f.connect(g); g.connect(c.destination); n.start(t+dt); n.stop(t+dt+0.3); }); }
  };
})();

function themeBtn(){
  var sb=h('button',{class:'theme-btn sound-btn',title:'효과음 켜기/끄기','aria-label':'효과음 켜기 또는 끄기','aria-pressed':String(Snd.on),onclick:function(){
    sb.textContent=Snd.toggle()?'🔊':'🔇'; sb.setAttribute('aria-pressed',String(Snd.on));
  }},[Snd.on?'🔊':'🔇']);
  var tb=h('button',{class:'theme-btn',title:'밝기 전환','aria-label':'화면 밝기 전환',onclick:function(){
    var r=document.documentElement, cur=r.getAttribute('data-theme');
    var dark=cur?cur==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    r.setAttribute('data-theme',dark?'light':'dark');
    try{ localStorage.setItem('mg-study:theme',r.getAttribute('data-theme')); }catch(e){}
  }},['🌓']);
  return h('div',{class:'dock'},[sb,tb]);
}

/* ═════════ 홈 ═════════ */
function renderHome(){
  var app=$app(), d=new Date();
  var days=['일','월','화','수','목','금','토'];
  var learning=0;
  var books=Store.load().books; for(var id in books){ learning+=noteCounts(id).learning; }
  var page=h('div',{class:'page'},[
    h('header',{class:'hero'},[
      h('div',{class:'hero-top'},[
        h('div',{class:'kicker',text:'MINGYEOM · STUDY ROOM'}),
        h('h1',{text:'민겸이 공부 공간'}),
        h('div',{class:'date'},[d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일 '+days[d.getDay()]+'요일',h('span',{class:'dsep',text:' · '}),h('span',{class:'dmotto',text:'겪어나가는 모든 것이 공부다'})])
      ]),
      h('div',{class:'noisy','aria-label':'떠든 사람 민겸이'},[h('span',{class:'mer','aria-hidden':'true',html:ICONS.meron}),h('span',{class:'ntext'},[h('span',{class:'nl',text:'떠든 사람 :'}),h('span',{class:'nn',text:'민겸이'})])]),
      noticeBoard(),
      h('div',{class:'chalk-line'})
    ]),
    h('div',{class:'sec-title'},['오늘의 우리 집',h('a',{class:'more',href:'#/plan'},['일정표 열기 →'])]),
    todayPlan(),
    chatCard(),
    h('div',{class:'sec-title'},['공부방']),
    miniDashboard(),
    h('nav',{class:'menu study'},MENUS.map(function(m){
      return h('a',{class:'mcard',href:m.href,style:'--mc:'+m.color},[
        h('div',{class:'ic',html:ICONS[m.icon]||''}),
        h('div',{},[h('h3',{text:m.title}),h('p',{text:m.desc})]),
        m.id==='notes'&&learning?h('span',{class:'count',text:String(learning)}):null,
        h('span',{class:'go',text:'›'})
      ]);
    })),
    h('div',{class:'foot',text:'공부 기록은 이 기기에, 일정과 알림은 가족 모두와 함께 저장돼요'})
  ]);
  app.appendChild(page); app.appendChild(themeBtn());
}

/* ═════════ 책장 ═════════ */
/* 표지 사진은 정사각형 캔버스 안에 흰 여백이 있는 경우가 많다. 그대로 책 모양(세로로 긴 상자)에 채우면
 * 양옆이 잘려 글씨가 반쯤 보이므로, 흰 여백을 찾아 잘라 내고 표지의 실제 비율로 책 상자를 맞춘다. */
function fitCover(img, el){
  try{
    var W=img.naturalWidth, H=img.naturalHeight; if(!W||!H) return;
    var sc=Math.min(1,200/Math.max(W,H)), w=Math.max(1,Math.round(W*sc)), hh=Math.max(1,Math.round(H*sc));
    var c=document.createElement('canvas'); c.width=w; c.height=hh;
    var x=c.getContext('2d'); x.drawImage(img,0,0,w,hh);
    var d=x.getImageData(0,0,w,hh).data;
    function ink(px,py){ var k=(py*w+px)*4; return d[k+3]>20&&(d[k]<238||d[k+1]<238||d[k+2]<238); }
    function colInk(px){ var n=0; for(var py=0;py<hh;py++) if(ink(px,py)) n++; return n>=Math.max(2,hh*0.03); }
    function rowInk(py){ var n=0; for(var px=0;px<w;px++) if(ink(px,py)) n++; return n>=Math.max(2,w*0.03); }
    var L=0,R=w-1,T=0,B=hh-1;
    while(L<R&&!colInk(L)) L++; while(R>L&&!colInk(R)) R--;
    while(T<B&&!rowInk(T)) T++; while(B>T&&!rowInk(B)) B--;
    var cw=R-L+1, ch=B-T+1;
    if(cw<w*0.5||ch<hh*0.5) return;                       // 이상하게 잘리면 원본 그대로
    var r=Math.max(.6,Math.min(1,cw/ch));                  // 표지의 가로/세로 비율
    img.style.cssText='position:absolute;inset:auto;max-width:none;object-fit:fill;width:'+(w/cw*100)+'%;height:'+(hh/ch*100)+'%;left:'+(-L/cw*100)+'%;top:'+(-T/ch*100)+'%';
    el.style.setProperty('--ar',(r/0.93).toFixed(4));       // 책 상자 = 표지 폭 93% + 책등
  }catch(e){}
}
function bookEl(b, opts){
  opts=opts||{};
  var sub=SUBJECTS[b.subject]||{c:'#5b5b5b'};
  var img=b.cover?h('img',{src:'library/'+b.cover,alt:'',loading:'lazy',decoding:'async'}):null;
  if(img) img.addEventListener('error',function(){ el.classList.remove('has-img'); img.remove(); });
  if(img) img.addEventListener('load',function(){ fitCover(img,el); });
  var el=h('button',{class:'book'+(img?' has-img':'')+(opts.dim?' dim':''),style:'--c:'+(b.color||sub.c),'aria-label':bookLabel(b)+(opts.caption?' ('+opts.caption+')':'')},[
    h('div',{class:'cover'},[img]),h('div',{class:'pages'}),
    h('div',{class:'band t'}),h('div',{class:'band b'}),
    h('div',{class:'label'},[
      h('div',{class:'gs',text:b.grade+'학년 '+b.semester+'학기'}),
      h('div',{class:'sub',text:b.subject}),
      h('div',{class:'rule'}),
      h('div',{class:'cnt',text:opts.caption||(b.units+'개 단원 · '+b.questions+'문항')})
    ]),
    h('div',{class:'emblem',html:emblem(b.subject)}),
    h('div',{class:'ribbon'}),
    b.sample?h('div',{class:'sample',text:'샘플'}):null,
    opts.badge?h('div',{class:'badge',text:String(opts.badge)}):null
  ]);
  if(opts.onpick) el.addEventListener('click',function(){
    if(el.classList.contains('pull')) return;
    Snd.page();
    var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(rm) return opts.onpick();
    el.classList.add('pull'); setTimeout(opts.onpick,380);
  });
  return el;
}
function isSem(x){ return /^g\d+s\d+$/.test(x||''); }
function semKey(b){ return 'g'+b.grade+'s'+b.semester; }
function semBack(kind,b){ return '#/'+kind+(b&&b.grade&&b.semester&&b.grade!=='?'?'/'+semKey(b):''); }
/* 교실 문: 학년·학기를 고르는 화면 */
function renderDoors(kind){
  var app=$app(), page=h('div',{class:'page'});
  page.appendChild(h('div',{class:'topbar'},[
    h('a',{class:'btn back',href:'#/'},['← 홈']),
    h('div',{},[h('div',{class:'crumb',text:'민겸이 공부 공간'}),h('h1',{text:kind==='exam'?'시험으로 풀어보기':'오답노트'})])
  ]));
  page.appendChild(h('p',{class:'muted',style:'margin:-6px 0 14px',text:'들어갈 교실을 골라 보세요. 학년과 학기 문을 열면 그 학기 교과서가 나와요.'}));
  var hall=h('div',{class:'hall'}); page.appendChild(hall);
  app.appendChild(page); app.appendChild(themeBtn());
  return Data.catalogP().then(function(c){
    for(var g=1; g<=3; g++){
      var row=h('div',{class:'hall-row'},[h('div',{class:'hall-grade',text:g+'학년'})]);
      [1,2].forEach(function(sm){
        var bs=c.books.filter(function(b){ return b.grade===g&&b.semester===sm; });
        var learning=0; bs.forEach(function(b){ learning+=noteCounts(b.id).learning; });
        var door=h('a',{class:'door'+(bs.length?'':' closed'),href:bs.length?'#/'+kind+'/g'+g+'s'+sm:null,role:bs.length?null:'img','aria-label':g+'학년 '+sm+'학기'+(bs.length?' 교실, 교과서 '+bs.length+'권':' 교실, 준비 중')},[
          h('div',{class:'door-plate',text:g+'학년 '+sm+'학기'}),
          h('div',{class:'door-body'},[h('div',{class:'door-inside'},[h('div',{class:'shelf'}),h('div',{class:'shelf'}),h('div',{class:'shelf'}),h('div',{class:'shelf'})]),h('div',{class:'door-leaf'},[h('div',{class:'door-win'}),h('div',{class:'door-panel'}),h('div',{class:'door-knob'})])]),
          h('div',{class:'door-note',text:bs.length?(kind==='notes'&&learning?'학습 중 '+learning+'문제':'교과서 '+bs.length+'권'):'준비 중'}),
          kind==='notes'&&learning?h('div',{class:'door-badge',text:String(learning)}):null
        ]);
        if(bs.length) door.addEventListener('click',function(e){
          if(e.ctrlKey||e.metaKey||e.shiftKey||e.button) return;
          Snd.door();
          if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches) return;
          e.preventDefault(); if(door.classList.contains('opening')) return;
          door.classList.add('opening');
          var href=door.getAttribute('href'); setTimeout(function(){ location.hash=href; },380);
        });
        row.appendChild(door);
      });
      hall.appendChild(row);
    }
  }).catch(renderError);
}
function renderShelf(kind,sem){
  var app=$app();
  var page=h('div',{class:'page'});
  var gs=/^g(\d+)s(\d+)$/.exec(sem), semText=gs?gs[1]+'학년 '+gs[2]+'학기':'';
  page.appendChild(h('div',{class:'topbar'},[
    h('a',{class:'btn back',href:'#/'+kind},['← 교실 고르기']),
    h('div',{},[h('div',{class:'crumb',text:(kind==='exam'?'시험으로 풀어보기':'오답노트')}),h('h1',{text:semText})])
  ]));
  page.appendChild(h('p',{class:'muted',style:'margin:-6px 0 14px',text:kind==='exam'?'풀고 싶은 교과서를 눌러 보세요. 누를 때마다 새로운 시험을 볼 수 있어요.':'교과서별로 틀린 문제가 모여 있어요. 빨간 숫자는 아직 학습 중인 문제 수예요.'}));
  var cs=h('div',{class:'bookcase'}); page.appendChild(cs);
  if(kind==='notes') page.appendChild(backupCard());
  app.appendChild(page); app.appendChild(themeBtn());
  return Data.catalogP().then(function(c){
    var books=c.books.filter(function(b){ return semKey(b)===sem; }).sort(function(a,b){ return a.grade-b.grade||a.semester-b.semester||a.subject.localeCompare(b.subject,'ko'); });
    function layout(){
      cs.innerHTML='';
      if(!books.length){ cs.appendChild(h('div',{class:'shelf-empty',text:'아직 책장에 교과서가 없어요. /study로 자료를 만들면 여기에 꽂혀요.'})); return; }
      var w=cs.clientWidth||window.innerWidth, cols=w<480?2:w<760?3:w<1000?4:w<1200?5:6;
      for(var i=0;i<books.length;i+=cols){
        var row=h('div',{class:'shelf-row',style:'--cols:'+cols});
        books.slice(i,i+cols).forEach(function(b){
          var nc=noteCounts(b.id);
          row.appendChild(bookEl(b,{
            badge: kind==='notes'?nc.learning:0,
            dim: kind==='notes' && !nc.learning && !nc.mastered,
            caption: kind==='notes' ? ('학습 중 '+nc.learning+' · 졸업 '+nc.mastered) : null,
            onpick:function(){ go(kind==='exam'?'#/book/'+encodeURIComponent(b.id):'#/notes/'+encodeURIComponent(b.id)); }
          }));
        });
        cs.appendChild(row);
      }
    }
    layout();
    var rt; window.onresize=function(){ clearTimeout(rt); rt=setTimeout(function(){ if(document.body.contains(cs)) layout(); },150); };
  }).catch(renderError);
}
function backupCard(){
  var file=h('input',{type:'file',accept:'application/json',class:'hidden',onchange:function(e){
    var f=e.target.files[0]; if(!f) return;
    f.text().then(function(t){
      var inc=JSON.parse(t); if(!inc||!inc.books) throw new Error('형식');
      var d=Store.load();
      for(var id in inc.books){
        var src=inc.books[id], dst=Store.book(id);
        for(var q in (src.seen||{})) dst.seen[q]=Math.max(dst.seen[q]||0,src.seen[q]);
        for(var n in (src.notes||{})){ var a=dst.notes[n], b=src.notes[n]; if(!a||(b.lastWrongAt||'')>(a.lastWrongAt||'')||b.wrongCount>a.wrongCount) dst.notes[n]=b; }
        dst.history=(dst.history||[]).concat(src.history||[]).sort(function(x,y){ return x.at<y.at?-1:1; }).slice(-80);
      }
      Store.save(); toast('가져왔어요'); route();
    }).catch(function(){ toast('백업 파일을 읽지 못했어요'); });
  }});
  return h('div',{class:'card',style:'margin-top:22px'},[
    h('h3',{style:'font-size:1.05rem',text:'다른 기기로 옮기기'}),
    h('p',{class:'muted',style:'margin:4px 0 12px;font-size:.92rem',text:'오답노트는 이 기기에 저장돼요. 탭과 폰을 같이 쓰려면 한쪽에서 내보내고 다른 쪽에서 가져오세요.'}),
    h('div',{class:'row'},[
      h('button',{onclick:function(){
        var blob=new Blob([JSON.stringify(Store.load())],{type:'application/json'});
        var a=h('a',{href:URL.createObjectURL(blob),download:'민겸-오답노트-'+new Date().toISOString().slice(0,10)+'.json'}); document.body.appendChild(a); a.click(); a.remove();
      }},['⬇ 내보내기']),
      h('button',{onclick:function(){ file.click(); }},['⬆ 가져오기']), file
    ])
  ]);
}

/* ═════════ 책 (시험 범위 고르기) ═════════ */
function renderBook(id){
  var app=$app(), page=h('div',{class:'page'}); app.appendChild(page); app.appendChild(themeBtn());
  return Data.bookP(id).then(function(book){
    var st=Store.book(id), nc=noteCounts(id), last=(st.history||[]).slice(-1)[0];
    page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:semBack('exam',book)},['← 책장']),h('div',{class:'crumb',text:'시험으로 풀어보기'})]));
    var modeBox=h('div',{class:'modes'});
    function drawModes(){ modeBox.innerHTML='';
      [['practice','연습 모드','한 문제씩 풀고 바로 채점·해설'],['exam','실전 모드','시간 재며 끝까지 풀고 한 번에 채점']].forEach(function(m){
        modeBox.appendChild(h('button',{class:'mode'+(S.mode===m[0]?' sel':''),onclick:function(){ S.mode=m[0]; drawModes(); }},[h('b',{text:m[1]}),h('span',{text:m[2]})]));
      });
    }
    drawModes();
    var resume = S.exam && !S.exam.done && S.exam.bookId===id;
    page.appendChild(h('div',{class:'grid2'},[
      h('div',{class:'card'},[
        h('div',{class:'bookhead'},[bookEl({grade:book.grade,semester:book.semester,subject:book.subject,color:book.color,units:book.units.length,questions:book.questions.length,sample:book.sample,cover:book.cover}),
          h('div',{},[h('div',{class:'crumb',text:book.grade+'학년 '+book.semester+'학기'}),h('h1',{style:'font-size:1.7rem',text:book.subject}),
            book.description?h('p',{class:'muted',style:'margin:4px 0 0',text:book.description}):null,
            h('p',{class:'muted',style:'margin:6px 0 0;font-size:.9rem',text:'문제 은행 '+book.questions.length+'문항'+(last?' · 최근 '+Math.round(last.got/last.max*100)+'점':'')})])
        ]),
        h('p',{class:'muted',style:'margin:16px 0 0;font-size:.9rem',text:'단원 '+book.units.length+'개 · '+book.units.map(function(u){ return u.name; }).join(', ')}),
        h('h3',{style:'margin:18px 0 8px;font-size:1.05rem',text:'풀이 방식'}), modeBox,
        h('div',{class:'row',style:'margin-top:18px'},[
          h('button',{class:'primary',onclick:function(){ rangeModal(book); }},['✏️ 새로운 시험 보기']),
          resume?h('button',{onclick:function(){ go('#/quiz'); }},['이어서 풀기']):null
        ])
      ]),
      h('div',{class:'card'},[
        h('h3',{style:'font-size:1.05rem',text:'오답노트'}),
        h('p',{class:'muted',style:'margin:4px 0 12px',text:'학습 중 '+nc.learning+'문제 · 졸업 '+nc.mastered+'문제'}),
        h('a',{class:'btn',href:'#/notes/'+encodeURIComponent(id)},['📒 이 과목 오답노트']),
        book.units.some(function(u){return u.slides;})?h('h3',{style:'font-size:1.05rem;margin-top:20px',text:'요약 정리'}):null,
        h('div',{class:'row',style:'margin-top:8px'},book.units.filter(function(u){return u.slides;}).map(function(u){
          return h('a',{class:'btn',href:'library/'+encodeURIComponent(id)+'/'+u.slides},['📘 '+u.name]);
        }))
      ])
    ]));
  }).catch(renderError);
}

/* ═════════ 시험지 만들기 (문제 은행 → 매번 새 조합) ═════════ */
function prepare(q){
  var c=clone(q);
  if(c.type==='mc' && !c.fixedOrder){
    var perm=shuffle(c.choices.map(function(_,i){return i;}));
    c.choices=perm.map(function(i){ return q.choices[i]; });
    if(q.choiceExplanations) c.choiceExplanations=perm.map(function(i){ return q.choiceExplanations[i]; });
    var toNew=function(o){ return perm.indexOf(o-1)+1; };
    c.answer=Array.isArray(q.answer)?q.answer.map(toNew).sort(function(a,b){return a-b;}):toNew(q.answer);
    c._perm=perm;
  }
  return c;
}
function toOriginal(q,a){
  if(q.type!=='mc'||!q._perm||empty(a)) return a;
  var f=function(d){ return q._perm[d-1]+1; };
  return Array.isArray(a)?a.map(f).sort(function(x,y){return x-y;}):f(a);
}
/* 한 시험의 문항 수는 과목별 기출 구성(객관/단답/서술)에 맞추고, 고른 범위 안에서
 * 단원·난이도·배점·유형이 고르게 퍼지도록 슬롯을 뽑는다. 책 meta.json 의 "exam" 으로 덮어쓸 수 있다. */
var EXAM_DEFAULT = {
  '국어':{mc:25,short:4,essay:1,timeMin:50}, '사회':{mc:30,short:0,essay:0,timeMin:45}, '역사':{mc:30,short:0,essay:0,timeMin:45},
  '수학':{mc:18,short:0,essay:2,timeMin:50}, '영어':{mc:20,short:2,essay:3,timeMin:50}, '과학':{mc:25,short:0,essay:0,timeMin:45},
  '도덕':{mc:25,short:0,essay:1,timeMin:45}
};
function examSpec(book){
  var d=EXAM_DEFAULT[book.subject]||{mc:20,short:3,essay:2,timeMin:45}, o=book.exam||{};
  return {mc:o.mc!=null?o.mc:d.mc, short:o.short!=null?o.short:d.short, essay:o.essay!=null?o.essay:d.essay, timeMin:o.timeMin||d.timeMin};
}
function slotKind(s){ return s.type==='short'?'short':s.type==='essay'?'essay':'mc'; }
function planExam(book, unitIds){
  var spec=examSpec(book), cand=[];
  book.units.forEach(function(u,ui){
    if(unitIds.indexOf(u.id)<0) return;
    u.slots.forEach(function(s,si){ cand.push({u:u,s:s,ui:ui,si:si,kind:slotKind(s)}); });
  });
  var avail={mc:0,short:0,essay:0}; cand.forEach(function(c){ avail[c.kind]++; });
  var k={}; ['mc','short','essay'].forEach(function(t){ k[t]=Math.min(spec[t],avail[t]); });
  var lack=(spec.mc+spec.short+spec.essay)-(k.mc+k.short+k.essay);
  if(lack>0) k.mc=Math.min(avail.mc,k.mc+lack);
  var N=k.mc+k.short+k.essay;
  if(!N) return {picks:[],spec:spec,counts:k,n:0};
  function share(key){ var m={}; cand.forEach(function(c){ var v=key(c); m[v]=(m[v]||0)+1; }); for(var v in m) m[v]=Math.max(1,N*m[v]/cand.length); return m; }
  var qu={}; unitIds.forEach(function(id){ qu[id]=N/unitIds.length; });
  var qd=share(function(c){ return c.s.difficulty; }), qp=share(function(c){ return c.s.points; });
  var cu={}, cd={}, cp={}, picks=[], left=cand.slice();
  /* 같은 사실을 묻는 슬롯(avoid)은 한 시험지에 함께 뽑지 않는다(후보가 모자라면 허용) */
  function clash(c){ return picks.some(function(p){ return p.u.id===c.u.id && ((c.s.avoid||[]).indexOf(p.s.id)>=0 || (p.s.avoid||[]).indexOf(c.s.id)>=0); }); }
  ['essay','short','mc'].forEach(function(t){
    for(var i=0;i<k[t];i++){
      var best=null, bs=1e9;
      for(var pass=0; pass<2 && !best; pass++) left.forEach(function(c){
        if(c.kind!==t) return;
        if(pass===0 && clash(c)) return;
        var sc=((cu[c.u.id]||0)+1)/qu[c.u.id]+((cd[c.s.difficulty]||0)+1)/qd[c.s.difficulty]+((cp[c.s.points]||0)+1)/qp[c.s.points]+Math.random()*0.05;
        if(sc<bs){ bs=sc; best=c; }
      });
      if(!best) break;
      cu[best.u.id]=(cu[best.u.id]||0)+1; cd[best.s.difficulty]=(cd[best.s.difficulty]||0)+1; cp[best.s.points]=(cp[best.s.points]||0)+1;
      picks.push(best); left.splice(left.indexOf(best),1);
    }
  });
  return {picks:picks,spec:spec,counts:k,n:N};
}
function examCounts(book, unitIds){
  var spec=examSpec(book), av={mc:0,short:0,essay:0};
  book.units.forEach(function(u){ if(unitIds.indexOf(u.id)<0) return; u.slots.forEach(function(s){ av[slotKind(s)]++; }); });
  var k={mc:Math.min(spec.mc,av.mc),short:Math.min(spec.short,av.short),essay:Math.min(spec.essay,av.essay)};
  var lack=(spec.mc+spec.short+spec.essay)-(k.mc+k.short+k.essay);
  if(lack>0) k.mc=Math.min(av.mc,k.mc+lack);
  return {mc:k.mc,short:k.short,essay:k.essay,n:k.mc+k.short+k.essay};
}
function makeExam(book, unitIds, mode){
  var st=Store.book(book.id), groups={};
  book.questions.forEach(function(q){ if(unitIds.indexOf(q.unit)<0) return; var k=q.unit+'/'+q.slot; (groups[k]=groups[k]||[]).push(q); });
  var plan=planExam(book,unitIds), picked=[];
  plan.picks.forEach(function(c){
    var vs=groups[c.u.id+'/'+c.s.id]; if(!vs||!vs.length) return;
    var min=Math.min.apply(null,vs.map(function(v){ return st.seen[v.id]||0; }));
    var pool=vs.filter(function(v){ return (st.seen[v.id]||0)===min; });
    picked.push({q:pool[Math.floor(Math.random()*pool.length)],ui:c.ui,si:c.si});
  });
  picked.sort(function(a,b){ return TYPE_ORDER[a.q.type]-TYPE_ORDER[b.q.type]||a.ui-b.ui||a.si-b.si; });
  var orig={}; picked.forEach(function(p){ orig[p.q.id]=p.q; });
  var total=plan.spec.mc+plan.spec.short+plan.spec.essay, time=Math.max(10,Math.round(plan.spec.timeMin*picked.length/(total||1)));
  return newExam({bookId:book.id,title:bookLabel(book),mode:mode,source:'exam',units:unitIds,qs:picked.map(function(p){return prepare(p.q);}),orig:orig,timeLimitMin:mode==='exam'?time:0});
}
function makeNotesExam(bookId, title){
  var notes=Store.book(bookId).notes, list=[];
  for(var k in notes) if(!notes[k].mastered) list.push(notes[k]);
  list.sort(function(a,b){ return b.wrongCount-a.wrongCount||(a.lastWrongAt<b.lastWrongAt?1:-1); });
  list=list.slice(0,20);
  var orig={}; list.forEach(function(n){ orig[n.q.id]=n.q; });
  var qs=shuffle(list.map(function(n){ return n.q; })).sort(function(a,b){ return TYPE_ORDER[a.type]-TYPE_ORDER[b.type]; }).map(prepare);
  return newExam({bookId:bookId,title:title+' 오답노트',mode:'practice',source:'notes',qs:qs,orig:orig,timeLimitMin:0});
}
function newExam(o){ o.ans={}; o.checked={}; o.self={}; o.idx=0; o.startAt=Date.now(); o.done=false; return o; }

/* ───────── 채점 ───────── */
function grade(q,a){
  if(empty(a)) return false;
  if(q.type==='mc') return isMulti(q)?sameSet(a,q.answer):a===q.answer;
  if(q.type==='ox') return a===q.answer;
  if(q.type==='short'){ var acc=Array.isArray(q.answer)?q.answer:[q.answer], n=norm(a); return acc.some(function(x){ return norm(x)===n; }); }
  return null;
}
function selfScore(self,q){ if(!q.rubric) return 0; return q.rubric.reduce(function(s,r,i){ return s+(self[q.id+':'+i]?(r.points||0):0); },0); }
function earnedOf(q,a,self){ return q.type==='essay'?selfScore(self||{},q):(grade(q,a)===true?(q.points||0):0); }
function totalPts(qs){ return qs.reduce(function(s,q){ return s+(q.points||0); },0); }

/* ═════════ 시험 화면 ═════════ */
function answeredCount(E){ return E.qs.filter(function(q){ return !empty(E.ans[q.id]); }).length; }
function startTimer(E){
  stopTimer(); if(!E.timeLimitMin||E.mode!=='exam') return;
  S.timerId=setInterval(function(){
    var left=E.timeLimitMin*60-(Date.now()-E.startAt)/1000, el=document.getElementById('timer');
    if(el){ el.textContent='⏱ '+fmtTime(left); el.classList.toggle('low',left<180); }
    if(left<=0){ stopTimer(); toast('시험 시간이 끝나 자동 제출했어요'); submit(); }
  },1000);
}
/* 같은 그림이 한 화면에 두 번 들어가도(본문+참고 자료) 화살표 등 SVG 내부 id가 충돌하지 않게 고유 id로 바꾼다 */
var svgSeq=0;
function uniqSvg(svg){
  var n=++svgSeq;
  return String(svg||'').replace(/\bid=(['"])([^'"]+)\1/g,function(m,q,a){ return 'id='+q+a+'-'+n+q; })
    .replace(/url\(#([^)]+)\)/g,function(m,a){ return 'url(#'+a+'-'+n+')'; })
    .replace(/href=(['"])#([^'"]+)\1/g,function(m,q,a){ return 'href='+q+'#'+a+'-'+n+q; });
}
function figureEl(f){ if(!f) return null; return h('figure',{class:'fig',style:'margin:0'},[h('div',{html:uniqSvg(f.svg)}),f.caption?h('figcaption',{text:f.caption}):null]); }
function stemText(q){
  if(q.passage && /^이(에|를|와|\s)/.test(q.question)){
    var first=q.passage.split('\n').filter(function(l){ return l.trim() && l.indexOf('〈')!==0; })[0];
    if(first) return first.replace(/\s+/g,' ').slice(0,60)+(first.length>60?'…':'')+' — '+q.question;
  }
  return q.question;
}
function passageEl(q){ if(!q.passage) return null; return h('div',{class:'passage'},[q.passageTitle?h('span',{class:'ptitle',text:q.passageTitle}):null,q.passage]); }

function renderQ(){
  var E=S.exam, app=$app(), q=E.qs[E.idx], n=E.qs.length, practice=E.mode==='practice', locked=practice&&!!E.checked[q.id];
  var page=h('div',{class:'page'}); app.appendChild(page);
  var left=E.mode==='exam'&&E.timeLimitMin?E.timeLimitMin*60-(Date.now()-E.startAt)/1000:null;
  page.appendChild(h('div',{class:'qtop'},[
    h('div',{class:'row'},[
      h('span',{class:'muted',style:'font-size:.92rem',text:E.title+' · '+(practice?'연습':'실전')+' · '+(E.idx+1)+' / '+n}),
      h('span',{class:'spacer'}),
      left!=null?h('span',{id:'timer',class:'timer'+(left<180?' low':''),text:'⏱ '+fmtTime(left)}):null,
      h('button',{style:'min-height:38px;padding:6px 12px',onclick:function(){ if(confirm('시험을 그만둘까요? 푼 내용은 사라져요.')){ var b=E.bookId; S.exam=null; go(E.source==='notes'?'#/notes/'+encodeURIComponent(b):'#/book/'+encodeURIComponent(b)); } }},['나가기'])
    ]),
    h('div',{class:'bar'},[h('i',{style:'width:'+(answeredCount(E)/n*100)+'%'})])
  ]));
  var card=h('div',{class:'qcard'});
  card.appendChild(h('div',{class:'qhead'},[h('span',{class:'qnum',text:(E.idx+1)+'.'}),h('span',{class:'pts',text:(q.points||0)+'점'})]));
  var side=q.figure||q.passage;
  var left_=h('div',{},[passageEl(q),q.passage&&q.figure?h('div',{style:'height:12px'}):null,figureEl(q.figure)]);
  var right_=h('div',{});
  right_.appendChild(h('div',{class:'qtext',style:side?'margin-top:0':'',text:q.question}));
  if(isMulti(q)) right_.appendChild(h('div',{class:'hint',style:'margin:-6px 0 12px',text:'정답 '+q.answer.length+'개를 모두 고르세요.'}));
  var a=E.ans[q.id];
  function setAns(v){ E.ans[q.id]=v; if(!locked) renderQ(); }
  if(q.type==='mc'){
    var box=h('div',{class:'choices'});
    q.choices.forEach(function(c,i){
      var no=i+1, sel=isMulti(q)?(a||[]).indexOf(no)>=0:a===no, cls='choice'+(sel?' sel':'');
      if(locked){ var r=isMulti(q)?q.answer.indexOf(no)>=0:q.answer===no; cls=r?'choice right':sel?'choice wrong':'choice'; }
      box.appendChild(h('button',{class:cls,disabled:locked?'disabled':false,onclick:function(){
        if(isMulti(q)){ var arr=(a||[]).slice(), p=arr.indexOf(no); if(p>=0) arr.splice(p,1); else arr.push(no); setAns(arr); } else setAns(no);
      }},[h('span',{class:'no',text:CIRCLED[i]}),h('span',{text:c})]));
    });
    right_.appendChild(box);
  }else if(q.type==='ox'){
    var ox=h('div',{class:'ox'});
    [[true,'O'],[false,'X']].forEach(function(p){
      var cls=a===p[0]?'sel':''; if(locked){ cls=q.answer===p[0]?'right':a===p[0]?'wrong':''; }
      ox.appendChild(h('button',{class:'choice '+cls,disabled:locked?'disabled':false,onclick:function(){ setAns(p[0]); }},[p[1]]));
    });
    right_.appendChild(ox);
  }else if(q.type==='short'){
    var inp=h('input',{type:'text',value:a||'',placeholder:'답을 입력하세요',disabled:locked?'disabled':false,
      oninput:function(e){ E.ans[q.id]=e.target.value; updateNav(); },onkeydown:function(e){ if(e.key==='Enter'){ e.preventDefault(); primary(); } }});
    right_.appendChild(inp); if(q.answerHint) right_.appendChild(h('div',{class:'hint',text:q.answerHint}));
  }else if(q.type==='essay'){
    var ta=h('textarea',{placeholder:'답안을 작성하세요',disabled:locked?'disabled':false,oninput:function(e){ E.ans[q.id]=e.target.value; updateNav(); }});
    ta.value=a||''; right_.appendChild(ta); if(q.answerHint) right_.appendChild(h('div',{class:'hint',text:q.answerHint}));
  }
  if(locked) right_.appendChild(feedback(q,a,E.self,true));
  card.appendChild(h('div',{class:'qgrid'+(side?' side':'')},side?[left_,right_]:[right_]));
  page.appendChild(card);
  if(!practice){
    var pal=h('div',{class:'palette'});
    E.qs.forEach(function(qq,i){ pal.appendChild(h('button',{class:(!empty(E.ans[qq.id])?'done':'')+(i===E.idx?' cur':''),onclick:function(){ E.idx=i; renderQ(); window.scrollTo(0,0); }},[String(i+1)])); });
    page.appendChild(h('div',{class:'card',style:'margin-top:12px;padding:16px'},[h('div',{class:'muted',style:'font-size:.88rem',text:'문항 이동 (푼 문제는 초록색)'}),pal]));
  }
  renderNav(); startTimer(E);
}
function feedback(q,a,self,interactive){
  var g=grade(q,a), kids=[];
  if(q.type==='essay'){
    kids.push(h('b',{class:'t',text:'모범 답안과 비교해 스스로 채점해 보세요'}));
    kids.push(h('div',{class:'model',text:q.modelAnswer||''}));
    var rb=h('div',{class:'rubric'});
    (q.rubric||[]).forEach(function(r,i){
      var key=q.id+':'+i, cb=h('input',{type:'checkbox',disabled:interactive?false:'disabled'}); cb.checked=!!self[key];
      cb.addEventListener('change',function(){ self[key]=cb.checked; var t=document.getElementById('self-'+q.id); if(t) t.textContent=selfScore(self,q)+' / '+q.points+'점'; });
      rb.appendChild(h('label',{},[cb,h('span',{text:r.criterion+' ('+r.points+'점)'})]));
    });
    kids.push(h('div',{class:'muted',style:'font-size:.9rem',text:'채점 기준 — 내 답안에 들어 있는 항목을 체크하세요'}),rb);
    kids.push(h('div',{},[h('b',{text:'내 점수: '}),h('span',{id:'self-'+q.id,text:selfScore(self,q)+' / '+q.points+'점'})]));
    return h('div',{class:'fb self'},kids);
  }
  kids.push(h('b',{class:'t',text:g?'⭕ 정답이에요!':'❌ 틀렸어요'}));
  if(!g){ kids.push(h('div',{},[h('b',{text:'정답: '}),h('span',{text:rightText(q)})])); kids.push(h('div',{class:'pre',style:'margin-top:4px',text:'💬 '+whyWrong(q,a)})); }
  if(q.explanation) kids.push(h('div',{style:'margin-top:4px',text:q.explanation}));
  kids.push(h('div',{class:'src',text:'자세한 풀이는 시험이 끝난 뒤 오답풀이에서 볼 수 있어요.'}));
  return h('div',{class:'fb '+(g?'ok':'bad')},kids);
}
function renderNav(){
  removeNav(); S.nav=h('div',{class:'qnav'},[h('div',{class:'in',id:'navin'})]); document.body.appendChild(S.nav); updateNav();
}
function updateNav(){
  var box=document.getElementById('navin'); if(!box) return; box.innerHTML='';
  var E=S.exam, q=E.qs[E.idx], last=E.idx===E.qs.length-1, has=!empty(E.ans[q.id]);
  box.appendChild(h('button',{disabled:E.idx===0?'disabled':false,onclick:function(){ E.idx--; renderQ(); window.scrollTo(0,0); }},['← 이전']));
  box.appendChild(h('span',{class:'spacer'}));
  if(E.mode==='practice'){
    if(!E.checked[q.id]) box.appendChild(h('button',{class:'primary',disabled:has?false:'disabled',onclick:primary},['정답 확인']));
    else box.appendChild(h('button',{class:'primary',onclick:primary},[last?'결과 보기':'다음 →']));
  }else box.appendChild(h('button',{class:'primary',onclick:primary},[last?'제출하기':'다음 →']));
}
function primary(){
  var E=S.exam, q=E.qs[E.idx], last=E.idx===E.qs.length-1;
  if(E.mode==='practice'){
    if(!E.checked[q.id]){ if(empty(E.ans[q.id])) return; E.checked[q.id]=true; renderQ(); return; }
    if(last) return submit(); E.idx++; renderQ(); window.scrollTo(0,0); return;
  }
  if(!last){ E.idx++; renderQ(); window.scrollTo(0,0); return; }
  var left=E.qs.length-answeredCount(E);
  if(left>0&&!confirm('아직 안 푼 문제가 '+left+'개 있어요. 그래도 제출할까요?')) return;
  submit();
}
function submit(){
  var E=S.exam; stopTimer(); removeNav();
  if(E.mode==='exam'&&E.qs.some(function(q){return q.type==='essay';})) return renderSelfGrade();
  finalize(); go('#/result');
}
function renderSelfGrade(){
  var E=S.exam, app=$app(), page=h('div',{class:'page'}); app.appendChild(page);
  page.appendChild(h('div',{class:'card'},[h('h2',{text:'서술형 자기 채점'}),h('p',{class:'muted',text:'모범 답안과 채점 기준을 보고, 내 답안에 들어 있는 항목을 체크하세요.'})]));
  E.qs.forEach(function(q,i){
    if(q.type!=='essay') return;
    page.appendChild(h('div',{class:'qcard',style:'margin-top:12px'},[
      h('div',{class:'qhead'},[h('span',{class:'qnum',text:(i+1)+'.'}),h('span',{class:'pts',text:q.points+'점'})]),
      h('div',{class:'qtext',text:q.question}),h('div',{class:'muted',text:'내 답안'}),
      h('div',{class:'passage',text:E.ans[q.id]||'(작성하지 않음)'}),feedback(q,E.ans[q.id],E.self,true)
    ]));
  });
  page.appendChild(h('div',{class:'row',style:'margin-top:14px'},[h('span',{class:'spacer'}),h('button',{class:'primary',onclick:function(){ finalize(); go('#/result'); }},['채점 완료 → 결과 보기'])]));
  window.scrollTo(0,0);
}

/* ───────── 제출 확정: 기록·오답노트 DB 갱신 ───────── */
function summarize(E){
  var got=0,max=totalPts(E.qs),byD={},byC={},wrong=[];
  E.qs.forEach(function(q){
    var e=earnedOf(q,E.ans[q.id],E.self), p=q.points||0, full=e>=p&&p>0; got+=e; if(!full) wrong.push(q);
    var d=q.difficulty||'-'; byD[d]=byD[d]||{g:0,m:0,n:0,r:0}; byD[d].g+=e; byD[d].m+=p; byD[d].n++; if(full) byD[d].r++;
    var c=q.concept||'기타'; byC[c]=byC[c]||{g:0,m:0,n:0,r:0}; byC[c].g+=e; byC[c].m+=p; byC[c].n++; if(full) byC[c].r++;
  });
  return {got:got,max:max,byD:byD,byC:byC,wrong:wrong,score100:max?Math.round(got/max*100):0};
}
function pickSelf(self,q){ var o={}; for(var k in self) if(k.indexOf(q.id+':')===0) o[k]=self[k]; return o; }
function finalize(){
  var E=S.exam; E.done=true; E.endAt=Date.now();
  var st=Store.book(E.bookId), now=new Date().toISOString(), R=summarize(E);
  E.qs.forEach(function(q){
    st.seen[q.id]=(st.seen[q.id]||0)+1;
    var full=earnedOf(q,E.ans[q.id],E.self)>=(q.points||0), n=st.notes[q.id];
    if(!full){
      st.notes[q.id]={q:E.orig[q.id]||q,ans:toOriginal(q,E.ans[q.id]),self:pickSelf(E.self,q),wrongCount:(n?n.wrongCount:0)+1,streak:0,mastered:false,
        firstWrongAt:n?n.firstWrongAt:now,lastWrongAt:now,bookTitle:E.title};
    }else if(n&&!n.mastered){ n.streak=(n.streak||0)+1; if(n.streak>=2){ n.mastered=true; n.masteredAt=now; } }
  });
  // 대시보드용 기록: 문항별 결과(단원·개념·난이도·유형)까지 저장
  var items=E.qs.map(function(q){ var e=earnedOf(q,E.ans[q.id],E.self); return {id:q.id,u:q.unit||'',c:q.concept||'기타',d:q.difficulty||'',t:q.type,p:q.points||0,e:e,ok:e>=(q.points||0)?1:0}; });
  st.history=(st.history||[]).concat([{at:now,bookId:E.bookId,source:E.source,mode:E.mode,got:R.got,max:R.max,n:E.qs.length,units:E.units||null,
    dur:Math.round((E.endAt-E.startAt)/1000),items:items}]).slice(-300);
  Store.save();
}

/* ═════════ 결과 ═════════ */
function renderResult(){
  var E=S.exam, R=summarize(E), app=$app(), page=h('div',{class:'page'}); app.appendChild(page);
  var mins=Math.max(1,Math.round((E.endAt-E.startAt)/60000));
  function table(title,obj,order){
    var keys=Object.keys(obj); if(order) keys.sort(function(a,b){ return order.indexOf(a)-order.indexOf(b); });
    return h('div',{class:'card'},[h('h3',{style:'font-size:1.05rem',text:title}),h('table',{},[
      h('thead',{},[h('tr',{},[h('th',{text:'구분'}),h('th',{class:'n',text:'맞힘'}),h('th',{class:'n',text:'점수'})])]),
      h('tbody',{},keys.map(function(k){ var v=obj[k]; return h('tr',{},[h('td',{text:k}),h('td',{class:'n',text:v.r+'/'+v.n}),h('td',{class:'n',text:v.g+'/'+v.m})]); }))
    ])]);
  }
  var masteredNow=E.source==='notes'?E.qs.filter(function(q){ var n=Store.book(E.bookId).notes[q.id]; return n&&n.mastered&&n.masteredAt&&new Date(n.masteredAt).getTime()>=E.startAt; }).length:0;
  page.appendChild(h('div',{class:'topbar'},[h('div',{},[h('div',{class:'crumb',text:E.title}),h('h1',{text:'시험 결과'})])]));
  page.appendChild(h('div',{class:'card'},[
    h('div',{class:'muted',text:(E.mode==='exam'?'실전':'연습')+' · '+E.qs.length+'문항 · '+mins+'분'}),
    h('div',{class:'big',text:R.got+' / '+R.max+'점'}),
    h('div',{class:'muted',text:'100점 환산 '+R.score100+'점'+(R.wrong.length?' · 틀린 문제 '+R.wrong.length+'개는 오답노트에 저장했어요':'')}),
    masteredNow?h('div',{style:'margin-top:6px;color:var(--ok);font-weight:700',text:'🎓 오답노트에서 '+masteredNow+'문제 졸업!'}):null,
    h('div',{class:'row',style:'margin-top:16px'},[
      R.wrong.length?h('button',{class:'primary',onclick:function(){ openReview(R.wrong.map(function(q){ return {q:q,ans:E.ans[q.id],self:pickSelf(E.self,q)}; }),E.title+' 오답풀이','#/result'); }},['📝 상세 오답풀이 ('+R.wrong.length+')']):h('span',{style:'font-weight:700',text:'🎉 모두 맞혔어요!'}),
      E.source==='exam'?h('button',{onclick:function(){ Data.bookP(E.bookId).then(function(b){ S.exam=makeExam(b,E.units,E.mode); go('#/quiz'); }); }},['✏️ 새로운 시험 보기']):null,
      h('a',{class:'btn',href:'#/notes/'+encodeURIComponent(E.bookId)},['📒 오답노트']),
      h('a',{class:'btn',href:'#/'},['홈'])
    ])
  ]));
  page.appendChild(h('div',{class:'res-grid'},[table('난이도별',R.byD,['하','중','상','-']),table('개념별',R.byC)]));
}

/* ═════════ 오답풀이 (한 문제 = 한 페이지) ═════════ */
function rightText(q){
  if(q.type==='mc') return (isMulti(q)?q.answer:[q.answer]).map(function(n){ return CIRCLED[n-1]+' '+q.choices[n-1]; }).join(', ');
  if(q.type==='ox') return q.answer?'O':'X';
  if(q.type==='short') return (Array.isArray(q.answer)?q.answer:[q.answer]).join(' / ');
  return q.modelAnswer||'';
}
function myText(q,a){
  if(empty(a)) return '(답하지 않음)';
  if(q.type==='mc') return (Array.isArray(a)?a:[a]).map(function(n){ return CIRCLED[n-1]+' '+q.choices[n-1]; }).join(', ');
  if(q.type==='ox') return a?'O':'X';
  return String(a);
}
function whyWrong(q,a){
  if(empty(a)) return '답을 하지 않았어요. 아래 정답 풀이로 개념을 먼저 확인해 보세요.';
  if(q.type==='mc'&&q.choiceExplanations){
    var picks=Array.isArray(a)?a:[a], right=isMulti(q)?q.answer:[q.answer];
    var lines=picks.filter(function(n){ return right.indexOf(n)<0; }).map(function(n){ return '「'+q.choices[n-1]+'」 → '+q.choiceExplanations[n-1]; });
    if(isMulti(q)){ var miss=right.filter(function(n){ return picks.indexOf(n)<0; }); if(miss.length) lines.push('빠뜨린 정답: '+miss.map(function(n){ return '「'+q.choices[n-1]+'」'; }).join(', ')); }
    if(lines.length) return lines.join('\n');
  }
  if(q.type==='short'&&q.commonMistakes){
    var n=norm(a);
    for(var i=0;i<q.commonMistakes.length;i++){ var m=q.commonMistakes[i], c=Array.isArray(m.answer)?m.answer:[m.answer]; if(c.some(function(x){ return norm(x)===n; })) return m.why; }
  }
  if(q.type==='ox'&&q.wrongExplanation) return q.wrongExplanation;
  return '정답과 다른 답이에요. 아래 정답 풀이에서 어디가 달랐는지 비교해 보세요.';
}
function box(cls,title,kids){ return h('div',{class:'rv-box '+cls},[h('b',{class:'rv-t',text:title})].concat(kids)); }
function refEl(r){
  var body;
  if(r.kind==='svg') body=h('figure',{class:'fig',style:'margin:0'},[h('div',{html:uniqSvg(r.svg)}),r.caption?h('figcaption',{text:r.caption}):null]);
  else if(r.kind==='table') body=h('table',{},[h('thead',{},[h('tr',{},(r.head||[]).map(function(x){ return h('th',{text:x}); }))]),h('tbody',{},(r.rows||[]).map(function(row){ return h('tr',{},row.map(function(x){ return h('td',{text:x}); })); }))]);
  else body=h('div',{class:'pre',text:r.text||''});
  return h('div',{class:'ref'},[h('div',{class:'rt',text:(r.kind==='svg'?'🖼 ':r.kind==='table'?'📊 ':'📌 ')+r.title}),body]);
}
function openReview(items,title,back){
  S.review={items:items,title:title,back:back};
  try{ var d=Store.load(); d.lastReview=S.review; Store.save(); }catch(e){}
  go('#/review/1');
}
function renderReview(n){
  if(!S.review){ var lr=Store.load().lastReview; if(lr) S.review=lr; else return go('#/'); }
  var R=S.review, total=R.items.length; n=Math.min(Math.max(1,n||1),total);
  var it=R.items[n-1], q=it.q, a=it.ans, self=it.self||{};
  var app=$app(), page=h('div',{class:'page'}); app.appendChild(page); app.appendChild(themeBtn());
  var dots=h('div',{class:'dots'});
  R.items.forEach(function(_,i){ dots.appendChild(h('button',{class:i===n-1?'cur':'',onclick:function(){ go('#/review/'+(i+1)); },'aria-label':(i+1)+'번째 오답'},[String(i+1)])); });
  page.appendChild(h('div',{class:'rv-head'},[
    h('div',{class:'row'},[
      h('a',{class:'btn',style:'min-height:40px;padding:6px 14px',href:R.back||'#/'},['← 돌아가기']),
      h('div',{},[h('div',{class:'crumb',text:R.title}),h('b',{style:'font-family:var(--serif)',text:'오답풀이 '+n+' / '+total})])
    ]),dots
  ]));
  // 본문
  var main=h('div',{class:'main'}), kids=[];
  kids.push(h('div',{class:'qhead'},[
    h('span',{class:'chips'},[h('span',{class:'chip',text:q.concept||'기타'}),h('span',{class:'chip d-'+q.difficulty,text:'난이도 '+q.difficulty})]),
    h('span',{class:'pts',text:earnedOf(q,a,self)+' / '+q.points+'점'})
  ]));
  if(q.passage) kids.push(h('div',{style:'margin-top:12px'},[passageEl(q)]));
  if(q.figure) kids.push(h('div',{style:'margin-top:12px'},[figureEl(q.figure)]));
  kids.push(h('div',{class:'qtext',text:q.question}));
  if(q.type==='essay'){
    kids.push(box('rv-my','✍️ 내 답안',[h('div',{class:'pre',text:a||'(작성하지 않음)'})]));
    kids.push(box('','📋 채점 기준별 점검',(q.rubric||[]).map(function(r,i){ var ok=!!self[q.id+':'+i];
      return h('div',{class:'it '+(ok?'right':'wrong')},[h('div',{},[h('b',{text:ok?'✓ ':'✗ '}),r.criterion+' ('+r.points+'점)']),!ok&&r.tip?h('small',{text:'보완하려면: '+r.tip}):null]); })));
    kids.push(box('rv-ans','⭕ 모범 답안',[h('div',{class:'pre',text:q.modelAnswer||''})]));
  }else{
    kids.push(h('div',{class:'rv-pair'},[box('rv-my','❌ 내 답',[h('div',{text:myText(q,a)})]),box('rv-ans','⭕ 정답',[h('div',{text:rightText(q)})])]));
    kids.push(box('rv-why','🤔 왜 틀렸을까?',[h('div',{class:'pre',text:whyWrong(q,a)})]));
  }
  kids.push(box('rv-detail','🔍 정답 풀이',[h('div',{class:'pre',text:q.detail||q.explanation||''})]));
  if(q.type==='mc'&&q.choiceExplanations){
    var picks=Array.isArray(a)?a:[a], right=isMulti(q)?q.answer:[q.answer];
    kids.push(box('','🧩 보기별 분석',q.choices.map(function(c,i){
      var no=i+1, isR=right.indexOf(no)>=0, mine=picks.indexOf(no)>=0;
      return h('div',{class:'it'+(isR?' right':mine?' wrong':'')},[h('div',{},[h('b',{text:CIRCLED[i]+' '}),c,mine?h('span',{class:'tag',text:'내 선택'}):null,isR?h('span',{class:'tag ok',text:'정답'}):null]),h('small',{text:q.choiceExplanations[i]})]);
    })));
  }
  if(q.tip) kids.push(box('rv-tip','💡 기억할 점',[h('div',{class:'pre',text:q.tip})]));
  if(q.source) kids.push(h('div',{class:'src',text:'📖 '+q.source}));
  kids.forEach(function(k){ main.appendChild(k); });
  var mainCard=h('div',{class:'qcard'},[main]);
  // 참고 자료
  var refs=(q.refs||[]);
  var aside=h('aside',{class:'aside hide-m'},[h('div',{class:'refs card',style:'padding:16px'},[h('h3',{text:'📎 참고 자료'}),
    refs.length?null:h('p',{class:'muted',text:'이 문제의 참고 자료가 없어요.'})].concat(refs.map(refEl)))]);
  var tabs=h('div',{class:'rv-tabs'});
  var tMain=h('button',{class:'on',onclick:function(){ mainCard.classList.remove('hide-m'); aside.classList.add('hide-m'); tMain.classList.add('on'); tRef.classList.remove('on'); }},['풀이']);
  var tRef=h('button',{onclick:function(){ mainCard.classList.add('hide-m'); aside.classList.remove('hide-m'); tRef.classList.add('on'); tMain.classList.remove('on'); }},['📎 참고 자료 ('+refs.length+')']);
  tabs.appendChild(tMain); tabs.appendChild(tRef);
  page.appendChild(tabs);
  mainCard.className='qcard main';
  page.appendChild(h('div',{class:'rv-layout'},[mainCard,aside]));
  page.appendChild(h('div',{class:'rv-pager'},[
    h('button',{disabled:n<=1?'disabled':false,onclick:function(){ go('#/review/'+(n-1)); }},['← 이전 문제']),
    n<total?h('button',{class:'primary',onclick:function(){ go('#/review/'+(n+1)); }},['다음 문제 →']):h('a',{class:'btn primary',style:'flex:1;justify-content:center',href:R.back||'#/'},['다 봤어요 ✓'])
  ]));
  // 스와이프로 넘기기
  var sx=null, sy=null;
  page.addEventListener('touchstart',function(e){ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
  page.addEventListener('touchend',function(e){ if(sx==null) return; var dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy; sx=null;
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5){ if(dx<0&&n<total) go('#/review/'+(n+1)); else if(dx>0&&n>1) go('#/review/'+(n-1)); } },{passive:true});
  window.scrollTo(0,0);
}

/* ═════════ 오답노트 ═════════ */
function renderNotebook(id){
  var app=$app(), page=h('div',{class:'page'}); app.appendChild(page); app.appendChild(themeBtn());
  return Data.catalogP().then(function(c){
    var b=c.books.filter(function(x){ return x.id===id; })[0]||{grade:'?',semester:'?',subject:id};
    var title=bookLabel(b), st=Store.book(id), all=[];
    for(var k in st.notes) all.push(st.notes[k]);
    var learning=all.filter(function(n){ return !n.mastered; }), mastered=all.filter(function(n){ return n.mastered; });
    var tab=S.noteTab||'learning';
    page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:semBack('notes',b)},['← 책장']),h('div',{},[h('div',{class:'crumb',text:title}),h('h1',{text:'오답노트'})])]));
    page.appendChild(h('div',{class:'nstats'},[
      h('div',{class:'s'},[h('b',{text:String(learning.length)}),h('span',{class:'muted',text:'학습 중'})]),
      h('div',{class:'s'},[h('b',{text:String(mastered.length)}),h('span',{class:'muted',text:'졸업'})]),
      h('div',{class:'s'},[h('b',{text:String(all.reduce(function(s,n){ return s+n.wrongCount; },0))}),h('span',{class:'muted',text:'누적 오답'})])
    ]));
    page.appendChild(h('div',{class:'row'},[
      learning.length?h('button',{class:'primary',onclick:function(){ S.exam=makeNotesExam(id,title); go('#/quiz'); }},['✏️ 오답노트로 시험 보기']):null,
      learning.length?h('button',{onclick:function(){ openReview(learning.map(function(n){ return {q:n.q,ans:n.ans,self:n.self}; }),title+' 오답노트','#/notes/'+encodeURIComponent(id)); }},['📝 한 문제씩 복습']):null,
      !all.length?h('p',{class:'muted',text:'아직 틀린 문제가 없어요. 시험을 풀면 틀린 문제가 여기에 모여요.'}):null
    ]));
    if(all.length){
      var tabs=h('div',{class:'ntabs'});
      [['learning','학습 중'],['mastered','졸업'],['all','전체']].forEach(function(t){ tabs.appendChild(h('button',{class:tab===t[0]?'on':'',onclick:function(){ S.noteTab=t[0]; renderNotebook(id); }},[t[1]])); });
      page.appendChild(tabs);
      var list=tab==='learning'?learning:tab==='mastered'?mastered:all;
      list.sort(function(a,b){ return (a.q.concept||'').localeCompare(b.q.concept||'','ko')||b.wrongCount-a.wrongCount; });
      var groups={}; list.forEach(function(n){ var cc=n.q.concept||'기타'; (groups[cc]=groups[cc]||[]).push(n); });
      Object.keys(groups).forEach(function(cc){
        page.appendChild(h('div',{class:'sec-title',style:'margin-top:18px',text:cc+' ('+groups[cc].length+')'}));
        page.appendChild(h('div',{class:'nlist'},groups[cc].map(function(n){
          var idx=list.indexOf(n);
          return h('button',{class:'nitem',onclick:function(){ openReview(list.map(function(x){ return {q:x.q,ans:x.ans,self:x.self}; }),title+' 오답노트','#/notes/'+encodeURIComponent(id)); setTimeout(function(){ go('#/review/'+(idx+1)); },0); }},[
            h('div',{class:'q',text:stemText(n.q)}),
            h('div',{class:'m'},[
              h('span',{class:'chip d-'+n.q.difficulty,text:n.q.difficulty}),
              h('span',{text:'틀린 횟수 '+n.wrongCount}),
              h('span',{text:'마지막 '+fmtDate(n.lastWrongAt)}),
              n.mastered?h('span',{style:'color:var(--ok);font-weight:700',text:'🎓 졸업'}):h('span',{class:'streak'},['연속 정답 ',h('i',{class:(n.streak||0)>=1?'on':''}),h('i',{class:(n.streak||0)>=2?'on':''})])
            ])
          ]);
        })));
      });
    }
  }).catch(renderError);
}

/* ═════════ 모달 ═════════ */
function openModal(kids){
  var ov=h('div',{class:'modal-ov'}), box=h('div',{class:'modal',role:'dialog','aria-modal':'true'},kids);
  ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
  function key(e){ if(e.key==='Escape') close(); }
  function close(){ ov.remove(); document.removeEventListener('keydown',key); }
  document.addEventListener('keydown',key);
  ov.appendChild(box); document.body.appendChild(ov);
  return {close:close, box:box};
}
function closeModals(){ document.querySelectorAll('.modal-ov').forEach(function(m){ m.remove(); }); }

/* ═════════ 시험 범위 고르기 ═════════ */
function rangeModal(book){
  var st=Store.book(book.id), last=st.lastUnits||[], picked={};
  book.units.forEach(function(u){ picked[u.id]=!last.length||last.indexOf(u.id)>=0; });
  if(!book.units.some(function(u){ return picked[u.id]; })) book.units.forEach(function(u){ picked[u.id]=true; });
  var allCb=h('input',{type:'checkbox'}), startBtn, cbs={}, info=h('div',{class:'muted',style:'margin-top:10px;font-size:.9rem'});
  var list=h('div',{class:'opt'});
  book.units.forEach(function(u){
    var cb=h('input',{type:'checkbox'}); cb.checked=picked[u.id]; cbs[u.id]=cb;
    cb.addEventListener('change',function(){ picked[u.id]=cb.checked; refresh(); });
    list.appendChild(h('label',{},[cb,h('span',{text:u.name}),h('span',{class:'u-meta',text:'문제은행 '+u.slots.length+'칸'})]));
  });
  allCb.addEventListener('change',function(){ book.units.forEach(function(u){ picked[u.id]=allCb.checked; cbs[u.id].checked=allCb.checked; }); refresh(); });
  function chosen(){ return book.units.filter(function(u){ return picked[u.id]; }); }
  function refresh(){
    var c=chosen(), ec=examCounts(book,c.map(function(u){ return u.id; }));
    allCb.checked=c.length===book.units.length;
    startBtn.disabled=!c.length; startBtn.textContent=c.length?'시험 시작 ('+ec.n+'문항)':'단원을 골라 주세요';
    info.textContent=c.length?'객관식 '+ec.mc+(ec.short?' · 단답 '+ec.short:'')+(ec.essay?' · 서술 '+ec.essay:'')+' — 고른 범위에서 단원·난이도·배점이 고르게 섞여요.':'';
  }
  startBtn=h('button',{class:'primary',onclick:function(){
    var ids=chosen().map(function(u){ return u.id; }); if(!ids.length) return;
    st.lastUnits=ids; Store.save(); m.close();
    S.exam=makeExam(book,ids,S.mode); go('#/quiz');
  }});
  var m=openModal([
    h('div',{class:'crumb',text:bookLabel(book)+' · '+(S.mode==='exam'?'실전 모드':'연습 모드')}),
    h('h2',{style:'margin:2px 0 14px',text:'시험 범위를 골라주세요'}),
    h('label',{class:'all-pick'},[allCb,h('b',{text:'전체 선택'})]),
    list,
    info,
    h('div',{class:'row',style:'margin-top:16px;justify-content:flex-end'},[h('button',{onclick:function(){ m.close(); }},['취소']),startBtn])
  ]);
  refresh();
}

/* ═════════ 아빠·엄마 알림 ═════════
 * app/config.js 에 Firebase(Firestore) 설정이 있으면 모든 기기에서 공유,
 * 없으면 이 기기(localStorage)에만 저장된다. 비밀번호는 요청대로 단순 비교(암호화 없음). */
var CFG=window.MG_CONFIG||{};
var Notice={
  who:{ dad:{label:'아빠가 알림',icon:'👨',pw:'860923'}, mom:{label:'엄마가 알림',icon:'👩',pw:'800823'} },
  shared:function(){ var f=CFG.firebase; return !!(f&&f.projectId&&f.apiKey); },
  url:function(w){ var f=CFG.firebase; return 'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(f.projectId)+'/databases/(default)/documents/notices/'+w+'?key='+encodeURIComponent(f.apiKey); },
  get:function(w){
    if(!this.shared()){ try{ return Promise.resolve(JSON.parse(localStorage.getItem('mg-study:notice:'+w))||null); }catch(e){ return Promise.resolve(null); } }
    return fetch(this.url(w),{cache:'no-store'}).then(function(r){ if(r.status===404) return null; if(!r.ok) throw new Error('notice'); return r.json(); })
      .then(function(d){ if(!d||!d.fields) return null; return {text:(d.fields.text||{}).stringValue||'',updatedAt:(d.fields.updatedAt||{}).stringValue||''}; });
  },
  set:function(w,text){
    var v={text:text,updatedAt:new Date().toISOString()};
    if(!this.shared()){ try{ localStorage.setItem('mg-study:notice:'+w,JSON.stringify(v)); }catch(e){} return Promise.resolve(v); }
    return fetch(this.url(w),{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({fields:{text:{stringValue:text},updatedAt:{stringValue:v.updatedAt}}})}).then(function(r){ if(!r.ok) throw new Error('save'); return v; });
  }
};
function fmtDateTime(iso){ try{ var d=new Date(iso), hh=d.getHours(), mm=('0'+d.getMinutes()).slice(-2); return (d.getMonth()+1)+'월 '+d.getDate()+'일 '+(hh<12?'오전 ':'오후 ')+((hh%12)||12)+':'+mm; }catch(e){ return ''; } }
function seenKey(w){ return 'mg-study:seen:'+w; }
function noticeBoard(){
  var fills={};
  var wrap=h('div',{class:'notes'},['dad','mom'].map(function(w){
    var c=Notice.who[w], body=h('div',{class:'nb chalk',text:'불러오는 중…'}), dt=h('div',{class:'nd'});
    fills[w]=function(v){ var has=v&&v.text; body.textContent=has?v.text:'아직 남긴 말이 없어요'; body.classList.toggle('empty',!has); dt.textContent=has&&v.updatedAt?fmtDateTime(v.updatedAt):''; };
    return h('button',{class:'note '+w,'aria-label':c.label+' 쓰기',onclick:function(){ noticeEditor(w,fills[w]); }},[
      h('div',{class:'nt'},[h('span',{class:'chalk',text:c.label}),h('span',{class:'pen',text:'✎'})]),body,dt]);
  }));
  wrap.insertBefore(h('span',{class:'divider','aria-hidden':'true'}),wrap.lastChild);
  Promise.all(['dad','mom'].map(function(w){ return Notice.get(w).catch(function(){ return {error:true}; }); })).then(function(vs){
    var fresh=[];
    ['dad','mom'].forEach(function(w,i){
      var v=vs[i];
      if(v&&v.error){ var el=wrap.querySelector('.note.'+w+' .nb'); if(el) el.textContent='알림을 불러오지 못했어요'; return; }
      fills[w](v);
      var seen=''; try{ seen=localStorage.getItem(seenKey(w))||''; }catch(e){}
      if(v&&v.text&&v.updatedAt&&v.updatedAt>seen) fresh.push([w,v]);
    });
    if(fresh.length&&document.body.contains(wrap)) noticePopup(fresh);
  });
  return wrap;
}
function noticePopup(list){
  var m=openModal([
    h('h2',{style:'margin:0 0 12px',text:'새 알림이 있어요'})
  ].concat(list.map(function(p){ var c=Notice.who[p[0]];
    return h('div',{class:'pop-note '+p[0]},[h('b',{text:c.label}),h('div',{class:'pre',style:'margin-top:6px',text:p[1].text}),h('div',{class:'nd',text:fmtDateTime(p[1].updatedAt)})]);
  })).concat([h('div',{class:'row',style:'justify-content:flex-end;margin-top:14px'},[h('button',{class:'primary',onclick:function(){
    list.forEach(function(p){ try{ localStorage.setItem(seenKey(p[0]),p[1].updatedAt); }catch(e){} }); m.close();
  }},['확인했어요'])])]));
}
/* 비밀번호(아빠·엄마): 알림 쓰기와 채팅 사람 선택에 같이 쓴다. 기본값은 Notice.who[].pw, 바꾸면 Firestore secrets/{dad|mom}.pw에 저장돼 모든 기기에 적용된다.
 * 요청대로 암호화 없이 단순 비교하며, 중요한 비밀번호가 아니라는 전제다. */
var Pw={
  url:function(w){ var f=CFG.firebase; return 'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(f.projectId)+'/databases/(default)/documents/secrets/'+w+'?key='+encodeURIComponent(f.apiKey); },
  get:function(w){
    var def=Notice.who[w].pw; if(!Notice.shared()) return Promise.resolve(def);
    return fetch(this.url(w),{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(d){ var v=d&&d.fields&&d.fields.pw&&d.fields.pw.stringValue; return v||def; }).catch(function(){ return def; });
  },
  set:function(w,prev,pw){
    return fetch(this.url(w)+'&updateMask.fieldPaths=pw&updateMask.fieldPaths=prev',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{pw:{stringValue:pw},prev:{stringValue:prev}}})})
      .then(function(r){ if(!r.ok) throw new Error('save'); });
  }
};
function pwPrompt(w,o){
  var err=h('div',{class:'err'});
  var pw=h('input',{type:'password',inputmode:'numeric',autocomplete:'off',maxlength:'12',placeholder:'비밀번호',class:'pw'});
  function check(){
    Pw.get(w).then(function(cur){
      if(pw.value!==cur){ err.textContent='비밀번호가 달라요'; m.box.classList.remove('shake'); void m.box.offsetWidth; m.box.classList.add('shake'); pw.select(); return; }
      m.close(); o.onok();
    });
  }
  pw.addEventListener('keydown',function(e){ if(e.key==='Enter') check(); });
  var m=openModal([h('h2',{style:'margin:0 0 6px',text:o.title}),h('p',{class:'muted',style:'margin:0 0 12px',text:o.desc}),pw,err,
    h('div',{class:'row',style:'justify-content:space-between;margin-top:14px'},[h('button',{onclick:function(){ m.close(); changePw(w); }},['비밀번호 바꾸기']),
      h('span',{class:'row',style:'gap:8px'},[h('button',{onclick:function(){ m.close(); if(o.oncancel) o.oncancel(); }},['취소']),h('button',{class:'primary',onclick:check},['확인'])])])]);
  setTimeout(function(){ pw.focus(); },30);
}
function changePw(w){
  var label=(Notice.who[w]||{}).label||'', who=(CHAT_PEOPLE[w]||{}).n||w;
  var cur=h('input',{type:'password',inputmode:'numeric',autocomplete:'off',maxlength:'12',placeholder:'지금 비밀번호',class:'pw'});
  var n1=h('input',{type:'password',inputmode:'numeric',autocomplete:'off',maxlength:'12',placeholder:'새 비밀번호 (4~12자)',class:'pw',style:'margin-top:8px'});
  var n2=h('input',{type:'password',inputmode:'numeric',autocomplete:'off',maxlength:'12',placeholder:'새 비밀번호 한 번 더',class:'pw',style:'margin-top:8px'});
  var err=h('div',{class:'err'});
  function save(){
    Pw.get(w).then(function(c){
      if(cur.value!==c) return err.textContent='지금 비밀번호가 달라요';
      if(n1.value.length<4||n1.value.length>12) return err.textContent='새 비밀번호는 4~12자로 써 주세요';
      if(n1.value!==n2.value) return err.textContent='새 비밀번호 두 개가 달라요';
      if(!Notice.shared()) return err.textContent='공유 설정이 없어 바꿀 수 없어요';
      return Pw.set(w,c,n1.value).then(function(){ m.close(); toast(who+' 비밀번호를 바꿨어요 (알림·채팅에 모두 적용)'); },function(){ err.textContent='바꾸지 못했어요. 인터넷을 확인해 주세요'; });
    });
  }
  n2.addEventListener('keydown',function(e){ if(e.key==='Enter') save(); });
  var m=openModal([h('h2',{style:'margin:0 0 6px',text:who+' 비밀번호 바꾸기'}),h('p',{class:'muted',style:'margin:0 0 12px',text:'알림 쓰기와 채팅에 같은 비밀번호를 써요.'}),cur,n1,n2,err,
    h('div',{class:'row',style:'justify-content:flex-end;margin-top:14px'},[h('button',{onclick:function(){ m.close(); }},['취소']),h('button',{class:'primary',onclick:save},['바꾸기'])])]);
  setTimeout(function(){ cur.focus(); },30);
}

function noticeEditor(w,onSaved){
  var c=Notice.who[w];
  pwPrompt(w,{title:c.label,desc:'알림을 쓰려면 비밀번호를 입력하세요.',onok:function(){ writeStep(); }});
  function writeStep(){
    Notice.get(w).catch(function(){ return null; }).then(function(cur){
      var ta=h('textarea',{maxlength:'300',placeholder:'민겸이에게 하고 싶은 말을 남겨 주세요'}); ta.value=cur&&cur.text||'';
      var cnt=h('span',{class:'muted',style:'font-size:.85rem'}); function upd(){ cnt.textContent=ta.value.length+' / 300'; } ta.addEventListener('input',upd); upd();
      function save(text){
        Notice.set(w,text).then(function(v){
          try{ localStorage.setItem(seenKey(w),v.updatedAt); }catch(e){}
          onSaved(v); m2.close(); toast(text?'알림을 남겼어요':'알림을 지웠어요');
          if(!Notice.shared()) setTimeout(function(){ toast('지금은 이 기기에만 저장돼요 (공유 설정 전)'); },2300);
        }).catch(function(){ toast('저장하지 못했어요. 인터넷 연결을 확인해 주세요'); });
      }
      var m2=openModal([h('h2',{style:'margin:0 0 10px',text:c.label+' 쓰기'}),ta,h('div',{style:'text-align:right;margin-top:4px'},[cnt]),
        Notice.shared()?null:h('p',{class:'hint',text:'공유 설정 전이라 이 기기에서만 보여요.'}),
        h('div',{class:'row',style:'margin-top:12px'},[h('button',{onclick:function(){ if(confirm('알림을 지울까요?')) save(''); }},['지우기']),h('span',{class:'spacer'}),
          h('button',{onclick:function(){ m2.close(); }},['취소']),h('button',{class:'primary',onclick:function(){ save(ta.value.trim()); }},['저장'])])]);
      setTimeout(function(){ ta.focus(); },30);
    });
  }
}

/* ═════════ 우리 집 일정 (요일 루틴 · 달력 · 해야 할 일) ═════════
 * Firestore plan/routine, plan/events, plan/todos 문서에 목록을 JSON 문자열로 저장해 가족 모두가 함께 본다.
 * 보안 규칙이 아직 없거나(403) 공유 설정이 비어 있으면 이 기기(localStorage)에만 저장한다. */
var WHO={ dad:{label:'아빠',c:'#3b6fb6'}, mom:{label:'엄마',c:'#c2413b'}, kid:{label:'민겸',c:'#2f8a5b'}, school:{label:'화곡중',c:'#7a4fb0'}, all:{label:'가족',c:'#b5862e'} };
var WEEK=[1,2,3,4,5,6,0], DAYS=['일','월','화','수','목','금','토'];
var Plan={
  denied:false,
  shared:function(){ return Notice.shared()&&!this.denied; },
  url:function(d){ var f=CFG.firebase; return 'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(f.projectId)+'/databases/(default)/documents/plan/'+d+'?key='+encodeURIComponent(f.apiKey); },
  local:function(d){ try{ var v=JSON.parse(localStorage.getItem('mg-study:plan:'+d)); return Array.isArray(v)?v:[]; }catch(e){ return []; } },
  keep:function(d,v){ try{ localStorage.setItem('mg-study:plan:'+d,JSON.stringify(v)); }catch(e){} },
  // 서버에서 읽기 (네트워크 오류는 그대로 던짐, 403이면 기기 저장으로 전환)
  remote:function(d){ var self=this;
    return fetch(self.url(d),{cache:'no-store'}).then(function(r){
      if(r.status===404) return [];
      if(r.status===403){ self.denied=true; return self.local(d); }
      if(!r.ok) throw new Error('plan '+r.status);
      return r.json().then(function(j){ var s=j.fields&&j.fields.data&&j.fields.data.stringValue; var v=[]; try{ v=s?JSON.parse(s):[]; }catch(e){} return Array.isArray(v)?v:[]; });
    });
  },
  get:function(d){ var self=this;
    if(!self.shared()) return Promise.resolve(self.local(d));
    return self.remote(d).then(function(v){ if(self.shared()) self.keep(d,v); return v; })
      .catch(function(){ self.offline=true; return self.local(d); });
  },
  all:function(){ var self=this; return Promise.all(['routine','events','todos'].map(function(d){ return self.get(d); }))
    .then(function(v){ return {routine:v[0],events:v[1].concat(window.MG_SCHOOL||[]),todos:v[2]}; }); }, // 화곡중 학사일정(school.js)은 읽기 전용으로 합친다
  // 최신 목록을 다시 읽고 → fn으로 고친 뒤 → 저장 (가족이 동시에 고쳐도 덮어쓰지 않도록)
  update:function(d,fn){ var self=this;
    var base=self.shared()?self.remote(d):Promise.resolve(self.local(d));
    return base.then(function(v){
      fn(v);
      if(d==='events'){ var cut=new Date(); cut.setDate(cut.getDate()-400); var ck=dayKey(cut); v=v.filter(function(e){ return e.date>=ck; }); }
      if(!self.shared()){ self.keep(d,v); return v; }
      return fetch(self.url(d),{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fields:{data:{stringValue:JSON.stringify(v)},updatedAt:{stringValue:new Date().toISOString()}}})})
        .then(function(r){ if(r.status===403){ self.denied=true; self.keep(d,v); return v; } if(!r.ok) throw new Error('save'); self.keep(d,v); return v; });
    }).catch(function(e){ toast('저장하지 못했어요. 인터넷 연결을 확인해 주세요'); throw e; });
  }
};
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function lastWho(){ try{ return localStorage.getItem('mg-study:who')||'kid'; }catch(e){ return 'kid'; } }
function setLastWho(w){ try{ localStorage.setItem('mg-study:who',w); }catch(e){} }
function whoChip(w){ var c=WHO[w]||WHO.all; return h('span',{class:'who',style:'--wc:'+c.c,text:c.label}); }
function whoPicker(sel){
  var box=h('div',{class:'whopick',role:'radiogroup','aria-label':'누구'}); box.value=sel||lastWho();
  Object.keys(WHO).forEach(function(w){
    var b=h('button',{type:'button',class:'wp'+(box.value===w?' on':''),style:'--wc:'+WHO[w].c,role:'radio','aria-checked':String(box.value===w),onclick:function(){
      box.value=w; box.querySelectorAll('.wp').forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-checked','false'); }); b.classList.add('on'); b.setAttribute('aria-checked','true');
    }},[WHO[w].label]);
    box.appendChild(b);
  });
  return box;
}
function timeText(a,b){ return a?(b?a+'–'+b:a):''; }
function byTime(x,y){ return (x.start||x.time||'99')<(y.start||y.time||'99')?-1:(x.start||x.time||'99')>(y.start||y.time||'99')?1:0; }
function parseDay(k){ var p=k.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
function dLabel(k){ var t=parseDay(dayKey(new Date())), d=parseDay(k), n=Math.round((d-t)/86400000);
  return n===0?{t:'오늘',c:'today'}:n<0?{t:(-n)+'일 지남',c:'over'}:{t:'D-'+n,c:n<=3?'soon':''}; }
function dateText(k){ var d=parseDay(k); return (d.getMonth()+1)+'월 '+d.getDate()+'일 ('+DAYS[d.getDay()]+')'; }
function hol(k){ var H=window.MG_HOLIDAYS||{}; return H[k]||''; }
function sortTodos(list){ return list.slice().sort(function(a,b){ var x=a.due||'9999', y=b.due||'9999'; return x<y?-1:x>y?1:(a.createdAt<b.createdAt?-1:1); }); }
function shareNote(){
  if(Plan.shared()&&!Plan.offline) return h('p',{class:'share ok'},['아빠·엄마·민겸이 모두 같은 일정을 봐요']);
  return h('p',{class:'share warn',text:Plan.offline?'인터넷 연결이 불안정해서 이 기기에 저장된 내용을 보여 주고 있어요.':'아직 공유 설정 전이라 이 기기에만 저장돼요.'});
}
function undoToast(msg,onUndo){
  document.querySelectorAll('.toast.undo').forEach(function(t){ t.remove(); });
  var t=h('div',{class:'toast undo'},[h('span',{text:msg}),h('button',{onclick:function(){ t.remove(); onUndo(); }},['되돌리기'])]);
  document.body.appendChild(t); setTimeout(function(){ t.remove(); },5000);
}

/* 할 일 완료: 목록에서 빠지고, 5초 안에 되돌릴 수 있다 */
function completeTodo(item,after){
  Plan.update('todos',function(v){ for(var i=v.length-1;i>=0;i--) if(v[i].id===item.id) v.splice(i,1); }).then(function(){
    after&&after();
    undoToast('“'+item.text+'” 완료했어요',function(){ Plan.update('todos',function(v){ if(!v.some(function(x){ return x.id===item.id; })) v.push(item); }).then(function(){ after&&after(); }); });
  }).catch(function(){});
}
function todoRow(t,after,opts){
  var dl=t.due?dLabel(t.due):null;
  var row=h('div',{class:'todo'},[
    h('button',{class:'tcheck','aria-label':'완료: '+t.text,onclick:function(){ row.classList.add('done'); setTimeout(function(){ completeTodo(t,after); },260); }}),
    h('button',{class:'tbody',onclick:function(){ todoEditor(t,after); }},[
      h('span',{class:'tt',text:t.text}),
      h('span',{class:'tm'},[whoChip(t.who),t.due?h('span',{text:dateText(t.due)}):null,dl?h('span',{class:'dday '+dl.c,text:dl.t}):null])
    ])
  ]);
  return row;
}
function todoEditor(t,after){
  var isNew=!t, item=t?clone(t):{id:uid(),text:'',due:'',who:lastWho(),createdAt:new Date().toISOString()};
  var txt=h('input',{type:'text',maxlength:'80',placeholder:'꼭 해야 할 일 (예: 수학 학원 숙제)'}); txt.value=item.text;
  var due=h('input',{type:'date'}); due.value=item.due||'';
  var who=whoPicker(item.who);
  function save(){
    var v=txt.value.trim(); if(!v){ txt.focus(); return; }
    item.text=v; item.due=due.value||''; item.who=who.value; setLastWho(who.value);
    Plan.update('todos',function(list){ var i=list.findIndex(function(x){ return x.id===item.id; }); if(i>=0) list[i]=item; else list.push(item); }).then(function(){ m.close(); toast(isNew?'할 일을 적었어요':'고쳤어요'); after&&after(); }).catch(function(){});
  }
  txt.addEventListener('keydown',function(e){ if(e.key==='Enter') save(); });
  var m=openModal([h('h2',{style:'margin:0 0 12px',text:isNew?'해야 할 일 적기':'할 일 고치기'}),
    h('label',{class:'fl'},['무엇을',txt]),h('label',{class:'fl'},['언제까지 (선택)',due]),h('div',{class:'fl'},['누가',who]),
    h('div',{class:'row',style:'margin-top:16px'},[!isNew?h('button',{onclick:function(){ if(!confirm('이 할 일을 지울까요?')) return;
      Plan.update('todos',function(list){ for(var i=list.length-1;i>=0;i--) if(list[i].id===item.id) list.splice(i,1); }).then(function(){ m.close(); after&&after(); }).catch(function(){}); }},['지우기']):null,
      h('span',{class:'spacer'}),h('button',{onclick:function(){ m.close(); }},['취소']),h('button',{class:'primary',onclick:save},[isNew?'적기':'저장'])])]);
  setTimeout(function(){ txt.focus(); },30);
}
function routineEditor(r,day,after){
  var isNew=!r, item=r?clone(r):{id:uid(),text:'',start:'',end:'',days:[day==null?new Date().getDay():day],who:lastWho()};
  var txt=h('input',{type:'text',maxlength:'60',placeholder:'예: 영어 학원, 줄넘기 10분'}); txt.value=item.text;
  var st=h('input',{type:'time'}); st.value=item.start||''; var en=h('input',{type:'time'}); en.value=item.end||'';
  var picked={}; item.days.forEach(function(d){ picked[d]=true; });
  var dayBox=h('div',{class:'daypick'},WEEK.map(function(d){
    var b=h('button',{type:'button',class:'dp'+(picked[d]?' on':'')+(d===0?' sun':d===6?' sat':''),onclick:function(){ picked[d]=!picked[d]; b.classList.toggle('on',!!picked[d]); }},[DAYS[d]]); return b; }));
  var who=whoPicker(item.who);
  function save(){
    var v=txt.value.trim(), days=WEEK.filter(function(d){ return picked[d]; });
    if(!v){ txt.focus(); return; } if(!days.length){ toast('요일을 하나 이상 골라 주세요'); return; }
    item.text=v; item.start=st.value||''; item.end=en.value||''; item.days=days; item.who=who.value; setLastWho(who.value);
    Plan.update('routine',function(list){ var i=list.findIndex(function(x){ return x.id===item.id; }); if(i>=0) list[i]=item; else list.push(item); }).then(function(){ m.close(); toast(isNew?'루틴을 추가했어요':'고쳤어요'); after&&after(); }).catch(function(){});
  }
  var m=openModal([h('h2',{style:'margin:0 0 12px',text:isNew?'루틴 추가':'루틴 고치기'}),
    h('label',{class:'fl'},['무엇을',txt]),
    h('div',{class:'fl'},['시간 (선택)',h('div',{class:'trange'},[st,h('span',{text:'~'}),en])]),
    h('div',{class:'fl'},['반복할 요일',dayBox]),h('div',{class:'fl'},['누구',who]),
    h('div',{class:'row',style:'margin-top:16px'},[!isNew?h('button',{onclick:function(){ if(!confirm('이 루틴을 지울까요? (모든 요일에서 지워져요)')) return;
      Plan.update('routine',function(list){ for(var i=list.length-1;i>=0;i--) if(list[i].id===item.id) list.splice(i,1); }).then(function(){ m.close(); after&&after(); }).catch(function(){}); }},['지우기']):null,
      h('span',{class:'spacer'}),h('button',{onclick:function(){ m.close(); }},['취소']),h('button',{class:'primary',onclick:save},[isNew?'추가':'저장'])])]);
  setTimeout(function(){ txt.focus(); },30);
}
function eventEditor(ev,date,after){
  var isNew=!ev, item=ev?clone(ev):{id:uid(),date:date,time:'',text:'',who:lastWho()};
  var txt=h('input',{type:'text',maxlength:'60',placeholder:'예: 수학 수행평가, 할머니 생신'}); txt.value=item.text;
  var dt=h('input',{type:'date'}); dt.value=item.date; var tm=h('input',{type:'time'}); tm.value=item.time||'';
  var who=whoPicker(item.who);
  function save(){
    var v=txt.value.trim(); if(!v){ txt.focus(); return; } if(!dt.value){ dt.focus(); return; }
    item.text=v; item.date=dt.value; item.time=tm.value||''; item.who=who.value; setLastWho(who.value);
    Plan.update('events',function(list){ var i=list.findIndex(function(x){ return x.id===item.id; }); if(i>=0) list[i]=item; else list.push(item); }).then(function(){ m.close(); toast(isNew?'일정을 적었어요':'고쳤어요'); after&&after(); }).catch(function(){});
  }
  txt.addEventListener('keydown',function(e){ if(e.key==='Enter') save(); });
  var m=openModal([h('h2',{style:'margin:0 0 12px',text:isNew?'일정 적기':'일정 고치기'}),
    h('label',{class:'fl'},['무엇을',txt]),
    h('div',{class:'fl'},['날짜 · 시간(선택)',h('div',{class:'trange'},[dt,tm])]),h('div',{class:'fl'},['누구',who]),
    h('div',{class:'row',style:'margin-top:16px'},[!isNew?h('button',{onclick:function(){ if(!confirm('이 일정을 지울까요?')) return;
      Plan.update('events',function(list){ for(var i=list.length-1;i>=0;i--) if(list[i].id===item.id) list.splice(i,1); }).then(function(){ m.close(); after&&after(); }).catch(function(){}); }},['지우기']):null,
      h('span',{class:'spacer'}),h('button',{onclick:function(){ m.close(); }},['취소']),h('button',{class:'primary',onclick:save},[isNew?'적기':'저장'])])]);
  setTimeout(function(){ txt.focus(); },30);
}
function routineItem(r,day,after){
  return h('button',{class:'ritem',style:'--wc:'+(WHO[r.who]||WHO.all).c,onclick:function(){ routineEditor(r,day,after); }},[
    r.start?h('span',{class:'rt',text:timeText(r.start,r.end)}):null,h('span',{class:'rx',text:r.text}),h('span',{class:'rw',text:(WHO[r.who]||WHO.all).label})]);
}
function eventItem(e,after){
  return h('button',{class:'eitem',style:'--wc:'+(WHO[e.who]||WHO.all).c,onclick:function(){ if(e.fixed){ toast('화곡중 학사일정은 고칠 수 없어요'); return; } eventEditor(e,e.date,after); }},[
    h('span',{class:'et',text:e.time||'하루'}),h('span',{class:'ex',text:e.text}),whoChip(e.who)]);
}

/* 홈: 오늘의 우리 집 */
/* 홈: 어제 ~ 다음 주 같은 요일 미니 달력 (날짜를 누르면 그날 일정이 아래에 보인다) */
function miniCal(P,selKey,onSel){
  var now=new Date(), tk=dayKey(now);
  var start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1), days=[];
  for(var i=0;i<9;i++){ var d=new Date(start); d.setDate(start.getDate()+i); days.push(d); }
  var ev={}; P.events.forEach(function(e){ (ev[e.date]=ev[e.date]||[]).push(e); });
  return h('div',{class:'mcal'},[h('div',{class:'mgrid'},days.map(function(d){
    var k=dayKey(d), es=ev[k]||[];
    return h('button',{type:'button',class:'mday'+(k===tk?' today':'')+(k===selKey?' sel':'')+(d.getDay()===0?' sun':d.getDay()===6?' sat':'')+(hol(k)?' hol':'')+(k<tk?' past':''),
      'aria-label':dateText(k)+(hol(k)?' '+hol(k):'')+(es.length?' 일정 '+es.length+'개':' 일정 없음'),'aria-pressed':String(k===selKey),onclick:function(){ onSel(k); }},[
      h('span',{class:'mw',text:DAYS[d.getDay()]}),
      h('span',{class:'mn',text:String(d.getDate())}),
      h('span',{class:'mdots'},es.slice(0,3).map(function(e){ return h('i',{style:'background:'+(WHO[e.who]||WHO.all).c}); }))
    ]);
  }))]);
}
function rangeText(){
  var n=new Date(), a=new Date(n.getFullYear(),n.getMonth(),n.getDate()-1), z=new Date(n.getFullYear(),n.getMonth(),n.getDate()+7);
  return (a.getMonth()+1)+'/'+a.getDate()+' – '+(z.getMonth()+1)+'/'+z.getDate();
}

/* 홈: 오늘의 우리 집 */
function todayPlan(){
  var body=h('div',{class:'tp-grid'},[h('p',{class:'muted',text:'일정을 불러오는 중…'})]);
  var box=h('section',{class:'today card'},[body]);
  var lastP=null, selKey=dayKey(new Date());
  function paint(){
    var P=lastP; if(!P||!document.body.contains(box)) return;
    var now=new Date(), dow=now.getDay(), tk=dayKey(now);
    var rs=P.routine.filter(function(r){ return (r.days||[]).indexOf(dow)>=0; }).sort(byTime);
    var ts=sortTodos(P.todos);
    var es=P.events.filter(function(e){ return e.date===selKey; }).sort(byTime), dl=dLabel(selKey);
    body.innerHTML='';
    body.appendChild(h('div',{class:'tp col-r'},[h('div',{class:'tp-h'},[h('b',{text:DAYS[dow]+'요일 루틴'}),h('a',{href:'#/plan/routine',text:'전체'})]),
      rs.length?h('div',{class:'tp-list'},rs.map(function(r){ return routineItem(r,dow,draw); })):h('p',{class:'tp-empty',text:'오늘은 정해진 루틴이 없어요.'})]));
    body.appendChild(h('div',{class:'tp col-e'},[h('div',{class:'tp-h'},[h('b',{text:'일정'}),h('span',{class:'rng',text:rangeText()}),h('a',{href:'#/plan/cal',text:'달력'})]),
      miniCal(P,selKey,function(k){ selKey=k; paint(); }),
      h('div',{class:'mdetail'},[
        h('div',{class:'mdh'},[h('b',{text:dateText(selKey)}),h('span',{class:'dday '+dl.c,text:dl.t}),hol(selKey)?h('span',{class:'hchip',text:hol(selKey)}):null,h('button',{class:'madd',onclick:function(){ eventEditor(null,selKey,draw); }},['＋ 일정'])]),
        es.length?h('div',{class:'tp-list'},es.map(function(e){ return eventItem(e,draw); })):h('p',{class:'tp-empty',text:selKey===tk?'오늘은 특별한 일정이 없어요.':'이날은 일정이 없어요.'})
      ])]));
    body.appendChild(h('div',{class:'tp col-t'},[h('div',{class:'tp-h'},[h('b',{text:'해야 할 일 '+(ts.length?ts.length+'개':'')}),h('button',{class:'mini-add',onclick:function(){ todoEditor(null,draw); }},['＋ 적기'])]),
      ts.length?h('div',{class:'tp-list'},ts.slice(0,5).map(function(t){ return todoRow(t,draw); })):h('p',{class:'tp-empty',text:'모두 끝냈어요.'}),
      ts.length>5?h('a',{class:'tp-more',href:'#/plan/todo',text:'나머지 '+(ts.length-5)+'개 더 보기 →'}):null]));
  }
  function draw(){ Plan.all().then(function(P){ lastP=P; paint(); }); }
  draw();
  return box;
}

/* 일정 페이지 */
var PlanUI={ tab:null, day:null, month:null };
function renderPlan(tab){
  if(['todo','routine','cal'].indexOf(tab)<0){ try{ tab=localStorage.getItem('mg-study:plantab'); }catch(e){} if(['todo','routine','cal'].indexOf(tab)<0) tab='todo'; }
  try{ localStorage.setItem('mg-study:plantab',tab); }catch(e){}
  var app=$app(), page=h('div',{class:'page'}); app.appendChild(page); app.appendChild(themeBtn());
  page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:'#/'},['← 홈']),h('div',{},[h('div',{class:'crumb',text:'민겸이 공부 공간'}),h('h1',{text:'우리 집 일정'})]),h('button',{class:'share-btn',onclick:sharePlan},['공유'])]));
  var share=h('div'), tabs=h('div',{class:'ptabs',role:'tablist'}), body=h('div',{class:'pbody'},[h('p',{class:'muted',text:'불러오는 중…'})]);
  page.appendChild(share); page.appendChild(tabs); page.appendChild(body);
  var T=[['todo','','해야 할 일'],['routine','','요일 루틴'],['cal','','달력']];
  function draw(){
    Plan.all().then(function(P){
      if(!document.body.contains(body)) return;
      share.innerHTML=''; share.appendChild(shareNote());
      tabs.innerHTML='';
      T.forEach(function(t){ tabs.appendChild(h('a',{class:'ptab'+(tab===t[0]?' on':''),role:'tab','aria-selected':String(tab===t[0]),href:'#/plan/'+t[0]},[
        h('span',{text:t[2]}),t[0]==='todo'&&P.todos.length?h('span',{class:'pc',text:String(P.todos.length)}):null])); });
      body.innerHTML='';
      body.appendChild(tab==='todo'?todoView(P,draw):tab==='routine'?routineView(P,draw):calendarView(P,draw));
    });
  }
  draw();
}
function todoView(P,redraw){
  var list=sortTodos(P.todos);
  var txt=h('input',{type:'text',maxlength:'80',placeholder:'꼭 해야 할 일을 적고 Enter'}), due=h('input',{type:'date','aria-label':'언제까지'}), who=whoPicker();
  function add(){
    var v=txt.value.trim(); if(!v){ txt.focus(); return; }
    var item={id:uid(),text:v,due:due.value||'',who:who.value,createdAt:new Date().toISOString()}; setLastWho(who.value);
    Plan.update('todos',function(l){ l.push(item); }).then(function(){ toast('할 일을 적었어요'); redraw(); }).catch(function(){});
  }
  txt.addEventListener('keydown',function(e){ if(e.key==='Enter') add(); });
  var groups=[['over','기한 지남'],['today','오늘까지'],['week','이번 주 안에'],['later','나중에'],['none','기한 없음']];
  var tk=dayKey(new Date()), wk=new Date(); wk.setDate(wk.getDate()+7); var wkk=dayKey(wk);
  function grp(t){ return !t.due?'none':t.due<tk?'over':t.due===tk?'today':t.due<=wkk?'week':'later'; }
  return h('div',{class:'todo-wrap'},[
    h('div',{class:'card add-todo'},[h('div',{class:'add-row'},[txt,due,h('button',{class:'primary',onclick:add},['＋ 적기'])]),h('div',{class:'add-who'},[h('span',{class:'kl',text:'누가 할 일?'}),who])]),
    list.length?h('div',{class:'todo-groups'},groups.map(function(g){
      var items=list.filter(function(t){ return grp(t)===g[0]; }); if(!items.length) return null;
      return h('section',{class:'card tgroup '+g[0]},[h('h3',{},[g[1],h('span',{class:'gc',text:String(items.length)})]),h('div',{class:'tlist'},items.map(function(t){ return todoRow(t,redraw); }))]);
    })):h('div',{class:'card empty-state'},[h('p',{class:'empty-t',text:'해야 할 일을 모두 끝냈어요'}),h('p',{class:'muted',text:'완료(○)를 누르면 목록에서 사라져요.'})])
  ]);
}
function routineView(P,redraw){
  if(PlanUI.day==null) PlanUI.day=new Date().getDay();
  var today=new Date().getDay();
  var chips=h('div',{class:'daychips'}), grid=h('div',{class:'week'});
  function sel(d){ PlanUI.day=d;
    chips.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on',+b.dataset.d===d); });
    grid.querySelectorAll('.wcol').forEach(function(c){ c.classList.toggle('sel',+c.dataset.d===d); }); }
  WEEK.forEach(function(d){
    var n=P.routine.filter(function(r){ return (r.days||[]).indexOf(d)>=0; }).length;
    chips.appendChild(h('button',{'data-d':String(d),class:(d===0?'sun':d===6?'sat':'')+(d===today?' today':''),onclick:function(){ sel(d); }},[h('b',{text:DAYS[d]}),h('small',{text:n?n+'개':'–'})]));
    var items=P.routine.filter(function(r){ return (r.days||[]).indexOf(d)>=0; }).sort(byTime);
    grid.appendChild(h('div',{class:'wcol'+(d===today?' today':''),'data-d':String(d)},[
      h('div',{class:'wh '+(d===0?'sun':d===6?'sat':'')},[DAYS[d]+'요일',d===today?h('span',{class:'tdy',text:'오늘'}):null]),
      h('div',{class:'wl'},items.length?items.map(function(r){ return routineItem(r,d,redraw); }):[h('p',{class:'tp-empty',text:'루틴 없음'})]),
      h('button',{class:'wadd',onclick:function(){ routineEditor(null,d,redraw); }},['＋ '+DAYS[d]+'요일에 추가'])
    ]));
  });
  sel(PlanUI.day);
  return h('div',{},[h('p',{class:'muted hint-line',text:'매주 반복하는 일정이에요. 눌러서 고치거나, 여러 요일에 한 번에 넣을 수 있어요.'}),chips,grid]);
}
function calendarView(P,redraw){
  var now=new Date(); if(!PlanUI.month) PlanUI.month=new Date(now.getFullYear(),now.getMonth(),1);
  var M=PlanUI.month, y=M.getFullYear(), mo=M.getMonth(), tk=dayKey(now);
  var ev={}; P.events.forEach(function(e){ (ev[e.date]=ev[e.date]||[]).push(e); });
  var td={}; P.todos.forEach(function(t){ if(t.due) (td[t.due]=td[t.due]||[]).push(t); });
  var start=new Date(y,mo,1-new Date(y,mo,1).getDay());
  var cells=[];
  for(var i=0;i<42;i++){
    var d=new Date(start); d.setDate(start.getDate()+i);
    if(i>=35&&d.getMonth()!==mo) break;
    (function(d){
      var k=dayKey(d), es=(ev[k]||[]).sort(byTime), ts=td[k]||[], all=es.length+ts.length;
      cells.push(h('button',{class:'cday'+(d.getMonth()!==mo?' out':'')+(k===tk?' today':'')+(d.getDay()===0?' sun':d.getDay()===6?' sat':'')+(hol(k)?' hol':''),
        'aria-label':dateText(k)+(hol(k)?' '+hol(k):'')+(all?' 일정 '+all+'개':''),onclick:function(){ dayModal(k,P,redraw); }},[
        h('span',{class:'cn',text:String(d.getDate())}),hol(k)?h('span',{class:'chn',title:hol(k),text:hol(k).replace(/^대체공휴일 \((.+)\)$/,'$1 대체')}):null,
        h('span',{class:'cev'},es.slice(0,3).map(function(e){ return h('span',{class:'ce',style:'--wc:'+(WHO[e.who]||WHO.all).c,text:e.text}); })
          .concat(ts.slice(0,Math.max(0,3-es.length)).map(function(t){ return h('span',{class:'ce todo',text:'✓ '+t.text}); }))
          .concat(all>3?[h('span',{class:'cmore',text:'+'+(all-3)})]:[])),
        h('span',{class:'cdots'},es.slice(0,4).map(function(e){ return h('i',{style:'background:'+(WHO[e.who]||WHO.all).c}); }).concat(ts.length?[h('i',{class:'td'})]:[]))
      ]));
    })(d);
  }
  var upcoming=P.events.filter(function(e){ return e.date>=tk; }).sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:byTime(a,b); }).slice(0,8);
  function move(n){ PlanUI.month=new Date(y,mo+n,1); redraw(); }
  return h('div',{class:'cal-wrap'},[
    h('div',{class:'card cal'},[
      h('div',{class:'cal-head'},[h('button',{class:'nav','aria-label':'이전 달',onclick:function(){ move(-1); }},['‹']),h('h2',{text:y+'년 '+(mo+1)+'월'}),
        h('button',{class:'nav','aria-label':'다음 달',onclick:function(){ move(1); }},['›']),h('span',{class:'spacer'}),
        (y!==now.getFullYear()||mo!==now.getMonth())?h('button',{class:'tbtn',onclick:function(){ PlanUI.month=null; redraw(); }},['오늘']):null,
        h('button',{class:'primary tbtn',onclick:function(){ eventEditor(null,tk,redraw); }},['＋ 일정'])]),
      h('div',{class:'cal-dow'},DAYS.map(function(t,i){ return h('span',{class:i===0?'sun':i===6?'sat':'',text:t}); })),
      h('div',{class:'cal-grid'},cells),
      h('div',{class:'cal-legend'},Object.keys(WHO).map(function(w){ return h('span',{},[h('i',{style:'background:'+WHO[w].c}),WHO[w].label]); }).concat([h('span',{},[h('i',{class:'td'}),'할 일 기한']),h('span',{},[h('i',{class:'hl'}),'공휴일'])]))
    ]),
    h('div',{class:'card upcoming'},[h('h3',{text:'다가오는 일정'}),upcoming.length?h('div',{class:'up-list'},upcoming.map(function(e){ var dl=dLabel(e.date);
      return h('button',{class:'up',onclick:function(){ eventEditor(e,e.date,redraw); }},[h('span',{class:'dday '+dl.c,text:dl.t}),h('span',{class:'ud',text:dateText(e.date)+(e.time?' '+e.time:'')}),h('span',{class:'ux',text:e.text}),whoChip(e.who)]); }))
      :h('p',{class:'muted',text:'다가오는 일정이 없어요. 달력에서 날짜를 눌러 적어 보세요.'})])
  ]);
}
function dayModal(k,P,redraw){
  var d=parseDay(k), es=P.events.filter(function(e){ return e.date===k; }).sort(byTime), ts=P.todos.filter(function(t){ return t.due===k; });
  var rs=P.routine.filter(function(r){ return (r.days||[]).indexOf(d.getDay())>=0; }).sort(byTime);
  function again(){ m.close(); redraw(); }
  var m=openModal([
    h('div',{class:'crumb',text:d.getFullYear()+'년'}),h('h2',{style:'margin:0 0 12px',text:dateText(k)}),hol(k)?h('div',{style:'margin:-6px 0 10px'},[h('span',{class:'hchip',text:hol(k)})]):null,
    h('div',{class:'dm-sec'},[h('b',{text:'일정'}),es.length?h('div',{class:'tp-list'},es.map(function(e){ return eventItem(e,again); })):h('p',{class:'tp-empty',text:'아직 일정이 없어요.'})]),
    ts.length?h('div',{class:'dm-sec'},[h('b',{text:'이날까지 할 일'}),h('div',{class:'tp-list'},ts.map(function(t){ return todoRow(t,again); }))]):null,
    rs.length?h('div',{class:'dm-sec'},[h('b',{text:DAYS[d.getDay()]+'요일 루틴'}),h('p',{class:'muted',style:'margin:4px 0 0;font-size:.9rem',text:rs.map(function(r){ return (r.start?r.start+' ':'')+r.text; }).join(' · ')})]):null,
    h('div',{class:'row',style:'margin-top:16px;justify-content:flex-end'},[h('button',{onclick:function(){ m.close(); }},['닫기']),h('button',{class:'primary',onclick:function(){ m.close(); eventEditor(null,k,redraw); }},['＋ 이날 일정 적기'])])
  ]);
}

/* ═════════ 공유 (카톡·메일 등으로 이미지 카드 보내기) ═════════
 * 이미지는 app/share.js 가 이 기기 안에서 그린다. 안드로이드 크롬 등은 기본 공유 창(Web Share)이 뜨고,
 * 지원하지 않는 브라우저(PC 등)는 이미지 저장·글로 복사로 대신한다. */
function openShare(title,make){
  var body=h('div',{class:'sh-preview'},[h('p',{class:'muted',style:'padding:16px;margin:0',text:'카드를 만드는 중…'})]);
  var actions=h('div',{class:'row sh-actions'});
  var m=openModal([h('h2',{style:'margin:0 0 4px',text:title}),
    h('p',{class:'muted',style:'margin:0 0 12px;font-size:.92rem',text:'이미지로 만들었어요. 공유를 누르면 카톡·메일 같은 앱을 고를 수 있어요.'}),body,actions]);
  make().then(function(r){
    var url=URL.createObjectURL(r.blob), file=null;
    try{ file=new File([r.blob],r.name,{type:'image/png'}); }catch(e){}
    var canFile=!!(file&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})), canText=!!navigator.share;
    body.innerHTML=''; body.appendChild(h('img',{src:url,alt:title+' 미리보기'}));
    function save(){ var a=h('a',{href:url,download:r.name}); document.body.appendChild(a); a.click(); a.remove(); toast('이미지를 저장했어요'); }
    function share(){
      var data=canFile?{files:[file],title:title,text:r.text}:{title:title,text:r.text};
      navigator.share(data).catch(function(e){ if(e&&e.name==='AbortError') return; toast('공유 창을 열지 못했어요. 이미지 저장을 눌러 주세요'); });
    }
    function copy(){
      function fallback(){ var ta=h('textarea',{style:'position:fixed;opacity:0'}); ta.value=r.text; document.body.appendChild(ta); ta.select(); var ok=false; try{ ok=document.execCommand('copy'); }catch(e){} ta.remove(); toast(ok?'글로 복사했어요':'복사하지 못했어요'); }
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(r.text).then(function(){ toast('글로 복사했어요'); },fallback); else fallback();
    }
    actions.appendChild(canText?h('button',{class:'primary',onclick:share},[canFile?'공유하기':'글로 공유하기']):h('button',{class:'primary',onclick:save},['이미지 저장']));
    if(canText) actions.appendChild(h('button',{onclick:save},['이미지 저장']));
    actions.appendChild(h('button',{onclick:copy},['글로 복사']));
    actions.appendChild(h('span',{class:'spacer'})); actions.appendChild(h('button',{onclick:function(){ m.close(); URL.revokeObjectURL(url); }},['닫기']));
  }).catch(function(){ body.innerHTML=''; body.appendChild(h('p',{class:'muted',style:'padding:16px;margin:0',text:'카드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'})); });
}
function ymdLabel(d){ return d.getFullYear()+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.'+('0'+d.getDate()).slice(-2); }
function sharePlan(){
  Plan.all().then(function(P){
    var now=new Date(), M=PlanUI.month||new Date(now.getFullYear(),now.getMonth(),1);
    openShare(M.getFullYear()+'년 '+(M.getMonth()+1)+'월 일정',function(){
      return MGShare.schedule({year:M.getFullYear(),month:M.getMonth()+1,todayKey:dayKey(now),todayLabel:ymdLabel(now),events:P.events,todos:P.todos,holidays:window.MG_HOLIDAYS||{},who:WHO});
    });
  });
}
function dashShareData(S2,scope){
  var now=new Date(), conc=S2.byConcept.filter(function(c){ return c.n>=2; }), pick=function(c){ return {l:c.key,acc:c.acc,n:c.n,ok:c.ok}; };
  // 다시 볼 개념은 정답률 80% 미만만, 잘하는 개념은 거기에 든 개념을 뺀 나머지에서 고른다(같은 개념이 두 곳에 나오지 않게)
  var weakList=conc.filter(function(c){ return c.acc<0.8; }).sort(function(a,b){ return a.acc-b.acc||b.n-a.n; }).slice(0,3), weakKeys=weakList.map(function(c){ return c.key; });
  return {scope:scope,today:now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일',todayKey:dayKey(now),todayLabel:ymdLabel(now),
    kpis:[{l:'푼 시험',v:S2.tests+'회',s:'연습 '+S2.pracN+' · 실전 '+S2.examN},{l:'평균 점수',v:Math.round(S2.avg)+'점',s:'100점 환산'},
      {l:'최고 점수',v:Math.round(S2.best)+'점',s:'최근 '+Math.round(S2.last)+'점'},{l:'연속 공부',v:S2.streak+'일',s:'최근 7일 중 '+S2.week+'일'},
      {l:'푼 문항',v:S2.solved+'개',s:'정답률 '+pct(S2.acc)},{l:'공부 시간',v:fmtDur(S2.dur),s:'시험당 평균 '+fmtDur(S2.dur/S2.tests)}],
    trend:S2.H.slice(-12).map(function(e){ return {y:e.max?Math.round(e.got/e.max*100):0,label:fmtDate(e.at)}; }),
    weak:weakList.map(pick),
    strong:conc.filter(function(c){ return weakKeys.indexOf(c.key)<0; }).sort(function(a,b){ return b.acc-a.acc||b.n-a.n; }).slice(0,3).map(pick)};
}
function shareStats(){
  var mm=location.hash.match(/^#\/stats\/(.+)$/), bookId=mm?decodeURIComponent(mm[1]):'';
  var S2=computeStats(statScope(bookId)||undefined);
  if(!S2.tests){ toast('공유할 시험 기록이 아직 없어요'); return; }
  Data.catalogP().catch(function(){ return {books:[]}; }).then(function(cat){
    var scope=statScope(bookId)||'전체';
    openShare('공부 기록'+(scope==='전체'?'':' · '+scope),function(){ return MGShare.dashboard(dashShareData(S2,scope)); });
  });
}

/* ═════════ 통계 ═════════ */
function dayKey(t){ var d=new Date(t); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function pct(x){ return x==null?'–':Math.round(x*100)+'%'; }
function fmtDur(sec){ if(!sec) return '0분'; var m=Math.round(sec/60); if(m<60) return m+'분'; return Math.floor(m/60)+'시간 '+(m%60?m%60+'분':''); }
var TYPE_NAME={mc:'선택형',short:'단답형',ox:'OX',essay:'서술형'};
function allHistory(){
  var d=Store.load().books, out=[];
  for(var id in d) (d[id].history||[]).forEach(function(e){ var c=clone(e); c.bookId=e.bookId||id; out.push(c); });
  return out.sort(function(a,b){ return a.at<b.at?-1:1; });
}
function group(items,keyFn){
  var g={}; items.forEach(function(it){ var k=keyFn(it); if(k==null||k==='') return; (g[k]=g[k]||{key:k,n:0,ok:0}); g[k].n++; g[k].ok+=it.ok; });
  return Object.keys(g).map(function(k){ var v=g[k]; v.acc=v.ok/v.n; return v; });
}
var SUBJ_BY_SUFFIX={korean:'국어',english:'영어',math:'수학',science:'과학',social:'사회',history:'역사',ethics:'도덕','tech-home':'기술·가정',info:'정보',hanmun:'한문'};
function subjectOfBook(id){ var m=/^g\d+s\d+-(.+)$/.exec(id||''); return (m&&SUBJ_BY_SUFFIX[m[1]])||id; }
/* 통계 범위: 과목 이름('수학') 또는 책 id. 비우면 전체 */
function statScope(param){ if(!param) return ''; return SUBJECTS[param]?param:subjectOfBook(param); }
function computeStats(scope){
  var bookId=scope;
  var inScope=function(id){ return !scope||subjectOfBook(id)===scope||id===scope; };
  var H=allHistory().filter(function(e){ return inScope(e.bookId); });
  var S2={H:H,tests:H.length,solved:0,avg:null,best:null,last:null,dur:0,items:[],days:{},acc:null,streak:0,week:0};
  var sum=0, prac=[], exam=[];
  H.forEach(function(e){
    var s=e.max?e.got/e.max*100:0; sum+=s; if(S2.best==null||s>S2.best) S2.best=s; S2.last=s;
    S2.solved+=e.n||0; S2.dur+=e.dur||0;
    (e.mode==='exam'?exam:prac).push(s);
    (e.items||[]).forEach(function(it){ var c=clone(it); c.bookId=e.bookId; S2.items.push(c); });
    var k=dayKey(e.at); S2.days[k]=(S2.days[k]||0)+(e.n||0);
  });
  if(H.length) S2.avg=sum/H.length;
  if(S2.items.length) S2.acc=S2.items.filter(function(i){ return i.ok; }).length/S2.items.length;
  var t=new Date(); if(!S2.days[dayKey(t)]) t.setDate(t.getDate()-1);
  while(S2.days[dayKey(t)]){ S2.streak++; t.setDate(t.getDate()-1); }
  for(var i=0;i<7;i++){ var d=new Date(); d.setDate(d.getDate()-i); if(S2.days[dayKey(d)]) S2.week++; }
  var mean=function(a){ return a.length?a.reduce(function(x,y){ return x+y; },0)/a.length:null; };
  S2.pracAvg=mean(prac); S2.examAvg=mean(exam); S2.pracN=prac.length; S2.examN=exam.length;
  S2.byConcept=group(S2.items,function(i){ return i.c; });
  S2.byDiff=group(S2.items,function(i){ return i.d; });
  S2.byType=group(S2.items,function(i){ return TYPE_NAME[i.t]||i.t; });
  S2.byUnit=group(S2.items,function(i){ return i.u?i.bookId+'|'+i.u:null; });
  S2.byBook={}; S2.bySubject={};
  H.forEach(function(e){ var b=S2.byBook[e.bookId]=S2.byBook[e.bookId]||{tests:0,sum:0,best:0,last:0}; var s=e.max?e.got/e.max*100:0; b.tests++; b.sum+=s; b.best=Math.max(b.best,s); b.last=s; });
  group(S2.items,function(i){ return i.bookId; }).forEach(function(g){ if(S2.byBook[g.key]) S2.byBook[g.key].acc=g.acc; });
  H.forEach(function(e){ var k=subjectOfBook(e.bookId), b=S2.bySubject[k]=S2.bySubject[k]||{tests:0,sum:0,best:0,last:0}; var sc=e.max?e.got/e.max*100:0; b.tests++; b.sum+=sc; b.best=Math.max(b.best,sc); b.last=sc; });
  group(S2.items,function(i){ return subjectOfBook(i.bookId); }).forEach(function(g){ if(S2.bySubject[g.key]) S2.bySubject[g.key].acc=g.acc; });
  var books=Store.load().books, learning=0, mastered=0, wrong=[];
  for(var id in books){ if(!inScope(id)) continue; for(var q in books[id].notes){ var n=books[id].notes[q]; if(n.mastered) mastered++; else { learning++; wrong.push(n); } } }
  S2.learning=learning; S2.mastered=mastered;
  S2.topWrong=wrong.sort(function(a,b){ return b.wrongCount-a.wrongCount||(a.lastWrongAt<b.lastWrongAt?1:-1); }).slice(0,5);
  return S2;
}

/* ───────── 차트 (단일 계열 · 한 가지 강조색 · 얇은 선 · 호버 툴팁) ───────── */
function kpi(label,value,sub){ return h('div',{class:'kpi'},[h('span',{class:'kl',text:label}),h('b',{text:value}),sub?h('small',{text:sub}):null]); }
function lineChart(pts){
  var narrow=window.innerWidth<640, W=narrow?400:640,H=narrow?210:230,L=36,R=12,T=14,B=28, n=pts.length;
  var X=function(i){ return n<2?(L+(W-L-R)/2):L+i*(W-L-R)/(n-1); }, Y=function(v){ return T+(100-v)/100*(H-T-B); };
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="점수 추이">';
  [0,50,100].forEach(function(v){ s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" class="grid"/><text x="'+(L-8)+'" y="'+(Y(v)+4)+'" class="axis" text-anchor="end">'+v+'</text>'; });
  if(n>1) s+='<path d="M'+pts.map(function(p,i){ return X(i)+' '+Y(p.y); }).join('L')+'" class="ln"/>';
  pts.forEach(function(p,i){ var x=X(i), y=Y(p.y);
    s+=p.exam?'<path d="M'+x+' '+(y-6)+'L'+(x+6)+' '+y+'L'+x+' '+(y+6)+'L'+(x-6)+' '+y+'Z" class="dot ex"/>':'<circle cx="'+x+'" cy="'+y+'" r="4.5" class="dot"/>'; });
  if(n){ s+='<text x="'+X(0)+'" y="'+(H-8)+'" class="axis" text-anchor="'+(n<2?'middle':'start')+'">'+pts[0].label+'</text>'; if(n>1) s+='<text x="'+X(n-1)+'" y="'+(H-8)+'" class="axis" text-anchor="end">'+pts[n-1].label+'</text>'; }
  s+='<line class="cross" x1="0" x2="0" y1="'+T+'" y2="'+(H-B)+'" style="display:none"/></svg>';
  var wrap=h('div',{class:'chart'},[]); wrap.innerHTML=s;
  var tip=h('div',{class:'tip hidden'}); wrap.appendChild(tip);
  var svg=wrap.querySelector('svg'), cross=wrap.querySelector('.cross');
  function show(ev){
    var r=svg.getBoundingClientRect(), cx=((ev.touches?ev.touches[0].clientX:ev.clientX)-r.left)/r.width*W;
    var i=n<2?0:Math.max(0,Math.min(n-1,Math.round((cx-L)/((W-L-R)/(n-1))))); var p=pts[i]; if(!p) return;
    cross.setAttribute('x1',X(i)); cross.setAttribute('x2',X(i)); cross.style.display='';
    tip.textContent=p.tip; tip.classList.remove('hidden');
    var px=X(i)/W*r.width, py=Y(p.y)/H*r.height; tip.style.left=Math.min(Math.max(px,70),r.width-70)+'px'; tip.style.top=(py-12)+'px';
  }
  function hide(){ tip.classList.add('hidden'); cross.style.display='none'; }
  svg.addEventListener('mousemove',show); svg.addEventListener('mouseleave',hide);
  svg.addEventListener('touchstart',show,{passive:true}); svg.addEventListener('touchmove',show,{passive:true});
  return wrap;
}
function barRows(rows,empty){
  if(!rows.length) return h('p',{class:'muted',text:empty||'아직 기록이 없어요.'});
  return h('div',{class:'bars'},rows.map(function(r){
    return h('div',{class:'brow',title:r.label+': '+r.ok+'/'+r.n+' 정답 ('+pct(r.acc)+')'},[
      h('div',{class:'bl',text:r.label}),h('div',{class:'bt'},[h('i',{style:'width:'+Math.max(2,Math.round(r.acc*100))+'%'})]),
      h('div',{class:'bv'},[pct(r.acc),h('small',{text:' '+r.ok+'/'+r.n})])]);
  }));
}
function heatmap(days){
  var weeks=12, today=new Date(), start=new Date(today); start.setDate(today.getDate()-(weeks-1)*7-today.getDay());
  var grid=h('div',{class:'heat',style:'--w:'+weeks});
  for(var wk=0;wk<weeks;wk++) for(var dd=0;dd<7;dd++){
    var d=new Date(start); d.setDate(start.getDate()+wk*7+dd);
    var future=d>today, v=days[dayKey(d)]||0, lv=v===0?0:v<5?1:v<10?2:v<20?3:4;
    grid.appendChild(h('span',{class:'hc l'+lv+(future?' fut':''),style:'grid-column:'+(wk+1)+';grid-row:'+(dd+1),
      title:(d.getMonth()+1)+'월 '+d.getDate()+'일 · '+(v?v+'문항':'공부 안 함')}));
  }
  var legend=h('div',{class:'heat-legend'},['적음',h('span',{class:'hc l1'}),h('span',{class:'hc l2'}),h('span',{class:'hc l3'}),h('span',{class:'hc l4'}),'많음']);
  return h('div',{},[h('div',{class:'heat-days'},['일','','화','','목','','토'].map(function(t){ return h('span',{text:t}); })),grid,legend]);
}
function sparkline(vals){
  if(vals.length<2) return null;
  var W=160,H=40,n=vals.length, p=vals.map(function(v,i){ return (i*(W-8)/(n-1)+4)+' '+(H-4-(v/100)*(H-8)); }).join('L');
  var w=h('div',{class:'spark'}); w.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><path d="M'+p+'" class="ln"/></svg>'; return w;
}

/* 홈: 미니 대시보드 */
function miniDashboard(){
  var S2=computeStats();
  if(!S2.tests) return h('section',{class:'mini card'},[h('div',{class:'mini-head'},[h('h3',{text:'공부 기록'}),h('a',{href:'#/stats',text:'대시보드 →'})]),
    h('p',{class:'muted',style:'margin:6px 0 0',text:'아직 푼 시험이 없어요. 첫 시험을 풀면 점수 추이와 취약 개념이 여기에 쌓여요.'})]);
  var weak=S2.byConcept.filter(function(c){ return c.n>=2; }).sort(function(a,b){ return a.acc-b.acc||b.n-a.n; }).slice(0,3);
  return h('section',{class:'mini card'},[
    h('div',{class:'mini-head'},[h('h3',{text:'공부 기록'}),h('a',{href:'#/stats',text:'대시보드 자세히 →'})]),
    h('div',{class:'kpis'},[kpi('푼 시험',S2.tests+'회','이번 주 '+S2.week+'일 공부'),kpi('평균 점수',Math.round(S2.avg)+'점','최고 '+Math.round(S2.best)+'점'),
      kpi('연속 공부',S2.streak+'일',S2.streak?'오늘도 이어 가요!':'오늘 시작해 볼까요?'),kpi('정답률',pct(S2.acc),S2.items.length+'문항 기준')]),
    h('div',{class:'mini-row'},[
      h('div',{},[h('div',{class:'kl',text:'최근 점수 흐름'}),sparkline(S2.H.slice(-10).map(function(e){ return e.max?e.got/e.max*100:0; }))||h('span',{class:'muted',text:'시험 2회부터 보여요'})]),
      h('div',{},[h('div',{class:'kl',text:'다시 볼 개념'}),weak.length?h('div',{class:'chips'},weak.map(function(c){ return h('span',{class:'chip d-상',text:c.key+' '+pct(c.acc)}); })):h('span',{class:'muted',text:'아직 충분한 기록이 없어요'})])
    ])
  ]);
}

/* 대시보드 페이지 */
function renderStats(param){
  var bookId=statScope(param);
  var app=$app(), page=h('div',{class:'page'}); app.appendChild(page); app.appendChild(themeBtn());
  page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:'#/'},['← 홈']),h('div',{},[h('div',{class:'crumb',text:'민겸이 공부 공간'}),h('h1',{text:'공부 기록'})]),h('button',{class:'share-btn',onclick:shareStats},['공유'])]));
  return Data.catalogP().catch(function(){ return {books:[]}; }).then(function(cat){
    var labels={}; cat.books.forEach(function(b){ labels[b.id]=bookLabel(b); });
    var used={}; allHistory().forEach(function(e){ used[e.bookId]=1; });
    var ids=Object.keys(used);
    var subjUsed={}; ids.forEach(function(id){ subjUsed[subjectOfBook(id)]=1; });
    var subjTabs=Object.keys(SUBJECTS).filter(function(k){ return subjUsed[k]; }).concat(Object.keys(subjUsed).filter(function(k){ return !SUBJECTS[k]; }));
    var multi=ids.filter(function(id){ return !bookId||subjectOfBook(id)===bookId; }).length>1;
    function unitPrefix(id){ return !bookId?subjectOfBook(id)+' · ':(multi?(labels[id]||'').replace(/ [^ ]+$/,'')+' · ':''); }
    page.appendChild(h('div',{class:'ntabs',style:'flex-wrap:wrap'},[h('button',{class:!bookId?'on':'',onclick:function(){ go('#/stats'); }},['전체'])].concat(subjTabs.map(function(k){
      return h('button',{class:bookId===k?'on':'',onclick:function(){ go('#/stats/'+encodeURIComponent(k)); }},[k]); }))));
    var S2=computeStats(bookId);
    if(!S2.tests){ page.appendChild(h('div',{class:'card'},[h('p',{class:'muted',text:'아직 푼 시험이 없어요. 시험을 풀면 여기에 기록이 쌓여요.'}),h('a',{class:'btn primary',href:'#/exam'},['✏️ 시험 보러 가기'])])); return; }
    // 단원 이름 불러오기
    return Promise.all(ids.map(function(id){ return Data.bookP(id).catch(function(){ return null; }); })).then(function(bks){
      var unitName={}; bks.forEach(function(b){ if(b) b.units.forEach(function(u){ unitName[b.id+'|'+u.id]=u.name; }); });
      page.appendChild(h('div',{class:'kpis big'},[
        kpi('푼 시험',S2.tests+'회','연습 '+S2.pracN+' · 실전 '+S2.examN),
        kpi('푼 문항',S2.solved+'개',S2.items.length?'정답률 '+pct(S2.acc):''),
        kpi('평균 점수',Math.round(S2.avg)+'점','100점 환산'),
        kpi('최고 점수',Math.round(S2.best)+'점','최근 '+Math.round(S2.last)+'점'),
        kpi('공부 시간',fmtDur(S2.dur),S2.tests?'시험당 평균 '+fmtDur(S2.dur/S2.tests):''),
        kpi('연속 공부',S2.streak+'일','최근 7일 중 '+S2.week+'일'),
        kpi('오답노트 학습 중',S2.learning+'문제','졸업 '+S2.mastered+'문제'),
        kpi('졸업률',S2.learning+S2.mastered?pct(S2.mastered/(S2.learning+S2.mastered)):'–','두 번 연속 맞힌 비율')
      ]));
      var trend=S2.H.slice(-20).map(function(e){ var s=e.max?Math.round(e.got/e.max*100):0;
        return {y:s,exam:e.mode==='exam',label:fmtDate(e.at),tip:fmtDate(e.at)+' · '+(labels[e.bookId]||'')+' · '+s+'점 ('+(e.source==='notes'?'오답노트':e.mode==='exam'?'실전':'연습')+')'}; });
      var table=h('details',{class:'tview'},[h('summary',{text:'표로 보기'}),h('table',{},[h('thead',{},[h('tr',{},[h('th',{text:'날짜'}),h('th',{text:'과목'}),h('th',{text:'방식'}),h('th',{class:'n',text:'점수'})])]),
        h('tbody',{},S2.H.slice(-20).reverse().map(function(e){ return h('tr',{},[h('td',{text:fmtDate(e.at)}),h('td',{text:labels[e.bookId]||e.bookId}),h('td',{text:e.source==='notes'?'오답노트':e.mode==='exam'?'실전':'연습'}),h('td',{class:'n',text:e.got+'/'+e.max}) ]); }))])]);
      page.appendChild(h('div',{class:'dash'},[
        h('div',{class:'card wide'},[h('h3',{text:'점수 추이 (최근 20회, 100점 환산)'}),h('p',{class:'legend-note',text:'● 연습   ◆ 실전   — 점에 손가락을 대면 자세히 보여요'}),lineChart(trend),table]),
        h('div',{class:'card'},[h('h3',{text:'공부 달력 (최근 12주)'}),heatmap(S2.days)]),
        h('div',{class:'card'},[h('h3',{text:'연습 vs 실전'}),h('div',{class:'kpis'},[kpi('연습 평균',S2.pracAvg==null?'–':Math.round(S2.pracAvg)+'점',S2.pracN+'회'),kpi('실전 평균',S2.examAvg==null?'–':Math.round(S2.examAvg)+'점',S2.examN+'회')]),
          h('p',{class:'muted',style:'font-size:.88rem;margin:10px 0 0',text:S2.pracAvg!=null&&S2.examAvg!=null?(S2.examAvg<S2.pracAvg-10?'실전에서 점수가 많이 떨어져요. 시간을 재고 푸는 연습을 늘려 보세요.':'연습과 실전 점수 차이가 크지 않아요. 좋아요!'):'연습과 실전을 모두 풀면 비교해 줘요.'})]),
        (function(){
          var rows=!bookId?Object.keys(S2.bySubject).map(function(k){ return {name:k,href:'#/stats/'+encodeURIComponent(k),b:S2.bySubject[k]}; })
            :(multi?Object.keys(S2.byBook).map(function(id){ return {name:labels[id]||id,href:null,b:S2.byBook[id]}; }):null);
          if(!rows) return null;
          rows.sort(function(x,y){ return x.name<y.name?-1:1; });
          return h('div',{class:'card wide'},[h('h3',{text:!bookId?'과목별 성적':bookId+' 학기별 성적'}),h('table',{},[h('thead',{},[h('tr',{},[h('th',{text:!bookId?'과목':'학기'}),h('th',{class:'n',text:'시험'}),h('th',{class:'n',text:'평균'}),h('th',{class:'n',text:'최근'}),h('th',{class:'n',text:'최고'}),h('th',{class:'n',text:'정답률'})])]),
            h('tbody',{},rows.map(function(r){ var b=r.b; return h('tr',{},[h('td',{},[r.href?h('a',{href:r.href,text:r.name}):r.name]),h('td',{class:'n',text:String(b.tests)}),h('td',{class:'n',text:Math.round(b.sum/b.tests)+''}),h('td',{class:'n',text:Math.round(b.last)+''}),h('td',{class:'n',text:Math.round(b.best)+''}),h('td',{class:'n',text:pct(b.acc)})]); }))])]);
        })(),
        h('div',{class:'card'},[h('h3',{text:'단원별 정답률'}),barRows(S2.byUnit.map(function(u){ return {label:unitPrefix(u.key.split('|')[0])+(unitName[u.key]||u.key.split('|')[1]),n:u.n,ok:u.ok,acc:u.acc}; }).sort(function(a,b){ return a.acc-b.acc; }))]),
        h('div',{class:'card'},[h('h3',{text:'취약 개념 TOP 5'}),h('p',{class:'legend-note',text:'2문항 이상 푼 개념 중 정답률이 낮은 순'}),
          barRows(S2.byConcept.filter(function(c){ return c.n>=2; }).sort(function(a,b){ return a.acc-b.acc||b.n-a.n; }).slice(0,5).map(function(c){ return {label:c.key,n:c.n,ok:c.ok,acc:c.acc}; }),'2문항 이상 푼 개념이 아직 없어요.')]),
        h('div',{class:'card'},[h('h3',{text:'강한 개념 TOP 3'}),
          barRows(S2.byConcept.filter(function(c){ return c.n>=2; }).sort(function(a,b){ return b.acc-a.acc||b.n-a.n; }).slice(0,3).map(function(c){ return {label:c.key,n:c.n,ok:c.ok,acc:c.acc}; }),'2문항 이상 푼 개념이 아직 없어요.')]),
        h('div',{class:'card'},[h('h3',{text:'난이도별 정답률'}),barRows(['하','중','상'].map(function(k){ var g=S2.byDiff.filter(function(x){ return x.key===k; })[0]; return g?{label:'난이도 '+k,n:g.n,ok:g.ok,acc:g.acc}:null; }).filter(Boolean))]),
        h('div',{class:'card'},[h('h3',{text:'문제 유형별 정답률'}),barRows(S2.byType.map(function(t){ return {label:t.key,n:t.n,ok:t.ok,acc:t.acc}; }))]),
        h('div',{class:'card wide'},[h('h3',{text:'자주 틀리는 문제 TOP 5'}),S2.topWrong.length?h('div',{class:'nlist'},S2.topWrong.map(function(n,i){
          return h('button',{class:'nitem',onclick:function(){ openReview(S2.topWrong.map(function(x){ return {q:x.q,ans:x.ans,self:x.self}; }),'자주 틀리는 문제','#/stats'+(bookId?'/'+encodeURIComponent(bookId):'')); setTimeout(function(){ go('#/review/'+(i+1)); },0); }},[
            h('div',{class:'q',text:stemText(n.q)}),h('div',{class:'m'},[h('span',{class:'chip',text:n.q.concept||'기타'}),h('span',{text:'틀린 횟수 '+n.wrongCount}),h('span',{text:'마지막 '+fmtDate(n.lastWrongAt)})])]); })):h('p',{class:'muted',text:'오답노트에서 학습 중인 문제가 없어요. 👏'})])
      ]));
    });
  }).catch(renderError);
}

/* ═════════ 가족 채팅 (Firestore 실시간) ═════════
 * 컬렉션 chat/{자동id}: {who:'dad'|'mom'|'min', text, img?(JPEG data URL), at:밀리초}. 규칙은 firestore.rules 참고.
 * 사진은 기기에서 줄여(긴 변 1000px, JPEG) 글자 데이터로 문서에 함께 저장한다(유료 저장소 불필요). */
var CHAT_PEOPLE={dad:{n:'아빠',c:'#2a4468'},mom:{n:'엄마',c:'#a8456b'},min:{n:'민겸',c:'#2f6b52'}};
var FB={p:null,db:null};
function loadFB(){
  if(FB.p) return FB.p;
  var f=CFG.firebase; if(!f) return (FB.p=Promise.reject(new Error('firebase 설정 없음')));
  function s(src){ return new Promise(function(res,rej){ var e=document.createElement('script'); e.src=src; e.onload=res; e.onerror=function(){ rej(new Error('Firebase를 불러오지 못했어요')); }; document.head.appendChild(e); }); }
  var B='https://www.gstatic.com/firebasejs/10.12.2/';
  var ready=(window.firebase&&firebase.firestore)?Promise.resolve():s(B+'firebase-app-compat.js').then(function(){ return s(B+'firebase-firestore-compat.js'); });
  FB.p=ready.then(function(){ if(!firebase.apps.length) firebase.initializeApp({projectId:f.projectId,apiKey:f.apiKey,appId:f.appId,messagingSenderId:f.messagingSenderId}); FB.db=firebase.firestore(); return FB.db; });
  FB.p.catch(function(){ FB.p=null; });
  return FB.p;
}
function chatWho(){ try{ var w=localStorage.getItem('mg-chat-who'); return CHAT_PEOPLE[w]?w:null; }catch(e){ return null; } }
function setChatWho(w){ try{ localStorage.setItem('mg-chat-who',w); }catch(e){} }
function chatSeen(){ try{ return +localStorage.getItem('mg-chat-seen')||0; }catch(e){ return 0; } }
function setChatSeen(t){ try{ localStorage.setItem('mg-chat-seen',String(t)); }catch(e){} }
function chatTime(at){ var d=new Date(at), hh=d.getHours(), ap=hh<12?'오전':'오후'; hh=hh%12||12; var m=d.getMinutes(); return ap+' '+hh+':'+(m<10?'0':'')+m; }
function chatDay(at){ var d=new Date(at), ds=['일','월','화','수','목','금','토']; return d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일 '+ds[d.getDay()]+'요일'; }

/* 사진 줄이기: 긴 변 1000px, 크기가 크면 화질·크기를 더 낮춘다 (글자 70만 자 이하) */
function shrinkImage(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file), im=new Image();
    im.onload=function(){
      URL.revokeObjectURL(url);
      var max=1000, q=0.72, out='';
      for(var i=0;i<6;i++){
        var sc=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight)), c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(im.naturalWidth*sc)); c.height=Math.max(1,Math.round(im.naturalHeight*sc));
        var cx=c.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,c.width,c.height); cx.drawImage(im,0,0,c.width,c.height);
        out=c.toDataURL('image/jpeg',q);
        if(out.length<=700000) return res(out);
        max=Math.round(max*0.8); q=Math.max(0.5,q-0.07);
      }
      rej(new Error('사진이 너무 커요'));
    };
    im.onerror=function(){ URL.revokeObjectURL(url); rej(new Error('이 사진은 열 수 없어요. 다른 사진을 골라 주세요')); };
    im.src=url;
  });
}

function devId(){ try{ var d=localStorage.getItem('mg-chat-dev'); if(!d){ d=Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10); localStorage.setItem('mg-chat-dev',d); } return d; }catch(e){ return 'nodev'; } }
function whoRef(db,k){ return db.collection('chatwho').doc(k); }
function clearChatWho(){ try{ localStorage.removeItem('mg-chat-who'); }catch(e){} }
/* 내 선택을 풀어 다른 기기가 쓸 수 있게 한다 */
function releaseWho(k){
  if(!k) return Promise.resolve();
  return loadFB().then(function(db){ return whoRef(db,k).get().then(function(d){ if(d.exists&&d.data().device===devId()) return whoRef(db,k).delete(); }); }).catch(function(){});
}
/* 선택하기: 다른 기기가 쓰는 중이면 옮길지 물어보고, 옮기면 그 기기의 선택은 자동으로 풀린다 */
function claimWho(k){
  return loadFB().then(function(db){
    return whoRef(db,k).get().then(function(d){
      if(d.exists&&d.data().device!==devId()){
        if(!confirm(CHAT_PEOPLE[k].n+'는 다른 기기에서 쓰는 중이에요.\n이 기기로 옮길까요? (그 기기는 선택이 풀려요)')) return false;
      }
      return whoRef(db,k).set({device:devId(),at:Date.now()}).then(function(){ return true; });
    });
  });
}
function chatOK(k){ try{ return !!(JSON.parse(localStorage.getItem('mg-chat-ok'))||{})[k]; }catch(e){ return false; } }
function setChatOK(k){ try{ var o=JSON.parse(localStorage.getItem('mg-chat-ok'))||{}; o[k]=1; localStorage.setItem('mg-chat-ok',JSON.stringify(o)); }catch(e){} }
function pickWho(onpick){
  var m, tags={};
  var btns=Object.keys(CHAT_PEOPLE).map(function(k){
    var p=CHAT_PEOPLE[k], tag=h('span',{class:'who-tag'}); tags[k]=tag;
    function go1(){
      claimWho(k).then(function(ok){ if(!ok) return; setChatWho(k); syncToken(); m.close(); onpick(k); },function(){ toast('선택하지 못했어요. 인터넷을 확인해 주세요'); });
    }
    return h('button',{class:'who-btn',style:'--wc:'+p.c,onclick:function(){
      if(k==='min'||chatOK(k)) return go1();
      pwPrompt(k,{title:p.n+' 확인',desc:'이 기기에서 처음 한 번만 비밀번호를 입력해요.',onok:function(){ setChatOK(k); go1(); }});
    }},[h('span',{text:p.n}),tag]);
  });
  m=openModal([h('h2',{style:'margin:0 0 6px',text:'누구세요?'}),h('p',{class:'muted',style:'margin:0 0 14px',text:'한 사람은 한 기기에서만 쓸 수 있어요. 나중에 바꿀 수도 있어요.'}),h('div',{class:'who-row'},btns)]);
  loadFB().then(function(db){ Object.keys(CHAT_PEOPLE).forEach(function(k){ whoRef(db,k).get().then(function(d){ if(d.exists&&d.data().device!==devId()) tags[k].textContent='다른 기기 사용 중'; }); }); }).catch(function(){});
}

/* 새 메시지 알림: 이 기기에서 앱(탭)이 열려 있는 동안 브라우저 알림을 띄운다. 앱을 완전히 닫으면 올 수 없다(그러려면 서버가 필요). */
var NOTIF={on:false,last:0};
function notifSupported(){ return 'Notification' in window; }
function notifGranted(){ return notifSupported()&&Notification.permission==='granted'; }
function showChatNotif(v){
  var p=CHAT_PEOPLE[v.who]||{n:'가족'}, body=p.n+': '+(v.text||'사진을 보냈어요'), opt={body:body,tag:'mg-chat',icon:undefined,renotify:true};
  var fallback=function(){ try{ var n=new Notification('가족 채팅',{body:body,tag:'mg-chat'}); n.onclick=function(){ window.focus(); location.hash='#/chat'; n.close(); }; }catch(e){} };
  if('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(function(r){ if(r) r.showNotification('가족 채팅',opt); else fallback(); },fallback); else fallback();
}
function startChatWatch(){
  if(NOTIF.on||!notifGranted()||!CFG.firebase) return;
  NOTIF.on=true;
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function(){});
  loadFB().then(function(db){
    var first=true;
    db.collection('chat').orderBy('at','desc').limit(1).onSnapshot(function(snap){
      var d=snap.docs[0]; if(!d) return; var v=d.data();
      if(first){ first=false; NOTIF.last=v.at; return; }
      if(v.at>NOTIF.last && !d.metadata.hasPendingWrites){
        NOTIF.last=v.at;
        if(v.who!==chatWho() && chatWho() && (document.hidden||location.hash.indexOf('#/chat')!==0)) showChatNotif(v);
      }
    },function(){ NOTIF.on=false; });
  }).catch(function(){ NOTIF.on=false; });
}

/* 푸시(앱을 닫아도 오는 알림): 이 기기의 FCM 번호를 chattokens/{기기번호}에 저장하면 서버 함수가 새 메시지를 그 번호로 보낸다 */
function syncToken(){
  if(!notifGranted()||!CFG.firebase||!CFG.firebase.messagingSenderId) return Promise.resolve();
  var who=chatWho(); if(!who) return Promise.resolve();
  var B='https://www.gstatic.com/firebasejs/10.12.2/';
  function s(src){ return new Promise(function(res,rej){ var e=document.createElement('script'); e.src=src; e.onload=res; e.onerror=rej; document.head.appendChild(e); }); }
  return loadFB().then(function(db){
    return (firebase.messaging?Promise.resolve():s(B+'firebase-messaging-compat.js')).then(function(){
      if(!firebase.messaging.isSupported()) return;
      return navigator.serviceWorker.register('sw.js').then(function(reg){ return navigator.serviceWorker.ready.then(function(){ return firebase.messaging().getToken({serviceWorkerRegistration:reg}); }); })
        .then(function(token){ if(token) return db.collection('chattokens').doc(devId()).set({who:who,token:token,at:Date.now()}); });
    });
  }).catch(function(){});
}
function dropToken(){ return loadFB().then(function(db){ return db.collection('chattokens').doc(devId()).delete(); }).catch(function(){}); }

function chatCard(){
  var cnt=h('span',{class:'count',style:'display:none'});
  var card=h('nav',{class:'menu family'},[h('a',{class:'mcard',href:'#/chat',style:'--mc:#7a5a3a'},[
    h('div',{class:'ic',html:ICONS.chat}),h('div',{},[h('h3',{text:'가족 채팅'}),h('p',{text:'엄마·아빠·민겸이 사진과 글을 실시간으로 주고받아요.'})]),cnt,h('span',{class:'go',text:'›'})])]);
  loadFB().then(function(db){ return db.collection('chat').orderBy('at','desc').limit(1).get(); }).then(function(snap){
    if(snap.empty) return;
    var d=snap.docs[0].data(), me=chatWho();
    if(d.at>chatSeen() && d.who!==me && document.body.contains(cnt)){ cnt.textContent='NEW'; cnt.style.display=''; }
  }).catch(function(){});
  return card;
}

function renderChat(){
  var app=$app(), me=chatWho(), last=[];
  var list=h('div',{class:'chat-list',role:'log','aria-live':'polite'});
  var status=h('div',{class:'chat-status',text:'불러오는 중…'});
  var whoLbl=h('button',{class:'chat-who',onclick:function(){ var old=me; clearChatWho(); dropToken(); releaseWho(old).then(function(){ renderChat(); }); }});
  function paintWho(){ var p=CHAT_PEOPLE[me]; whoLbl.innerHTML=''; whoLbl.appendChild(p?h('span',{style:'color:'+p.c,text:'나: '+p.n}):h('span',{text:'누구세요?'})); whoLbl.appendChild(h('span',{class:'chg',text:' · 바꾸기'})); }
  paintWho();
  var ta=h('textarea',{rows:'1',maxlength:'500',placeholder:'메시지를 입력하세요','aria-label':'메시지'});
  var file=h('input',{type:'file',accept:'image/*',class:'hidden'});
  var sendBtn=h('button',{class:'primary chat-send'},['보내기']);
  var photoBtn=h('button',{class:'chat-photo','aria-label':'사진 보내기',html:ICONS.photo});
  var busy=false, reads={}, onVis=null;
  function setBusy(b,msg){ busy=b; sendBtn.disabled=b; photoBtn.disabled=b; status.textContent=msg||''; status.style.display=msg?'':'none'; }
  function ensureWho(fn){ if(me) return fn(); pickWho(function(k){ me=k; paintWho(); paint(last); fn(); }); }
  function post(doc){
    setBusy(true,'보내는 중…');
    return loadFB().then(function(db){ return db.collection('chat').add(doc); })
      .then(function(){ setBusy(false); })
      .catch(function(e){ setBusy(false); toast('보내지 못했어요. 인터넷을 확인해 주세요'); throw e; });
  }
  function autoH(){ ta.style.height='auto'; ta.style.height=Math.min(120,ta.scrollHeight)+'px'; }
  function send(){
    var t=ta.value.trim(); if(!t||busy) return;
    ensureWho(function(){ post({who:me,text:t,at:Date.now()}).then(function(){ ta.value=''; autoH(); },function(){}); });
  }
  ta.addEventListener('input',autoH);
  ta.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&matchMedia('(pointer:fine)').matches){ e.preventDefault(); send(); } });
  sendBtn.addEventListener('click',send);
  photoBtn.addEventListener('click',function(){ ensureWho(function(){ file.value=''; file.click(); }); });
  file.addEventListener('change',function(){
    var f=file.files&&file.files[0]; if(!f) return;
    setBusy(true,'사진을 줄이는 중…');
    shrinkImage(f).then(function(img){ return post({who:me,text:ta.value.trim(),img:img,at:Date.now()}).then(function(){ ta.value=''; autoH(); }); })
      .catch(function(e){ setBusy(false); if(e&&e.message&&!/인터넷|Firebase/.test(e.message)&&e.name!=='FirebaseError') toast(e.message); });
  });
  function notifBar(){
    if(!notifSupported()||Notification.permission==='granted') return null;
    var bar=h('div',{class:'chat-notif'});
    if(Notification.permission==='denied'){ bar.appendChild(h('span',{text:'알림이 꺼져 있어요. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요.'})); return bar; }
    bar.appendChild(h('span',{text:'새 메시지를 알림으로 받을까요? (앱을 열어 둔 동안)'}));
    bar.appendChild(h('button',{class:'primary',onclick:function(){
      Notification.requestPermission().then(function(r){ if(r==='granted'){ bar.remove(); toast('알림을 켰어요'); startChatWatch(); syncToken(); } else { bar.textContent='알림을 허용하지 않았어요.'; } });
    }},['알림 켜기']));
    return bar;
  }
  var page=h('div',{class:'page chat-page'},[
    h('div',{class:'topbar'},[h('a',{class:'btn back',href:'#/'},['← 홈']),h('div',{},[h('div',{class:'crumb',text:'민겸이 공부 공간'}),h('h1',{text:'가족 채팅'})]),whoLbl]),
    h('div',{class:'chat-wrap'},[notifBar(),list,status,h('div',{class:'chat-bar'},[photoBtn,ta,sendBtn]),file])
  ]);
  app.appendChild(page);
  function paint(docs){
    last=docs;
    var near=list.scrollHeight-list.scrollTop-list.clientHeight<140, first=!list.childNodes.length;
    list.innerHTML='';
    if(!docs.length){ list.appendChild(h('div',{class:'chat-empty',text:'아직 대화가 없어요. 첫 인사를 남겨 보세요!'})); return; }
    var day='';
    docs.forEach(function(x){
      var d=x.data, dk=chatDay(d.at);
      if(dk!==day){ day=dk; list.appendChild(h('div',{class:'chat-day',text:dk})); }
      var mine=d.who===me, p=CHAT_PEOPLE[d.who]||{n:'?',c:'#666'};
      var bub=h('div',{class:'bub'+(d.img?' has-img':'')},[
        d.img?h('img',{src:d.img,alt:'보낸 사진',onclick:function(){ openModal([h('img',{src:d.img,alt:'사진 크게 보기',style:'width:100%;border-radius:10px;display:block'})]); }}):null,
        d.text?h('div',{class:'t',text:d.text}):null]);
      var meta=h('div',{class:'meta'},[chatTime(d.at)+(x.pending?' · 보내는 중':'')]);
      if(mine&&!x.pending){ var rd=Object.keys(CHAT_PEOPLE).filter(function(k){ return k!==me&&(reads[k]||0)>=d.at; }); if(rd.length) meta.appendChild(h('span',{class:'read',text:rd.length===2?'모두 읽음':CHAT_PEOPLE[rd[0]].n+' 읽음'})); }
      if(mine&&!x.pending) meta.appendChild(h('button',{class:'del',onclick:function(){ if(confirm('이 메시지를 지울까요? 모두에게서 사라져요.')) x.ref.delete().catch(function(){ toast('지우지 못했어요'); }); }},['삭제']));
      list.appendChild(h('div',{class:'msg '+(mine?'me':'other'),style:'--pc:'+p.c},[mine?null:h('div',{class:'name',text:p.n}),h('div',{class:'row'},[bub,meta])]));
    });
    if(first||near) list.scrollTop=list.scrollHeight;
  }
  if(!me) pickWho(function(k){ me=k; paintWho(); paint(last); });
  function markRead(db){
    if(!me||document.hidden||!last.length) return;
    var t=0; last.forEach(function(x){ if(!x.pending&&x.data.at>t) t=x.data.at; });
    if(t>(reads[me]||0)){ reads[me]=t; db.collection('chatread').doc(me).set({at:t}).catch(function(){}); }
  }
  function dropped(){ clearChatWho(); dropToken(); toast('다른 기기에서 '+CHAT_PEOPLE[me].n+'(으)로 접속해서 선택이 풀렸어요'); renderChat(); }
  loadFB().then(function(db){
    if(!me) return db;
    return whoRef(db,me).get().then(function(d){
      if(d.exists&&d.data().device!==devId()) return Promise.reject({dropped:true});
      return d.exists?null:whoRef(db,me).set({device:devId(),at:Date.now()});
    }).then(function(){ return db; });
  }).then(function(db){
    status.style.display='none';
    var unW=me?whoRef(db,me).onSnapshot(function(d){ if(d.exists&&d.data().device!==devId()) dropped(); }):null;
    var unC=db.collection('chat').orderBy('at','desc').limit(40).onSnapshot(function(snap){
      var docs=snap.docs.map(function(d){ return {ref:d.ref,data:d.data(),pending:d.metadata.hasPendingWrites}; }).reverse();
      paint(docs); markRead(db);
      if(docs.length) setChatSeen(Math.max(chatSeen(),docs[docs.length-1].data.at));
    },function(){ status.style.display=''; status.textContent='대화를 불러오지 못했어요. 인터넷이나 접근 설정을 확인해 주세요.'; });
    var unR=db.collection('chatread').onSnapshot(function(snap){ snap.forEach(function(d){ reads[d.id]=(d.data()||{}).at||0; }); paint(last); },function(){});
    onVis=function(){ markRead(db); }; document.addEventListener('visibilitychange',onVis);
    S.chatUnsub=function(){ unC(); unR(); if(unW) unW(); document.removeEventListener('visibilitychange',onVis); };
  }).catch(function(e){ if(e&&e.dropped) return dropped(); status.textContent='대화를 불러오지 못했어요: '+(e&&e.message||''); });
}

/* ───────── 시작 ───────── */
startChatWatch();
syncToken();
route();
})();
