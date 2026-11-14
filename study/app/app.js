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
  stopTimer(); removeNav(); closeModals();
  var p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  var a=p[0], b=p[1];
  var done=function(){ window.scrollTo(0,0); };
  try{
    if(!a) return renderHome(), done();
    if(a==='exam') return renderShelf('exam').then(done);
    if(a==='notes' && !b) return renderShelf('notes').then(done);
    if(a==='notes') return renderNotebook(b).then(done);
    if(a==='book') return renderBook(b).then(done);
    if(a==='stats') return renderStats(b).then(done);
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
function themeBtn(){
  return h('button',{class:'theme-btn',title:'밝기 전환','aria-label':'화면 밝기 전환',onclick:function(){
    var r=document.documentElement, cur=r.getAttribute('data-theme');
    var dark=cur?cur==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
    r.setAttribute('data-theme',dark?'light':'dark');
    try{ localStorage.setItem('mg-study:theme',r.getAttribute('data-theme')); }catch(e){}
  }},['🌓']);
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
        h('div',{class:'date',text:d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일 '+days[d.getDay()]+'요일 · 오늘도 한 걸음씩'})
      ]),
      h('div',{class:'emblem',html:ICONS.openbook}),
      noticeBoard(),
      h('div',{class:'chalk-line'})
    ]),
    miniDashboard(),
    h('div',{class:'sec-title',text:'메뉴'}),
    h('nav',{class:'menu'},MENUS.map(function(m){
      return h('a',{class:'mcard',href:m.href,style:'--mc:'+m.color},[
        h('div',{class:'ic',html:ICONS[m.icon]||''}),
        h('div',{},[h('h3',{text:m.title}),h('p',{text:m.desc})]),
        m.id==='notes'&&learning?h('span',{class:'count',text:String(learning)}):null,
        h('span',{class:'go',text:'›'})
      ]);
    })),
    h('div',{class:'foot',text:'📚 공부한 기록은 이 기기에 저장돼요'})
  ]);
  app.appendChild(page); app.appendChild(themeBtn());
}

/* ═════════ 책장 ═════════ */
function bookEl(b, opts){
  opts=opts||{};
  var sub=SUBJECTS[b.subject]||{c:'#5b5b5b'};
  var el=h('button',{class:'book'+(opts.dim?' dim':''),style:'--c:'+(b.color||sub.c),'aria-label':bookLabel(b)},[
    h('div',{class:'cover'}),h('div',{class:'pages'}),
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
    var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(rm) return opts.onpick();
    el.classList.add('pull'); setTimeout(opts.onpick,380);
  });
  return el;
}
function renderShelf(kind){
  var app=$app();
  var page=h('div',{class:'page'});
  page.appendChild(h('div',{class:'topbar'},[
    h('a',{class:'btn back',href:'#/'},['← 홈']),
    h('div',{},[h('div',{class:'crumb',text:'민겸이 공부 공간'}),h('h1',{text:kind==='exam'?'시험으로 풀어보기':'오답노트'})])
  ]));
  page.appendChild(h('p',{class:'muted',style:'margin:-6px 0 14px',text:kind==='exam'?'풀고 싶은 교과서를 눌러 보세요. 누를 때마다 새로운 시험을 볼 수 있어요.':'교과서별로 틀린 문제가 모여 있어요. 빨간 숫자는 아직 학습 중인 문제 수예요.'}));
  var cs=h('div',{class:'bookcase'}); page.appendChild(cs);
  if(kind==='notes') page.appendChild(backupCard());
  app.appendChild(page); app.appendChild(themeBtn());
  return Data.catalogP().then(function(c){
    var books=c.books.slice().sort(function(a,b){ return a.grade-b.grade||a.semester-b.semester||a.subject.localeCompare(b.subject,'ko'); });
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
    page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:'#/exam'},['← 책장']),h('div',{class:'crumb',text:'시험으로 풀어보기'})]));
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
        h('div',{class:'bookhead'},[bookEl({grade:book.grade,semester:book.semester,subject:book.subject,color:book.color,units:book.units.length,questions:book.questions.length,sample:book.sample}),
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
function makeExam(book, unitIds, mode){
  var st=Store.book(book.id), groups={};
  book.questions.forEach(function(q){ if(unitIds.indexOf(q.unit)<0) return; var k=q.unit+'/'+q.slot; (groups[k]=groups[k]||[]).push(q); });
  var picked=[], time=0;
  book.units.forEach(function(u,ui){
    if(unitIds.indexOf(u.id)<0) return;
    time+=u.timeLimitMin||0;
    u.slots.forEach(function(s,si){
      var vs=groups[u.id+'/'+s.id]; if(!vs||!vs.length) return;
      var min=Math.min.apply(null,vs.map(function(v){ return st.seen[v.id]||0; }));
      var pool=vs.filter(function(v){ return (st.seen[v.id]||0)===min; });
      picked.push({q:pool[Math.floor(Math.random()*pool.length)],ui:ui,si:si});
    });
  });
  picked.sort(function(a,b){ return TYPE_ORDER[a.q.type]-TYPE_ORDER[b.q.type]||a.ui-b.ui||a.si-b.si; });
  var orig={}; picked.forEach(function(p){ orig[p.q.id]=p.q; });
  return newExam({bookId:book.id,title:bookLabel(book),mode:mode,source:'exam',units:unitIds,qs:picked.map(function(p){return prepare(p.q);}),orig:orig,timeLimitMin:mode==='exam'?Math.min(time||45,50):0});
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
    page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:'#/notes'},['← 책장']),h('div',{},[h('div',{class:'crumb',text:title}),h('h1',{text:'오답노트'})])]));
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
  var allCb=h('input',{type:'checkbox'}), startBtn, cbs={};
  var list=h('div',{class:'opt'});
  book.units.forEach(function(u){
    var cb=h('input',{type:'checkbox'}); cb.checked=picked[u.id]; cbs[u.id]=cb;
    cb.addEventListener('change',function(){ picked[u.id]=cb.checked; refresh(); });
    list.appendChild(h('label',{},[cb,h('span',{text:u.name}),h('span',{class:'u-meta',text:u.slots.length+'문항'})]));
  });
  allCb.addEventListener('change',function(){ book.units.forEach(function(u){ picked[u.id]=allCb.checked; cbs[u.id].checked=allCb.checked; }); refresh(); });
  function chosen(){ return book.units.filter(function(u){ return picked[u.id]; }); }
  function refresh(){
    var c=chosen(), n=c.reduce(function(s,u){ return s+u.slots.length; },0);
    allCb.checked=c.length===book.units.length;
    startBtn.disabled=!c.length; startBtn.textContent=c.length?'시험 시작 ('+n+'문항)':'단원을 골라 주세요';
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
    var c=Notice.who[w], body=h('div',{class:'nb',text:'불러오는 중…'}), dt=h('div',{class:'nd'});
    fills[w]=function(v){ var has=v&&v.text; body.textContent=has?v.text:'아직 남긴 말이 없어요'; body.classList.toggle('empty',!has); dt.textContent=has&&v.updatedAt?fmtDateTime(v.updatedAt):''; };
    return h('button',{class:'note '+w,'aria-label':c.label+' 쓰기',onclick:function(){ noticeEditor(w,fills[w]); }},[
      h('span',{class:'pin'}),h('div',{class:'nt'},[c.icon+' '+c.label,h('span',{class:'pen',text:'✎'})]),body,dt]);
  }));
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
    h('h2',{style:'margin:0 0 12px',text:'📌 새 알림이 있어요'})
  ].concat(list.map(function(p){ var c=Notice.who[p[0]];
    return h('div',{class:'pop-note '+p[0]},[h('b',{text:c.icon+' '+c.label}),h('div',{class:'pre',style:'margin-top:6px',text:p[1].text}),h('div',{class:'nd',text:fmtDateTime(p[1].updatedAt)})]);
  })).concat([h('div',{class:'row',style:'justify-content:flex-end;margin-top:14px'},[h('button',{class:'primary',onclick:function(){
    list.forEach(function(p){ try{ localStorage.setItem(seenKey(p[0]),p[1].updatedAt); }catch(e){} }); m.close();
  }},['확인했어요'])])]));
}
function noticeEditor(w,onSaved){
  var c=Notice.who[w], err=h('div',{class:'err'});
  var pw=h('input',{type:'password',inputmode:'numeric',autocomplete:'off',maxlength:'10',placeholder:'비밀번호',class:'pw'});
  function check(){
    if(pw.value!==c.pw){ err.textContent='비밀번호가 달라요'; m.box.classList.remove('shake'); void m.box.offsetWidth; m.box.classList.add('shake'); pw.select(); return; }
    m.close(); writeStep();
  }
  pw.addEventListener('keydown',function(e){ if(e.key==='Enter') check(); });
  var m=openModal([h('h2',{style:'margin:0 0 6px',text:c.icon+' '+c.label}),h('p',{class:'muted',style:'margin:0 0 12px',text:'알림을 쓰려면 비밀번호를 입력하세요.'}),pw,err,
    h('div',{class:'row',style:'justify-content:flex-end;margin-top:14px'},[h('button',{onclick:function(){ m.close(); }},['취소']),h('button',{class:'primary',onclick:check},['확인'])])]);
  setTimeout(function(){ pw.focus(); },30);
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
      var m2=openModal([h('h2',{style:'margin:0 0 10px',text:c.icon+' '+c.label+' 쓰기'}),ta,h('div',{style:'text-align:right;margin-top:4px'},[cnt]),
        Notice.shared()?null:h('p',{class:'hint',text:'공유 설정 전이라 이 기기에서만 보여요.'}),
        h('div',{class:'row',style:'margin-top:12px'},[h('button',{onclick:function(){ if(confirm('알림을 지울까요?')) save(''); }},['지우기']),h('span',{class:'spacer'}),
          h('button',{onclick:function(){ m2.close(); }},['취소']),h('button',{class:'primary',onclick:function(){ save(ta.value.trim()); }},['저장'])])]);
      setTimeout(function(){ ta.focus(); },30);
    });
  }
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
function computeStats(bookId){
  var H=allHistory().filter(function(e){ return !bookId||e.bookId===bookId; });
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
  S2.byBook={};
  H.forEach(function(e){ var b=S2.byBook[e.bookId]=S2.byBook[e.bookId]||{tests:0,sum:0,best:0,last:0}; var s=e.max?e.got/e.max*100:0; b.tests++; b.sum+=s; b.best=Math.max(b.best,s); b.last=s; });
  group(S2.items,function(i){ return i.bookId; }).forEach(function(g){ if(S2.byBook[g.key]) S2.byBook[g.key].acc=g.acc; });
  var books=Store.load().books, learning=0, mastered=0, wrong=[];
  for(var id in books){ if(bookId&&id!==bookId) continue; for(var q in books[id].notes){ var n=books[id].notes[q]; if(n.mastered) mastered++; else { learning++; wrong.push(n); } } }
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
  if(!S2.tests) return h('section',{class:'mini card'},[h('div',{class:'mini-head'},[h('h3',{text:'📊 공부 기록'}),h('a',{href:'#/stats',text:'대시보드 →'})]),
    h('p',{class:'muted',style:'margin:6px 0 0',text:'아직 푼 시험이 없어요. 첫 시험을 풀면 점수 추이와 취약 개념이 여기에 쌓여요.'})]);
  var weak=S2.byConcept.filter(function(c){ return c.n>=2; }).sort(function(a,b){ return a.acc-b.acc||b.n-a.n; }).slice(0,3);
  return h('section',{class:'mini card'},[
    h('div',{class:'mini-head'},[h('h3',{text:'📊 공부 기록'}),h('a',{href:'#/stats',text:'대시보드 자세히 →'})]),
    h('div',{class:'kpis'},[kpi('푼 시험',S2.tests+'회','이번 주 '+S2.week+'일 공부'),kpi('평균 점수',Math.round(S2.avg)+'점','최고 '+Math.round(S2.best)+'점'),
      kpi('연속 공부',S2.streak+'일',S2.streak?'오늘도 이어 가요!':'오늘 시작해 볼까요?'),kpi('정답률',pct(S2.acc),S2.items.length+'문항 기준')]),
    h('div',{class:'mini-row'},[
      h('div',{},[h('div',{class:'kl',text:'최근 점수 흐름'}),sparkline(S2.H.slice(-10).map(function(e){ return e.max?e.got/e.max*100:0; }))||h('span',{class:'muted',text:'시험 2회부터 보여요'})]),
      h('div',{},[h('div',{class:'kl',text:'다시 볼 개념'}),weak.length?h('div',{class:'chips'},weak.map(function(c){ return h('span',{class:'chip d-상',text:c.key+' '+pct(c.acc)}); })):h('span',{class:'muted',text:'아직 충분한 기록이 없어요'})])
    ])
  ]);
}

/* 대시보드 페이지 */
function renderStats(bookId){
  var app=$app(), page=h('div',{class:'page'}); app.appendChild(page); app.appendChild(themeBtn());
  page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:'#/'},['← 홈']),h('div',{},[h('div',{class:'crumb',text:'민겸이 공부 공간'}),h('h1',{text:'공부 기록'})])]));
  return Data.catalogP().catch(function(){ return {books:[]}; }).then(function(cat){
    var labels={}; cat.books.forEach(function(b){ labels[b.id]=bookLabel(b); });
    var used={}; allHistory().forEach(function(e){ used[e.bookId]=1; });
    var ids=Object.keys(used);
    page.appendChild(h('div',{class:'ntabs',style:'flex-wrap:wrap'},[h('button',{class:!bookId?'on':'',onclick:function(){ go('#/stats'); }},['전체'])].concat(ids.map(function(id){
      return h('button',{class:bookId===id?'on':'',onclick:function(){ go('#/stats/'+encodeURIComponent(id)); }},[labels[id]||id]); }))));
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
        !bookId?h('div',{class:'card wide'},[h('h3',{text:'과목별 성적'}),h('table',{},[h('thead',{},[h('tr',{},[h('th',{text:'과목'}),h('th',{class:'n',text:'시험'}),h('th',{class:'n',text:'평균'}),h('th',{class:'n',text:'최근'}),h('th',{class:'n',text:'최고'}),h('th',{class:'n',text:'정답률'})])]),
          h('tbody',{},Object.keys(S2.byBook).map(function(id){ var b=S2.byBook[id]; return h('tr',{},[h('td',{},[h('a',{href:'#/stats/'+encodeURIComponent(id),text:labels[id]||id})]),h('td',{class:'n',text:String(b.tests)}),h('td',{class:'n',text:Math.round(b.sum/b.tests)+''}),h('td',{class:'n',text:Math.round(b.last)+''}),h('td',{class:'n',text:Math.round(b.best)+''}),h('td',{class:'n',text:pct(b.acc)})]); }))])]):null,
        h('div',{class:'card'},[h('h3',{text:'단원별 정답률'}),barRows(S2.byUnit.map(function(u){ return {label:(bookId?'':(labels[u.key.split('|')[0]]||'').replace(/^\d학년 \d학기 /,'')+' · ')+(unitName[u.key]||u.key.split('|')[1]),n:u.n,ok:u.ok,acc:u.acc}; }).sort(function(a,b){ return a.acc-b.acc; }))]),
        h('div',{class:'card'},[h('h3',{text:'⚠️ 취약 개념 TOP 5'}),h('p',{class:'legend-note',text:'2문항 이상 푼 개념 중 정답률이 낮은 순'}),
          barRows(S2.byConcept.filter(function(c){ return c.n>=2; }).sort(function(a,b){ return a.acc-b.acc||b.n-a.n; }).slice(0,5).map(function(c){ return {label:c.key,n:c.n,ok:c.ok,acc:c.acc}; }),'2문항 이상 푼 개념이 아직 없어요.')]),
        h('div',{class:'card'},[h('h3',{text:'💪 강한 개념 TOP 3'}),
          barRows(S2.byConcept.filter(function(c){ return c.n>=2; }).sort(function(a,b){ return b.acc-a.acc||b.n-a.n; }).slice(0,3).map(function(c){ return {label:c.key,n:c.n,ok:c.ok,acc:c.acc}; }),'2문항 이상 푼 개념이 아직 없어요.')]),
        h('div',{class:'card'},[h('h3',{text:'난이도별 정답률'}),barRows(['하','중','상'].map(function(k){ var g=S2.byDiff.filter(function(x){ return x.key===k; })[0]; return g?{label:'난이도 '+k,n:g.n,ok:g.ok,acc:g.acc}:null; }).filter(Boolean))]),
        h('div',{class:'card'},[h('h3',{text:'문제 유형별 정답률'}),barRows(S2.byType.map(function(t){ return {label:t.key,n:t.n,ok:t.ok,acc:t.acc}; }))]),
        h('div',{class:'card wide'},[h('h3',{text:'🔁 자주 틀리는 문제 TOP 5'}),S2.topWrong.length?h('div',{class:'nlist'},S2.topWrong.map(function(n,i){
          return h('button',{class:'nitem',onclick:function(){ openReview(S2.topWrong.map(function(x){ return {q:x.q,ans:x.ans,self:x.self}; }),'자주 틀리는 문제','#/stats'+(bookId?'/'+encodeURIComponent(bookId):'')); setTimeout(function(){ go('#/review/'+(i+1)); },0); }},[
            h('div',{class:'q',text:stemText(n.q)}),h('div',{class:'m'},[h('span',{class:'chip',text:n.q.concept||'기타'}),h('span',{text:'틀린 횟수 '+n.wrongCount}),h('span',{text:'마지막 '+fmtDate(n.lastWrongAt)})])]); })):h('p',{class:'muted',text:'오답노트에서 학습 중인 문제가 없어요. 👏'})])
      ]));
    });
  }).catch(renderError);
}

/* ───────── 시작 ───────── */
route();
})();
