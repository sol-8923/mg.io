/* 공유용 이미지 카드 만들기 (대시보드 · 월간 일정)
 * 캔버스에 직접 그려서 PNG로 만든다. 서버·외부 라이브러리 없이 이 기기 안에서만 처리한다.
 * 사용: MGShare.dashboard(data) / MGShare.schedule(data)  → Promise<{canvas, blob, text, name}> */
(function(){
var W=1080;
var C={paper:'#f5efe3',paper2:'#ece3d2',card:'#fffdf8',ink:'#2a2622',muted:'#7b7166',line:'#e3d8c5',board:'#2b4a3d',board2:'#223d31',chalk:'#f1ede2',
  green:'#2f6b52',red:'#a8362c',brass:'#b5862e',blue:'#2a4468',wood:'#6e4a2c',wood2:'#4f331d',pink:'#f6c4cb',sky:'#bcd7f5'};
var F={serif:'"Noto Serif KR","Nanum Myeongjo",serif',sans:'Pretendard,"Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif',hand:'"Nanum Pen Script","Gaegu","Noto Serif KR",cursive'};
var DAYS=['일','월','화','수','목','금','토'];

function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function rgba(hex,a){ var n=parseInt(hex.slice(1),16); return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
function font(kind,size,weight){ return (weight||400)+' '+size+'px '+F[kind]; }
function fit(ctx,s,maxW){ s=String(s); if(ctx.measureText(s).width<=maxW) return s; while(s.length>1&&ctx.measureText(s+'…').width>maxW) s=s.slice(0,-1); return s+'…'; }
/* 글자 그리기: o = {k:'sans'|'serif'|'hand', w:굵기, c:색, a:'left|center|right', max:최대 너비, al:투명도} */
function T(ctx,s,x,y,size,o){
  o=o||{}; ctx.font=font(o.k||'sans',size,o.w); ctx.fillStyle=o.c||C.ink; ctx.textAlign=o.a||'left'; ctx.textBaseline='alphabetic';
  ctx.globalAlpha=o.al==null?1:o.al; ctx.fillText(o.max?fit(ctx,s,o.max):String(s),x,y); ctx.globalAlpha=1;
}
function pad2(n){ return (n<10?'0':'')+n; }
function key(d){ return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function pdate(k){ var p=k.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }

/* 두 번 그린다: 1차로 어떤 글자가 쓰이는지 모으고 → 글꼴을 미리 불러온 뒤 → 2차로 진짜 그림을 그린다 */
function render(draw){
  var texts=[], c1=document.createElement('canvas'); c1.width=W; c1.height=3600;
  var x1=c1.getContext('2d'), ft=x1.fillText.bind(x1);
  x1.fillText=function(t){ texts.push(String(t)); return ft.apply(null,arguments); };
  var H=Math.ceil(draw(x1));
  var specs=[font('serif',40,700),font('sans',28,400),font('sans',28,600),font('sans',28,700),font('hand',40,400)], all=texts.join('')+'가나다0123456789';
  var load=document.fonts&&document.fonts.load?Promise.all(specs.map(function(s){ return document.fonts.load(s,all).catch(function(){}); })):Promise.resolve();
  return Promise.race([load,new Promise(function(r){ setTimeout(r,4000); })]).then(function(){
    var c=document.createElement('canvas'); c.width=W; c.height=H; var x=c.getContext('2d'); draw(x); return c;
  });
}
function toBlob(canvas){ return new Promise(function(res){ canvas.toBlob(function(b){ res(b); },'image/png'); }); }
function finish(canvas,text,name){ return toBlob(canvas).then(function(blob){ return {canvas:canvas,blob:blob,text:text,name:name}; }); }

/* ── 공통 요소 ── */
function background(ctx,H){ ctx.fillStyle=C.paper; ctx.fillRect(0,0,W,H); }
function card(ctx,x,y,w,h){ ctx.save(); ctx.shadowColor='rgba(60,40,20,.10)'; ctx.shadowBlur=18; ctx.shadowOffsetY=6; rr(ctx,x,y,w,h,26); ctx.fillStyle=C.card; ctx.fill(); ctx.restore();
  rr(ctx,x,y,w,h,26); ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.stroke(); }
function board(ctx,y,h,title,sub,titleSize){
  rr(ctx,24,y,W-48,h,30); ctx.fillStyle=C.wood; ctx.fill();
  rr(ctx,24,y,W-48,h,30); ctx.strokeStyle=C.wood2; ctx.lineWidth=3; ctx.stroke();
  var g=ctx.createLinearGradient(0,y,W,y+h); g.addColorStop(0,C.board); g.addColorStop(1,C.board2);
  rr(ctx,40,y+16,W-80,h-32,18); ctx.fillStyle=g; ctx.fill();
  ctx.save(); rr(ctx,40,y+16,W-80,h-32,18); ctx.clip(); ctx.fillStyle='rgba(255,255,255,.035)';
  for(var gx=48;gx<W-40;gx+=7) for(var gy=y+24;gy<y+h-16;gy+=7) ctx.fillRect(gx,gy,1.4,1.4); ctx.restore();
  // 분필 받침대와 분필
  rr(ctx,40,y+h-34,W-80,18,6); ctx.fillStyle='#8e6340'; ctx.fill();
  [[84,'#f6f1e3'],[146,C.pink],[208,C.sky]].forEach(function(p){ rr(ctx,p[0],y+h-44,44,11,4); ctx.fillStyle=p[1]; ctx.fill(); });
  T(ctx,'MINGYEOM · STUDY ROOM',84,y+66,22,{w:600,c:C.chalk,al:.6});
  T(ctx,title,84,y+66+(titleSize||64)+10,titleSize||64,{k:'serif',w:700,c:'#fbf8ef'});
  T(ctx,sub,84,y+66+(titleSize||64)+56,28,{c:C.chalk,al:.82,max:W-300});
  T(ctx,'겪어나가는 모든 것이 공부다',W-84,y+h-62,40,{k:'hand',c:C.pink,a:'right'});
}
function footer(ctx,y,label){ T(ctx,'민겸이 공부 공간 · '+label,W/2,y+36,24,{c:C.muted,a:'center'}); return y+72; }
function chip(ctx,rightX,cy,label,color){
  ctx.font=font('sans',22,700); var w=Math.ceil(ctx.measureText(label).width)+28, x=rightX-w;
  rr(ctx,x,cy-17,w,34,17); ctx.fillStyle=rgba(color,.15); ctx.fill(); T(ctx,label,x+14,cy+8,22,{w:700,c:color}); return w;
}

/* ═════════ 공부 기록 카드 ═════════
 * data = { scope, today, kpis:[{l,v,s}], trend:[{y,label}], weak:[{l,acc,n,ok}], strong:[...] } */
var MGShare_dashboard=function(d){
  var name='민겸이-공부기록-'+d.todayKey+'.png';
  var text=['민겸이 공부 기록 ('+d.scope+')'].concat(d.kpis.map(function(k){ return k.l+' '+k.v+(k.s?' · '+k.s:''); }),
    d.weak.length?['다시 볼 개념: '+d.weak.map(function(c){ return c.l+' '+Math.round(c.acc*100)+'%'; }).join(', ')]:[],
    d.strong.length?['잘하는 개념: '+d.strong.map(function(c){ return c.l+' '+Math.round(c.acc*100)+'%'; }).join(', ')]:[],['민겸이 공부 공간']).join('\n');
  return render(function(ctx){
    background(ctx,3600);
    var y=24; board(ctx,y,262,'민겸이 공부 기록',d.scope+' · '+d.today); y+=262+30;
    // KPI 3×2
    var gap=22, cw=Math.floor((W-80-gap*2)/3), ch=156;
    d.kpis.slice(0,6).forEach(function(k,i){
      var x=40+(i%3)*(cw+gap), yy=y+Math.floor(i/3)*(ch+gap);
      card(ctx,x,yy,cw,ch);
      T(ctx,k.l,x+26,yy+46,25,{w:600,c:C.muted});
      T(ctx,k.v,x+26,yy+104,56,{k:'serif',w:700,c:C.ink,max:cw-40});
      if(k.s) T(ctx,k.s,x+26,yy+138,22,{c:C.muted,max:cw-40});
    });
    y+=2*ch+gap+30;
    // 점수 추이
    var th=420; card(ctx,40,y,W-80,th);
    T(ctx,'점수 추이',72,y+62,34,{k:'serif',w:700});
    T(ctx,d.trend.length?'최근 '+d.trend.length+'회 · 100점 환산':'아직 기록이 없어요',W-72,y+60,22,{c:C.muted,a:'right'});
    var cx0=130,cx1=W-100,cy0=y+120,cy1=y+th-70;
    [0,50,100].forEach(function(v){ var yy=cy1-(v/100)*(cy1-cy0); ctx.strokeStyle=C.line; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cx0,yy); ctx.lineTo(cx1,yy); ctx.stroke(); T(ctx,String(v),cx0-18,yy+8,22,{c:C.muted,a:'right'}); });
    var n=d.trend.length, X=function(i){ return n<2?(cx0+cx1)/2:cx0+i*(cx1-cx0)/(n-1); }, Y=function(v){ return cy1-(v/100)*(cy1-cy0); };
    if(n>1){ ctx.strokeStyle=C.green; ctx.lineWidth=6; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.beginPath(); d.trend.forEach(function(p,i){ if(i) ctx.lineTo(X(i),Y(p.y)); else ctx.moveTo(X(i),Y(p.y)); }); ctx.stroke(); }
    d.trend.forEach(function(p,i){ ctx.beginPath(); ctx.arc(X(i),Y(p.y),i===n-1?11:8,0,Math.PI*2); ctx.fillStyle=i===n-1?C.green:C.card; ctx.fill(); ctx.lineWidth=5; ctx.strokeStyle=C.green; ctx.stroke(); });
    if(n){ var lp=d.trend[n-1]; T(ctx,lp.y+'점',Math.min(X(n-1),W-130),Y(lp.y)-26,28,{w:700,c:C.green,a:n<2?'center':'right'});
      T(ctx,d.trend[0].label,X(0),cy1+46,22,{c:C.muted,a:n<2?'center':'left'}); if(n>1) T(ctx,lp.label,X(n-1),cy1+46,22,{c:C.muted,a:'right'}); }
    y+=th+30;
    // 개념
    function conceptCard(title,list,color,emptyMsg){
      var rows=Math.max(list.length,1), h=100+rows*66; card(ctx,40,y,W-80,h);
      T(ctx,title,72,y+64,34,{k:'serif',w:700});
      if(!list.length) T(ctx,emptyMsg,72,y+124,26,{c:C.muted});
      list.forEach(function(c,i){
        var yy=y+104+i*66;
        T(ctx,c.l,72,yy+30,27,{w:600,max:300});
        rr(ctx,400,yy+10,430,22,11); ctx.fillStyle=C.paper2; ctx.fill();
        var bw=Math.max(22,Math.round(430*c.acc)); rr(ctx,400,yy+10,bw,22,11); ctx.fillStyle=color; ctx.fill();
        T(ctx,Math.round(c.acc*100)+'%',W-72,yy+31,28,{w:700,c:color,a:'right'});
        T(ctx,c.ok+'/'+c.n,W-172,yy+30,22,{c:C.muted,a:'right'});
      });
      y+=h+30;
    }
    conceptCard('다시 볼 개념',d.weak,C.red,'2문항 이상 푼 개념이 아직 없어요');
    conceptCard('잘하는 개념',d.strong,C.green,'2문항 이상 푼 개념이 아직 없어요');
    return footer(ctx,y-6,d.todayLabel)+8;
  }).then(function(c){ return finish(c,text,name); });
};

/* ═════════ 월간 일정 카드 ═════════
 * data = { year, month(1~12), todayKey, todayLabel, events:[{date,time,text,who}], todos:[{text,due,who}], holidays:{'YYYY-MM-DD':이름}, who:{key:{label,c}} } */
var MGShare_schedule=function(d){
  var y0=d.year, m0=d.month, first=new Date(y0,m0-1,1), nDays=new Date(y0,m0,0).getDate(), lead=first.getDay();
  var weeks=Math.ceil((lead+nDays)/7), mk=y0+'-'+pad2(m0)+'-';
  var WHO=d.who, hol=function(k){ return (d.holidays||{})[k]||''; };
  var ev={}; d.events.forEach(function(e){ if(e.date.indexOf(mk)===0) (ev[e.date]=ev[e.date]||[]).push(e); });
  Object.keys(ev).forEach(function(k){ ev[k].sort(function(a,b){ return (a.time||'99')<(b.time||'99')?-1:1; }); });
  var rows=[]; // 이번 달 일정 목록 (공휴일 포함)
  for(var i=1;i<=nDays;i++){ var k=mk+pad2(i), h=hol(k), es=ev[k]||[];
    if(h) rows.push({k:k,day:i,text:h,hol:true});
    es.forEach(function(e){ rows.push({k:k,day:i,text:e.text,time:e.time,who:e.who}); }); }
  var todos=d.todos.slice().sort(function(a,b){ var x=a.due||'9999',z=b.due||'9999'; return x<z?-1:x>z?1:0; });
  var name='민겸이네-일정-'+y0+'-'+pad2(m0)+'.png';
  var line=function(r){ var dd=pdate(r.k); return (dd.getMonth()+1)+'/'+dd.getDate()+'('+DAYS[dd.getDay()]+') '+(r.time?r.time+' ':'')+r.text+(r.who&&WHO[r.who]?' ['+WHO[r.who].label+']':''); };
  var text=[y0+'년 '+m0+'월 우리 집 일정'].concat(rows.length?rows.map(line):['(적힌 일정이 없어요)'],
    todos.length?['','해야 할 일'].concat(todos.map(function(t){ return '- '+t.text+(t.due?' ('+(+t.due.slice(5,7))+'/'+(+t.due.slice(8))+'까지)':'')+(t.who&&WHO[t.who]?' ['+WHO[t.who].label+']':''); })):[],['','민겸이 공부 공간']).join('\n');
  return render(function(ctx){
    background(ctx,3600);
    var y=24; board(ctx,y,262,y0+'년 '+m0+'월','우리 집 일정',70); y+=262+30;
    // 달력
    var gap=6, cw=Math.floor((W-80-40-gap*6)/7), ch=150, hh=60, calH=24+hh+weeks*(ch+gap)+14;
    card(ctx,40,y,W-80,calH);
    var gx0=60, gy0=y+24;
    DAYS.forEach(function(t,i){ T(ctx,t,gx0+i*(cw+gap)+cw/2,gy0+40,26,{w:700,c:i===0?C.red:i===6?C.blue:C.muted,a:'center'}); });
    for(var dd=1;dd<=nDays;dd++){
      var pos=lead+dd-1, col=pos%7, row=Math.floor(pos/7), x=gx0+col*(cw+gap), yy=gy0+hh+row*(ch+gap), k=mk+pad2(dd), h=hol(k), es=ev[k]||[];
      rr(ctx,x,yy,cw,ch,16); ctx.fillStyle=h?'#f3dfda':C.paper; ctx.fill();
      if(k===d.todayKey){ rr(ctx,x+2,yy+2,cw-4,ch-4,14); ctx.strokeStyle=C.green; ctx.lineWidth=4; ctx.stroke(); }
      var red=h||col===0, dc=red?C.red:col===6?C.blue:C.ink;
      T(ctx,String(dd),x+14,yy+38,30,{k:'serif',w:700,c:dc});
      if(h) T(ctx,h.replace(/^대체공휴일 \((.+)\)$/,'$1 대체'),x+14+(dd>9?42:26),yy+36,17,{w:700,c:C.red,max:cw-(dd>9?58:42)});
      var show=es.length>3?2:es.length, cy=yy+54;
      for(var j=0;j<show;j++){
        var col2=(WHO[es[j].who]||{c:C.brass}).c;
        rr(ctx,x+8,cy,cw-16,28,8); ctx.fillStyle=rgba(col2,.17); ctx.fill();
        rr(ctx,x+8,cy,5,28,2.5); ctx.fillStyle=col2; ctx.fill();
        T(ctx,es[j].text,x+20,cy+21,18,{w:600,c:C.ink,max:cw-34}); cy+=33;
      }
      if(es.length>3) T(ctx,'+'+(es.length-2)+'개 더',x+14,cy+22,18,{w:700,c:C.muted});
    }
    y+=calH+30;
    // 범례
    var lx=64; Object.keys(WHO).forEach(function(w){ ctx.beginPath(); ctx.arc(lx+8,y+14,8,0,Math.PI*2); ctx.fillStyle=WHO[w].c; ctx.fill(); T(ctx,WHO[w].label,lx+26,y+22,22,{c:C.muted}); lx+=26+ctx.measureText(WHO[w].label).width+30; });
    rr(ctx,lx,y+6,16,16,4); ctx.fillStyle=C.red; ctx.fill(); T(ctx,'공휴일',lx+26,y+22,22,{c:C.muted});
    y+=60;
    // 이번 달 일정 목록
    var LIM=12, shown=rows.slice(0,LIM), extra=rows.length-shown.length, rh=70;
    var lh=104+Math.max(shown.length,1)*rh+(extra>0?50:0)+10; card(ctx,40,y,W-80,lh);
    T(ctx,'이번 달 일정',72,y+66,34,{k:'serif',w:700});
    if(!shown.length) T(ctx,'이번 달에 적힌 일정이 없어요',72,y+138,26,{c:C.muted});
    shown.forEach(function(r,i){
      var yy=y+92+i*rh, dd2=pdate(r.k), cyy=yy+34;
      if(i) { ctx.strokeStyle=C.line; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(72,yy); ctx.lineTo(W-72,yy); ctx.stroke(); }
      T(ctx,dd2.getDate()+'일 ('+DAYS[dd2.getDay()]+')',72,cyy+10,28,{w:700,c:r.hol||dd2.getDay()===0?C.red:dd2.getDay()===6?C.blue:C.ink});
      var tx=250; if(r.time){ T(ctx,r.time,tx,cyy+9,24,{w:600,c:C.muted}); tx+=84; }
      var right=r.hol?chip(ctx,W-72,cyy,'공휴일',C.red):(r.who&&WHO[r.who]?chip(ctx,W-72,cyy,WHO[r.who].label,WHO[r.who].c):0);
      T(ctx,r.text,tx,cyy+10,28,{w:600,c:r.hol?C.red:C.ink,max:W-72-right-20-tx});
    });
    if(extra>0) T(ctx,'외 '+extra+'개 더 있어요',W/2,y+92+shown.length*rh+36,24,{c:C.muted,a:'center'});
    y+=lh+30;
    // 해야 할 일
    if(todos.length){
      var TL=8, ts=todos.slice(0,TL), tex=todos.length-ts.length, trh=70, th2=104+ts.length*trh+(tex>0?50:0)+10;
      card(ctx,40,y,W-80,th2); T(ctx,'해야 할 일',72,y+66,34,{k:'serif',w:700});
      ts.forEach(function(t,i){
        var yy=y+92+i*trh, cyy=yy+34;
        if(i){ ctx.strokeStyle=C.line; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(72,yy); ctx.lineTo(W-72,yy); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(90,cyy,13,0,Math.PI*2); ctx.lineWidth=4; ctx.strokeStyle=C.green; ctx.stroke();
        var right=t.who&&WHO[t.who]?chip(ctx,W-72,cyy,WHO[t.who].label,WHO[t.who].c):0, dueW=0;
        if(t.due){ var dl=(+t.due.slice(5,7))+'/'+(+t.due.slice(8))+'까지'; ctx.font=font('sans',23,600); dueW=ctx.measureText(dl).width+18; T(ctx,dl,W-72-right-14,cyy+9,23,{w:600,c:t.due<d.todayKey?C.red:C.muted,a:'right'}); }
        T(ctx,t.text,124,cyy+10,28,{w:600,max:W-72-right-dueW-30-124});
      });
      if(tex>0) T(ctx,'외 '+tex+'개 더 있어요',W/2,y+92+ts.length*trh+36,24,{c:C.muted,a:'center'});
      y+=th2+30;
    }
    return footer(ctx,y-6,d.todayLabel)+8;
  }).then(function(c){ return finish(c,text,name); });
};

window.MGShare={ dashboard:MGShare_dashboard, schedule:MGShare_schedule };
})();
