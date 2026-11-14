/* 민겸이 공부 공간 — 앱 엔진
 * 화면: 홈 / 책장(시험·오답노트) / 책(시험 범위 선택) / 시험 / 결과 / 오답풀이(한 문제 한 페이지) / 오답노트
 * 데이터: library/catalog.json, library/<책>/book.json (문제 은행)
 * 저장: localStorage 'mg-study:v1' (기기별) — 오답노트 DB, 본 문제 기록, 시험 기록
 */
(function(){
'use strict';

/* ───────── 설정: 홈 메뉴 (여기에 추가하면 홈에 카드가 생김) ───────── */
var MENUS = [
  { id:'exam',  color:'#2f6b52', icon:'exam',  title:'시험으로 풀어보기', desc:'학년·학기·과목을 고르면 들어갈 때마다 새 시험지가 만들어져요.', href:'#/exam' },
  { id:'notes', color:'#a8362c', icon:'notes', title:'오답노트', desc:'틀린 문제만 모아 다시 풀어요. 두 번 연속 맞히면 졸업!', href:'#/notes' }
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
  stopTimer(); removeNav();
  var p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  var a=p[0], b=p[1];
  var done=function(){ window.scrollTo(0,0); };
  try{
    if(!a) return renderHome(), done();
    if(a==='exam') return renderShelf('exam').then(done);
    if(a==='notes' && !b) return renderShelf('notes').then(done);
    if(a==='notes') return renderNotebook(b).then(done);
    if(a==='book') return renderBook(b).then(done);
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
  var learning=0, tests=0;
  var books=Store.load().books; for(var id in books){ learning+=noteCounts(id).learning; tests+=(books[id].history||[]).length; }
  var page=h('div',{class:'page'},[
    h('header',{class:'hero'},[
      h('div',{class:'kicker',text:'MINGYEOM · STUDY ROOM'}),
      h('h1',{text:'민겸이 공부 공간'}),
      h('div',{class:'date',text:d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일 '+days[d.getDay()]+'요일 · 오늘도 한 걸음씩'}),
      h('div',{class:'emblem',html:ICONS.openbook}),
      h('div',{class:'chalk-line'})
    ]),
    h('div',{class:'status'},[
      h('div',{class:'s'},[h('b',{text:String(tests)}),h('span',{text:'푼 시험'})]),
      h('div',{class:'s'},[h('b',{text:String(learning)}),h('span',{text:'오답노트 학습 중'})]),
      h('div',{class:'s'},[h('b',{id:'nbooks',text:'–'}),h('span',{text:'책장의 교과서'})])
    ]),
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
  Data.catalogP().then(function(c){ var el=document.getElementById('nbooks'); if(el) el.textContent=String(c.books.length); }).catch(function(){});
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
  page.appendChild(h('p',{class:'muted',style:'margin:-6px 0 14px',text:kind==='exam'?'풀고 싶은 교과서를 눌러 보세요. 누를 때마다 새 시험지가 만들어져요.':'교과서별로 틀린 문제가 모여 있어요. 빨간 숫자는 아직 학습 중인 문제 수예요.'}));
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
    var picked={}; book.units.forEach(function(u){ picked[u.id]=true; });
    page.appendChild(h('div',{class:'topbar'},[h('a',{class:'btn back',href:'#/exam'},['← 책장']),h('div',{class:'crumb',text:'시험으로 풀어보기'})]));
    var opts=h('div',{class:'opt'});
    book.units.forEach(function(u){
      var cb=h('input',{type:'checkbox',checked:'checked',onchange:function(){ picked[u.id]=cb.checked; }});
      var nq=u.slots.length;
      opts.appendChild(h('label',{},[cb,h('span',{text:u.name}),h('span',{class:'u-meta',text:nq+'문항'})]));
    });
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
        h('h3',{style:'margin:20px 0 6px;font-size:1.05rem',text:'시험 범위'}), opts,
        h('h3',{style:'margin:18px 0 8px;font-size:1.05rem',text:'풀이 방식'}), modeBox,
        h('div',{class:'row',style:'margin-top:18px'},[
          h('button',{class:'primary',onclick:function(){
            var ids=book.units.filter(function(u){ return picked[u.id]; }).map(function(u){ return u.id; });
            if(!ids.length) return toast('시험 범위를 하나 이상 골라 주세요');
            S.exam=makeExam(book,ids,S.mode); go('#/quiz');
          }},['✏️ 새 시험지 만들기']),
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
  st.history=(st.history||[]).concat([{at:now,source:E.source,mode:E.mode,got:R.got,max:R.max,n:E.qs.length}]).slice(-80);
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
      E.source==='exam'?h('button',{onclick:function(){ Data.bookP(E.bookId).then(function(b){ S.exam=makeExam(b,E.units,E.mode); go('#/quiz'); }); }},['✏️ 새 시험지']):null,
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

/* ───────── 시작 ───────── */
route();
})();
