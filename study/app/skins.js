/* 스킨(화면 테마) — 색·글꼴·칠판 영역 그림을 한 번에 바꾼다.
 * - 고른 스킨은 이 기기에만 저장(localStorage 'mg-study:skin'). 기본은 'class'(클래스룸, 지금 디자인).
 * - 스킨마다 색 변수 묶음은 app/skins.css 의 :root[data-skin="…"] 에 있다. 여기서는 선택·저장·글꼴 로딩·칠판 영역 그림(decor)만 맡는다.
 * - 어두운 스킨(space·arcade)과 밝은 스킨은 밝기 버튼(🌓)과 충돌하므로 밝기를 스킨이 정하고 버튼은 숨긴다. 클래스룸만 밝기 전환을 쓴다.
 * - 이 파일은 <head>에서 먼저 실행돼, 화면이 그려지기 전에 스킨을 적용한다(옛 디자인이 번쩍 보이지 않게).
 * - 교과 정리 슬라이드(iframe)는 교과서 표지 컨셉이라 스킨을 적용하지 않는다. */
(function(){
'use strict';
var KEY='mg-study:skin', THEME_KEY='mg-study:theme', root=document.documentElement;
var SKINS=[
  {id:'class',  name:'클래스룸',   desc:'초록 칠판과 나무 문이 있는 교실',        dark:null,  swatch:['#f5efe3','#2b4a3d','#2f6b52'], tc:'#2b4a3d'},
  {id:'note',   name:'스터디 노트', desc:'방안지 노트, 형광펜, 메롱 스티커',        dark:false, swatch:['#fbf8f0','#fff176','#3a5bd9'], tc:'#fbf8f0', fonts:'family=Gowun+Dodum'},
  {id:'forest', name:'숲속 언덕',   desc:'연둣빛 하늘과 숲 언덕, 메롱 하는 해',      dark:false, swatch:['#eef2e6','#d6e8c6','#4f7a4a'], tc:'#eef2e6', fonts:'family=Gowun+Batang:wght@400;700&family=Gowun+Dodum'},
  {id:'space',  name:'우주 천문대', desc:'별자리와 천문대, 메롱 하는 보름달',        dark:true,  swatch:['#0a0919','#171044','#5ee0d6'], tc:'#0a0919', fonts:'family=IBM+Plex+Sans+KR:wght@400;600;700'},
  {id:'sea',    name:'바닷가',     desc:'파도와 모래사장, 모래에 그린 메롱 얼굴',    dark:false, swatch:['#fbf4e2','#63c0e8','#0f8fb8'], tc:'#fbf4e2', fonts:'family=Gowun+Dodum'},
  {id:'arcade', name:'레트로 게임기', desc:'도트 게임 화면, 메롱 블록',            dark:true,  swatch:['#100b24','#ff4fa3','#ffe14a'], tc:'#100b24', fonts:'family=Do+Hyeon&family=Press+Start+2P'}
];
function byId(id){ for(var i=0;i<SKINS.length;i++) if(SKINS[i].id===id) return SKINS[i]; return null; }
function stored(){
  var q=null; try{ q=new URLSearchParams(location.search).get('skin'); }catch(e){}
  if(q&&byId(q)) return q;                      // ?skin=sea 로 열면 저장하지 않고 미리보기만
  var v=null; try{ v=localStorage.getItem(KEY); }catch(e){}
  return byId(v)?v:'class';
}
var cur=stored();

function fixedTheme(){ var s=byId(cur); return s&&s.dark!==null?(s.dark?'dark':'light'):null; }
function applyTheme(){
  var f=fixedTheme();
  if(f){ root.setAttribute('data-theme',f); return; }
  var th=null; try{ th=localStorage.getItem(THEME_KEY); }catch(e){}
  if(th) root.setAttribute('data-theme',th); else root.removeAttribute('data-theme');
}
function loadFonts(s){
  var el=document.getElementById('skin-fonts');
  if(!s.fonts){ if(el) el.remove(); return; }
  var href='https://fonts.googleapis.com/css2?'+s.fonts+'&display=swap';
  if(!el){ el=document.createElement('link'); el.id='skin-fonts'; el.rel='stylesheet'; document.head.appendChild(el); }
  if(el.getAttribute('href')!==href) el.setAttribute('href',href);
}
function apply(id,save){
  var s=byId(id)||byId('class'); cur=s.id;
  root.setAttribute('data-skin',s.id);
  if(s.id==='class') root.removeAttribute('data-skinned'); else root.setAttribute('data-skinned','1');
  applyTheme();
  if(document.head) loadFonts(s);
  var m=document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content',s.tc);
  if(save){ try{ localStorage.setItem(KEY,s.id); }catch(e){} }
}

/* ───────── 칠판 영역 그림(decor) ───────── */
function facePaths(stroke,tongue,tstroke,sw,outline){
  return '<g fill="none" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round">'+(outline?'<circle cx="32" cy="32" r="25"/>':'')+
    '<path d="M18 23l8 4-8 4M46 23l-8 4 8 4"/><ellipse cx="13.5" cy="38" rx="4" ry="2.6" fill="#ff9fb4" stroke="none" opacity=".6"/><ellipse cx="50.5" cy="38" rx="4" ry="2.6" fill="#ff9fb4" stroke="none" opacity=".6"/>'+
    '<path d="M33 43v8.5a4.6 4.6 0 0 0 9.2 0V41.5" fill="'+tongue+'" stroke="'+tstroke+'"/><path d="M21 40q11 7 22 0"/></g>';
}
function wave(W,H,y,amp,fill,extra,step){
  var d='M0,'+y+' Q'+step/4+','+(y-amp)+' '+step/2+','+y, x=step/2;
  while(x<W+step){ x+=step/2; d+=' T'+x+','+y; }
  return '<path d="'+d+' L'+(W+step)+','+H+' L0,'+H+' Z" fill="'+fill+'" '+(extra||'')+'/>';
}
function sprite(rows,pal,x,y,u){
  var o='<g transform="translate('+x+' '+y+')">';
  for(var j=0;j<rows.length;j++) for(var i=0;i<rows[j].length;i++){ var c=rows[j].charAt(i); if(pal[c]) o+='<rect x="'+i*u+'" y="'+j*u+'" width="'+u+'" height="'+u+'" fill="'+pal[c]+'"/>'; }
  return o+'</g>';
}
function el(cls,svg,style){ var s=document.createElement('span'); s.className='dc '+cls; s.setAttribute('aria-hidden','true'); s.innerHTML=svg; if(style) s.setAttribute('style',style); return s; }

var DECOR={
  note:function(){
    return [el('dc-sticker','<svg viewBox="0 0 64 64">'+facePaths('#2b2d42','#ff7aa8','#c4456f',3.2)+'</svg>')];
  },
  forest:function(){
    var rays=''; for(var k=0;k<12;k++){ var a=k*Math.PI/6; rays+='<line x1="'+(35+24*Math.cos(a)).toFixed(1)+'" y1="'+(35+24*Math.sin(a)).toFixed(1)+'" x2="'+(35+31*Math.cos(a)).toFixed(1)+'" y2="'+(35+31*Math.sin(a)).toFixed(1)+'"/>'; }
    var sun='<svg viewBox="0 0 70 70"><g stroke="#f4b942" stroke-width="3" stroke-linecap="round">'+rays+'</g><circle cx="35" cy="35" r="20" fill="#ffe27a" stroke="#f4b942" stroke-width="2"/>'+
      '<g transform="translate(35 35) scale(.76) translate(-32 -32)">'+facePaths('#7a4a12','#ff8fa3','#b5485f',3)+'</g></svg>';
    var pine=function(x,h){ return '<path d="M'+x+',60 L'+(x-8)+',60 L'+x+','+(60-h)+' L'+(x+8)+',60Z"/><path d="M'+x+',54 L'+(x-10)+',54 L'+x+','+(60-h+9)+' L'+(x+10)+',54Z"/>'; };
    var trees='<svg viewBox="0 0 120 60"><g fill="#27432d">'+pine(18,34)+pine(40,44)+pine(62,30)+pine(100,38)+'</g></svg>';
    return [el('dc-sun',sun),el('dc-trees',trees)];
  },
  space:function(){
    var rnd=function(seed){ var s=seed; return function(){ s=(s*9301+49297)%233280; return s/233280; }; }(5);
    var moon='<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#fff3b8" opacity=".12"/><defs><radialGradient id="mg" cx=".35" cy=".3"><stop offset="0" stop-color="#fffbe6"/><stop offset="1" stop-color="#f1d98e"/></radialGradient></defs>'+
      '<circle cx="40" cy="40" r="25" fill="url(#mg)"/><circle cx="29" cy="50" r="4.4" fill="#e3cd82" opacity=".55"/><circle cx="52" cy="28" r="3.4" fill="#e3cd82" opacity=".5"/><circle cx="53" cy="52" r="2.6" fill="#e3cd82" opacity=".45"/>'+
      '<g transform="translate(40 40) scale(.98) translate(-32 -32)">'+facePaths('#6d5620','#ff8fa6','#b5485f',2.7)+'</g></svg>';
    var pts=[[8,22],[20,28],[32,26],[42,34],[40,46],[60,48],[64,32]], line=pts.map(function(p){ return p[0]+','+p[1]; }).join(' '), c='';
    pts.forEach(function(p){ c+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.2" fill="#fff"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="4.6" fill="#5ee0d6" opacity=".25"/>'; });
    var cons='<svg viewBox="0 0 72 60"><polyline points="'+line+'" fill="none" stroke="#5ee0d6" stroke-width=".9" opacity=".8"/><line x1="42" y1="34" x2="64" y2="32" stroke="#5ee0d6" stroke-width=".9" opacity=".8"/>'+c+'</svg>';
    var mount='<svg viewBox="0 0 340 90" preserveAspectRatio="none"><path d="M0,90 L0,40 L26,26 L52,44 L84,20 L118,46 L150,30 L190,48 L226,22 L262,46 L296,28 L340,42 L340,90Z" fill="#17123f"/><path d="M0,90 L0,56 L40,48 L78,60 L120,50 L170,64 L214,52 L256,62 L300,50 L340,58 L340,90Z" fill="#0d0a2a"/><rect y="78" width="340" height="12" fill="#08071c"/></svg>';
    var dome='<svg viewBox="0 0 80 64"><path d="M6,64 L6,48 L74,48 L74,64Z" fill="#1d1a4d" stroke="#7d78d0" stroke-width=".8"/><rect x="26" y="53" width="5" height="5" fill="#ffd86b"/><rect x="43" y="53" width="5" height="5" fill="#ffd86b" opacity=".85"/><rect x="12" y="53" width="5" height="5" fill="#ffd86b" opacity=".7"/>'+
      '<path d="M10,48 A30,30 0 0 1 70,48Z" fill="#26225f" stroke="#9a95e6" stroke-width=".9"/><path d="M37,48 L34,19 A30,30 0 0 1 49,21 L49,48Z" fill="#0a0825"/><rect x="34" y="14" width="13" height="3.6" rx="1" fill="#d4d1f6" transform="rotate(-34 40 16)"/>'+
      '<path d="M44,12 L76,-40 L30,-34Z" fill="#5ee0d6" opacity=".14"/></svg>';
    var trees='<svg viewBox="0 0 90 46"><g fill="#070618"><path d="M12,46 L4,46 L12,18 L20,46Z"/><path d="M34,46 L24,46 L34,10 L44,46Z"/><path d="M60,46 L52,46 L60,22 L68,46Z"/></g></svg>';
    return [el('dc-const',cons),el('dc-moon',moon),el('dc-mount',mount),el('dc-dome',dome),el('dc-trees',trees)];
  },
  sea:function(){
    var W=340,H=100;
    var band='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fdcea"/><stop offset="1" stop-color="#1f86b5"/></linearGradient>'+
      '<linearGradient id="sd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e8bd"/><stop offset="1" stop-color="#ecd49a"/></linearGradient></defs>'+
      '<rect width="'+W+'" height="'+H+'" fill="url(#sg)"/>'+wave(W,H,16,2.5,'#ffffff','opacity=".16"',30)+wave(W,H,30,3.5,'#37a6cf','',38)+wave(W,H,42,4,'#58bfd9','',46)+
      wave(W,H,52,4.5,'#ffffff','opacity=".92"',42)+wave(W,H,57,3,'url(#sd)','',56)+'<path d="M0,70 Q60,66 120,71 T240,70 T340,71 L340,'+H+' L0,'+H+' Z" fill="#e7cf95" opacity=".55"/></svg>';
    var sun='<svg viewBox="0 0 90 90"><defs><radialGradient id="sn"><stop offset="0" stop-color="#fffbe0" stop-opacity=".95"/><stop offset="1" stop-color="#fff4b8" stop-opacity="0"/></radialGradient></defs><circle cx="45" cy="45" r="44" fill="url(#sn)"/><circle cx="45" cy="45" r="15" fill="#fff6c2"/></svg>';
    var cl=function(x,y,k,o){ return '<g fill="#fff" opacity="'+o+'"><ellipse cx="'+x+'" cy="'+y+'" rx="'+20*k+'" ry="'+6*k+'"/><ellipse cx="'+(x-8*k)+'" cy="'+(y-4*k)+'" rx="'+9*k+'" ry="'+6*k+'"/><ellipse cx="'+(x+6*k)+'" cy="'+(y-6*k)+'" rx="'+11*k+'" ry="'+7*k+'"/></g>'; };
    var sky='<svg viewBox="0 0 200 60">'+cl(40,34,1,.9)+cl(150,22,.7,.75)+'<path d="M92,18 q4,-5 8,0 q4,-5 8,0" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M64,44 q3,-4 6,0 q3,-4 6,0" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
    var boat='<svg viewBox="0 0 40 34"><path d="M4,26 L30,26 L25,31 L9,31Z" fill="#fff"/><path d="M17,25 L17,3 L30,25Z" fill="#fff"/><path d="M15,25 L15,9 L5,25Z" fill="#ffe3b0"/></svg>';
    var shells='<svg viewBox="0 0 90 30"><g transform="translate(18 16)"><polygon points="0,-9 2.6,-3 9,-2.6 4,1.6 5.6,8 0,4.6 -5.6,8 -4,1.6 -9,-2.6 -2.6,-3" fill="#ff8a6b"/><circle r="1.6" fill="#ffd0c0"/></g><g transform="translate(66 20)"><path d="M-8,5 Q-9,-4 0,-7 Q9,-4 8,5Z" fill="#fff3ee" stroke="#e8a58e" stroke-width="1.2"/><path d="M0,5 L0,-6 M-4,5 L-5,-3 M4,5 L5,-3" stroke="#e8a58e" stroke-width="1"/></g></svg>';
    var carve='<svg viewBox="0 0 64 64"><g transform="translate(1.2 1.6)" opacity=".95">'+facePaths('#fff6dc','#f1dba3','#fff6dc',4.4,true).replace(/<ellipse[^>]*\/>/g,'')+'</g>'+facePaths('#a47c43','#e3c98f','#a47c43',3.2,true).replace(/<ellipse[^>]*\/>/g,'')+'</svg>';
    return [el('dc-sky',sky),el('dc-sun',sun),el('dc-boat',boat),el('dc-band',band),el('dc-shells',shells),el('dc-carve',carve)];
  },
  arcade:function(){
    var rnd=function(seed){ var s=seed; return function(){ s=(s*9301+49297)%233280; return s/233280; }; }(7), u=4;
    // 도시 실루엣 타일(가로로 이어 붙인다)
    var blds=[[0,28,44,'#2b1f66'],[30,22,30,'#34267a'],[54,26,58,'#2b1f66'],[82,20,34,'#34267a'],[104,30,50,'#2b1f66'],[136,22,28,'#34267a'],[160,28,60,'#2b1f66'],[190,24,38,'#34267a'],[216,30,54,'#2b1f66'],[248,22,32,'#34267a'],[272,28,60,'#2b1f66'],[302,38,44,'#34267a']], th=64, city='';
    blds.forEach(function(b){ city+='<rect x="'+b[0]+'" y="'+(th-b[2])+'" width="'+b[1]+'" height="'+b[2]+'" fill="'+b[3]+'"/>';
      for(var wy=th-b[2]+6; wy<th-6; wy+=10) for(var wx=b[0]+4; wx<b[0]+b[1]-4; wx+=8) if(rnd()<.38) city+='<rect x="'+wx+'" y="'+wy+'" width="4" height="4" fill="'+(rnd()<.7?'#ffe14a':'#ff9ccb')+'"/>'; });
    var cityUri='url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="340" height="'+th+'" shape-rendering="crispEdges">'+city+'</svg>')+'")';
    var brick='url("data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" shape-rendering="crispEdges"><rect width="24" height="16" fill="#5a3fc0"/><rect y="6" width="24" height="2" fill="#2a1a63"/><rect y="14" width="24" height="2" fill="#2a1a63"/><rect width="2" height="8" fill="#2a1a63"/><rect x="12" y="8" width="2" height="8" fill="#2a1a63"/><rect x="2" width="22" height="2" fill="#7a5df0"/><rect x="14" y="8" width="10" height="2" fill="#7a5df0"/></svg>')+'")';
    var kid=['...CCCC...','..CCCCCCC.','..HHSSSH..','..HSESES..','..HSSSSS..','...SSMS...','..BBBBBB..','.SBBBBBBS.','.SBKKKKBS.','..BBBBBB..','..PP..PP..','..PP..PP..'];
    var kp={C:'#ff4fa3',H:'#3b2a1a',S:'#ffcf9f',E:'#111111',M:'#c45a5a',B:'#39d5ff',K:'#ffe14a',P:'#2a2a8e'};
    var kidSvg='<svg viewBox="0 0 40 48" shape-rendering="crispEdges">'+sprite(kid,kp,0,0,u)+'</svg>';
    var qb=['OOOOOOOOOOO','OYYYYYYYYYO','OYBYYYYYBYO','OYYBYYYBYYO','OYBYYYYYBYO','OYYYYYYYYYO','OYBBBBBBBYO','OYYYRRRYYYO','OYYYRRRYYYO','OYYYYRYYYYO','OOOOOOOOOOO'];
    var blockSvg='<svg viewBox="0 0 44 44" shape-rendering="crispEdges">'+sprite(qb,{O:'#a04a00',Y:'#ffb000',B:'#4a2200',R:'#ff5c8a'},0,0,u)+'</svg>';
    var coin=['..YY..','.YWYY.','YWYYYY','YWYYYY','.YYYY.','..YY..'], cp={Y:'#ffd21f',W:'#fff6a8'};
    var coins='<svg viewBox="0 0 96 24" shape-rendering="crispEdges">'+sprite(coin,cp,0,0,4)+sprite(coin,cp,36,0,4)+sprite(coin,cp,72,0,4)+'</svg>';
    var heart=['.RR.RR.','RRRRRRR','RRRRRRR','.RRRRR.','..RRR..','...R...'];
    var hearts='<svg viewBox="0 0 72 18" shape-rendering="crispEdges">'+[0,1,2].map(function(i){ return sprite(heart,{R:'#ff3b6b'},i*24+2,0,3); }).join('')+'</svg>';
    var hud=document.createElement('div'); hud.className='dc-hud'; hud.setAttribute('aria-hidden','true'); hud.innerHTML='<span>1UP 001700</span><span class="hi">HI 099999</span><span class="hp">'+hearts+'</span>';
    var city_el=el('dc-city','',null); city_el.style.backgroundImage=cityUri;
    var ground=el('dc-ground','',null); ground.style.backgroundImage=brick;
    var moonRows=[]; var mc='';
    for(var gy=-4;gy<=4;gy++) for(var gx=-4;gx<=4;gx++) if(gx*gx+gy*gy<=12) mc+='<rect x="'+(gx*4+20)+'" y="'+(gy*4+20)+'" width="4" height="4" fill="#fff3b8"/>';
    var moon='<svg viewBox="0 0 40 40" shape-rendering="crispEdges">'+mc+'<rect x="16" y="16" width="4" height="4" fill="#e9d98d"/><rect x="24" y="24" width="4" height="4" fill="#e9d98d"/></svg>';
    return {nodes:[el('dc-moon',moon),city_el,ground,el('dc-kid',kidSvg),el('dc-coins',coins),el('dc-block',blockSvg)],hud:hud};
  }
};

function decorate(hero){
  if(!hero) return;
  Array.prototype.forEach.call(hero.querySelectorAll('.dc,.dc-hud'),function(n){ n.remove(); });
  var mk=DECOR[cur]; if(!mk) return;
  var r=mk(), nodes=Array.isArray(r)?r:r.nodes, first=hero.firstChild;
  nodes.forEach(function(n){ hero.insertBefore(n,first); });
  if(r.hud){ var top=hero.querySelector('.hero-top'); if(top) top.insertBefore(r.hud,top.firstChild); }
}

apply(cur,false);
window.Skins={
  list:function(){ return SKINS.slice(); },
  current:function(){ return cur; },
  fixedTheme:fixedTheme,
  applyTheme:applyTheme,
  set:function(id){ apply(id,true); },
  decorate:decorate
};
})();
