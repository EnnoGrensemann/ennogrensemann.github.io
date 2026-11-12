
'use strict';
var LS_XML='gesetze-xml-v1', LS_MERK='gesetze-merkliste-v1';
var BUNDLED_XML_MANIFEST='./bin/manifest.json';
var state={laws:[],merk:[],view:'all',query:'',activeLaws:{}};
var selectedParaKey=null;
var xmlCache={};

/* ---------- Text-Helfer ---------- */
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function escReg(s){return s.replace(/[.*+?^${}()$|\[\]\\]/g,'\\$&');}
function compact(s){return String(s).toLowerCase().replace(/[\s§\-–.,():]/g,'');}
function tokens(q){return String(q).toLowerCase().split(/\s+/).filter(function(t){return t.length>0;});}
function matches(p,q){
  var ts=tokens(q); if(!ts.length) return true;
  var e=compact(p.enbez), ti=(p.titel||'').toLowerCase(), tx=p.text.toLowerCase();
  return ts.every(function(t){
    var tc=compact(t);
    return e.indexOf(tc)>-1 || ti.indexOf(t)>-1 || tx.indexOf(t)>-1;
  });
}
function titleHit(p,q){
  var ti=(p.titel||'').toLowerCase();
  return tokens(q).some(function(t){return ti.indexOf(t)>-1;});
}
function hl(text,q){
  var e=esc(text), ts=tokens(q);
  ts.forEach(function(t){
    var te=esc(t);
    if(te){ e=e.replace(new RegExp('('+escReg(te)+')','gi'),'<mark>$1</mark>'); }
  });
  return e;
}
function hlHTML(html,q){
  var ts=tokens(q);
  if(!ts.length || !html) return html;
  var parts=html.split(/(<[^>]+>)/g);
  for(var i=0;i<parts.length;i++){
    if(parts[i].charAt(0)==='<') continue;
    var seg=parts[i];
    ts.forEach(function(t){
      var te=esc(t);
      if(te){ seg=seg.replace(new RegExp('('+escReg(te)+')','gi'),'<mark>$1</mark>'); }
    });
    parts[i]=seg;
  }
  return parts.join('');
}

/* ---------- XML -> Plain Text ---------- */
function ser(node){
  var out='';
  for(var i=0;i<node.childNodes.length;i++){
    var c=node.childNodes[i];
    if(c.nodeType===3){ var t=c.nodeValue.replace(/\s+/g,' '); if(t.trim()) out+=t; }
    else if(c.nodeType===1){
      var tag=c.tagName.toLowerCase();
      if(tag==='noindex'||tag==='table'||tag==='tgroup'||tag==='colspec'||tag==='tbody'||tag==='row'||tag==='entry'){continue;}
      if(tag==='br'){out+='\n';continue;}
      if(tag==='p'){out+='\n'+ser(c)+'\n';continue;}
      if(tag==='dl'){
        var dt='';
        for(var j=0;j<c.childNodes.length;j++){
          var d=c.childNodes[j];
          if(d.nodeType!==1) continue;
          var tg=d.tagName.toLowerCase();
          if(tg==='dt'){dt=(d.textContent||'').replace(/\s+/g,' ').trim();}
          else if(tg==='dd'){var dd=ser(d).trim(); if(dd){out+='\n'+(dt?dt+' ':'')+dd+'\n';}}
        }
        continue;
      }
      out+=ser(c);
    }
  }
  return out;
}
function cleanText(s){return s.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function serHTML(node){
  var out='';
  for(var i=0;i<node.childNodes.length;i++){
    var c=node.childNodes[i];
    if(c.nodeType===3){
      var t=c.nodeValue.replace(/\s+/g,' ');
      if(t.trim()) out+=esc(t);
    }
    else if(c.nodeType===1){
      var tag=c.tagName.toLowerCase();
      if(tag==='noindex'||tag==='table'||tag==='tgroup'||tag==='colspec'||tag==='tbody'||tag==='row'||tag==='entry'){continue;}
      if(tag==='br'){out+='<br>';continue;}
      if(tag==='p'){
        var inner=serHTML(c).trim();
        if(inner) out+='<div class="abs">'+inner+'</div>';
        continue;
      }
      if(tag==='dl'){
        out+='<ol class="liste">';
        for(var j=0;j<c.childNodes.length;j++){
          var d=c.childNodes[j];
          if(d.nodeType!==1) continue;
          var tg=d.tagName.toLowerCase();
          if(tg==='dt'){
            var dtText=(d.textContent||'').replace(/\s+/g,' ').trim();
            out+='<li><span class="num">'+esc(dtText)+'</span> ';
          }
          else if(tg==='dd'){ out+=serHTML(d).trim()+'</li>'; }
        }
        out+='</ol>';
        continue;
      }
      out+=serHTML(c);
    }
  }
  return out;
}
function child(el,tag){
  if(!el||!el.children) return null;
  tag=tag.toLowerCase();
  for(var i=0;i<el.children.length;i++){
    if(el.children[i].tagName.toLowerCase()===tag) return el.children[i];
  }
  return null;
}
function parseNorms(xmlText){
  var doc=new DOMParser().parseFromString(xmlText,'text/xml');
  if(doc.getElementsByTagName('parsererror').length){throw new Error('Ungültiges XML');}
  var root=doc.documentElement, paras=[], toc=[], teil='', abschnitt='';
  var norms=root.children;
  for(var i=0;i<norms.length;i++){
    var n=norms[i];
    if(n.tagName.toLowerCase()!=='norm') continue;
    var md=child(n,'metadaten'); if(!md) continue;
    var g=child(md,'gliederungseinheit');
    if(g){
      var kenn=((child(g,'gliederungskennzahl')||{}).textContent||'').trim();
      var bez=((child(g,'gliederungsbez')||{}).textContent||'').trim();
      var gtit=((child(g,'gliederungstitel')||{}).textContent||'').replace(/\s+/g,' ').trim();
      if(kenn.replace(/\s/g,'').length<=3){ teil=(bez+' '+gtit).replace(/\s+/g,' ').trim(); abschnitt=''; toc.push({type:'teil',label:teil}); }
      else { abschnitt=gtit; toc.push({type:'abschnitt',label:gtit,teil:teil}); }
      continue;
    }
    var enbezEl=child(md,'enbez');
    var enbez=enbezEl?enbezEl.textContent.replace(/\s+/g,' ').trim():'';
    if(enbez.charAt(0)!=='§') continue;
    var titEl=child(md,'titel');
    var titel=titEl?titEl.textContent.replace(/\s+/g,' ').trim():'';
    var td=child(n,'textdaten');
    var tx=td?child(td,'text'):null;
    var content=tx?child(tx,'Content'):null;
    var text=content?cleanText(ser(content)):'';
    var html=content?serHTML(content):'';
    var p={doknr:n.getAttribute('doknr')||('p'+i),enbez:enbez,titel:titel,text:text,html:html,teil:teil,abschnitt:abschnitt};
    paras.push(p); toc.push({type:'para',ref:p});
  }
  return {paras:paras,toc:toc};
}

/* ---------- Gesetze verwalten ---------- */
function paraKey(p){return p.lawId+'|'+p.doknr;}
function elId(key){return 'p-'+key.replace(/[^a-z0-9]/gi,'_');}
function buildLaw(xmlText,fileName){
  var m=xmlText.match(/<jurabk>([^<]+)<\/jurabk>/i);
  var name=(m?m[1].trim():fileName.replace(/\.xml$/i,''));
  var r=parseNorms(xmlText);
  var id='law-'+fileName;
  r.paras.forEach(function(p){p.lawId=id;p.lawName=name;});
  return {id:id,name:name,file:fileName,paras:r.paras,toc:r.toc};
}
function addLawsFromTexts(list){ /* list: [{name, text}] */
  var added=0;
  list.forEach(function(item){
    try{
      var law=buildLaw(item.text,item.name);
      xmlCache[item.name]=item.text;
      var idx=-1;
      for(var i=0;i<state.laws.length;i++){ if(state.laws[i].file===item.name){idx=i;break;} }
      if(idx>-1) state.laws[idx]=law; else state.laws.push(law);
      state.activeLaws[law.id]=true;
      added++;
    }catch(e){ console.warn('Übersprungen: '+item.name, e); }
  });
  try{localStorage.setItem(LS_XML,JSON.stringify(xmlCache));}catch(e){}
  if(added) toast(added+' Gesetz(e) geladen – '+totalParas()+' Paragraphen gesamt');
  state.laws.sort(function(a,b){return a.name.localeCompare(b.name);});
  refreshChips(); renderList(); updateTabs();
}
function totalParas(){ return state.laws.reduce(function(s,l){return s+l.paras.length;},0); }
function activeParas(){
  var out=[];
  state.laws.forEach(function(l){ if(state.activeLaws[l.id]!==false) out=out.concat(l.paras); });
  return out;
}
function saveCache(){ try{localStorage.setItem(LS_XML,JSON.stringify(xmlCache));}catch(e){} }
function loadCache(){
  try{ xmlCache=JSON.parse(localStorage.getItem(LS_XML)||'{}')||{}; }catch(e){ xmlCache={}; }
  var list=Object.keys(xmlCache).map(function(k){return {name:k,text:xmlCache[k]};});
  if(list.length){
    list.forEach(function(item){
      try{
        var law=buildLaw(item.text,item.name);
        state.laws.push(law); state.activeLaws[law.id]=true;
      }catch(e){}
    });
  }
}

async function loadBundledXML(){
  try{
    var response=await fetch(BUNDLED_XML_MANIFEST,{cache:'no-cache'});
    if(!response.ok) throw new Error('Manifest konnte nicht geladen werden: '+response.status);
    var files=await response.json();
    if(!Array.isArray(files)) throw new Error('Ungültiges XML-Manifest');
    var results=await Promise.all(files.filter(function(name){return typeof name==='string'&&/\.xml$/i.test(name);}).map(async function(name){
      try{
        var fileResponse=await fetch('./bin/'+encodeURIComponent(name),{cache:'no-cache'});
        if(!fileResponse.ok) throw new Error('HTTP '+fileResponse.status);
        return {name:name,text:await fileResponse.text()};
      }catch(e){
        console.warn('XML-Datei konnte nicht geladen werden: '+name,e);
        return null;
      }
    }));
    var list=results.filter(Boolean);
    if(!list.length){toast('Keine XML-Dateien aus ./bin geladen');return;}
    addLawsFromTexts(list);
  }catch(e){
    console.warn('XML-Dateien aus ./bin konnten nicht geladen werden',e);
    toast('XML-Dateien aus ./bin konnten nicht geladen werden');
  }
}

/* ---------- Icons ---------- */
var SVG={
  star:'<svg viewBox="0 0 24 24"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
  starBorder:'<svg viewBox="0 0 24 24"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/></svg>',
  chevron:'<svg viewBox="0 0 24 24"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>'
};
function starSVG(on){return on?SVG.star:SVG.starBorder;}
function headOf(p){return p.titel?p.enbez+' – '+p.titel:p.enbez;}

/* ---------- Rendering ---------- */
function cardHTML(p,q){
  var key=paraKey(p);
  var starred=state.merk.indexOf(key)>-1;
  var selected=selectedParaKey===key;
  var sec=p.abschnitt||p.teil||p.lawName;
  return '<article class="res'+(selected?' selected open':'')+'" id="'+elId(key)+'">'
    +'<div class="src"><span class="fav">§</span><span class="lawtag">'+esc(p.lawName)+'</span><span>· '+esc(sec)+'</span></div>'
    +'<div class="trow">'
    +'<button class="toggle" data-toggle="'+key+'" aria-expanded="'+selected+'" title="'+(selected?'Inhalt schließen':'Inhalt anzeigen')+'">'+SVG.chevron+'</button>'
    +'<h3 class="ttl"><a href="#" data-toggle="'+key+'">'+hl(headOf(p),q)+'</a></h3>'
    +'<div class="acts">'
    +'<button class="ib copy" data-copy="'+key+'" title="Paragraph kopieren">'+SVG.copy+'</button>'
    +'<button class="ib star'+(starred?' on':'')+'" data-star="'+key+'" title="'+(starred?'Von Merkliste entfernen':'Auf Merkliste')+'">'+starSVG(starred)+'</button>'
    +'</div></div>'
    +'<div class="body">'+hlHTML(p.html,q)+'</div>'
    +'</article>';
}
function renderList(){
  var listEl=document.getElementById('list'); if(!listEl) return;
  var q=state.query.trim();
  var base=(state.view==='merk')?activeParas().filter(function(p){return state.merk.indexOf(paraKey(p))>-1;}):activeParas();
  var shown=base.filter(function(p){return matches(p,q);});
  if(q){
    shown=shown.slice().sort(function(a,b){
      return (titleHit(a,q)?0:1)-(titleHit(b,q)?0:1);
    });
  }
  if(selectedParaKey&&!shown.some(function(p){return paraKey(p)===selectedParaKey;})) selectedParaKey=null;
  var html;
  if(state.view==='merk'&&!state.merk.length){
    html='<div class="empty"><div class="empty-t">Noch keine Merkliste</div><div class="empty-s">Tippe auf den Stern bei einem Paragraphen, um ihn hier zu sammeln.</div></div>';
  } else if(!base.length){
    html='<div class="empty"><div class="empty-t">Keine Gesetze ausgewählt</div><div class="empty-s">Aktiviere auf der Startseite mindestens ein Gesetz.</div></div>';
  } else if(!shown.length){
    html='<div class="empty"><div class="empty-t">Keine Ergebnisse</div><div class="empty-s">Versuche z. B. „§ 87“, „Betriebsänderung“ oder „Kündigungsschutz“.</div></div>';
  } else {
    html=shown.map(function(p){return cardHTML(p,q);}).join('');
  }
  listEl.innerHTML=html;
  var c=document.getElementById('count');
  if(c) c.textContent=shown.length+' von '+base.length+' Paragraphen'+(q?' · „'+q+'“':'');
  var mc=document.getElementById('merkcount'); if(mc) mc.textContent=state.merk.length;
  renderDetail();
}
function renderDetail(){
  var panel=document.getElementById('detail');
  var layout=document.querySelector('.content-layout');
  var p=selectedParaKey?findPara(selectedParaKey):null;
  if(!panel||!layout) return;
  if(!p){panel.innerHTML='';layout.classList.remove('has-detail');return;}
  layout.classList.add('has-detail');
  var q=state.query.trim();
  var sec=p.abschnitt||p.teil||p.lawName;
  panel.innerHTML='<article class="detail-content">'
    +'<div class="src"><span class="fav">§</span><span class="lawtag">'+esc(p.lawName)+'</span><span>· '+esc(sec)+'</span></div>'
    +'<h2 class="detail-title">'+hl(headOf(p),q)+'</h2>'
    +'<div class="body">'+hlHTML(p.html,q)+'</div>'
    +'</article>';
}
function togglePara(key){
  selectedParaKey=selectedParaKey===key?null:key;
  renderList();
}
function refreshChips(){
  var el=document.getElementById('lawchips'); if(!el) return;
  if(!state.laws.length){ el.innerHTML=''; return; }
  el.innerHTML=state.laws.map(function(l){
    var on=state.activeLaws[l.id]!==false;
    return '<button class="chip'+(on?' active':'')+'" data-law="'+l.id+'">'+esc(l.name)+'<span class="n">'+l.paras.length+'</span></button>';
  }).join('');
}

/* ---------- Merkliste ---------- */
function loadMerk(){try{var m=JSON.parse(localStorage.getItem(LS_MERK)||'[]');state.merk=Array.isArray(m)?m:[];}catch(e){state.merk=[];}}
function saveMerk(){try{localStorage.setItem(LS_MERK,JSON.stringify(state.merk));}catch(e){}}
function updateTabs(){
  var tabs=document.querySelectorAll('.tab');
  for(var i=0;i<tabs.length;i++){tabs[i].classList.toggle('active',tabs[i].getAttribute('data-view')===state.view);}
  var mc=document.getElementById('merkcount'); if(mc) mc.textContent=state.merk.length;
}
function toggleStar(key){
  var i=state.merk.indexOf(key);
  if(i>-1){state.merk.splice(i,1);}else{state.merk.push(key);}
  saveMerk(); renderList(); updateTabs();
}

/* ---------- Navigation ---------- */
function findPara(key){
  var parts=key.split('|');
  for(var i=0;i<state.laws.length;i++){
    if(state.laws[i].id!==parts[0]) continue;
    for(var j=0;j<state.laws[i].paras.length;j++){
      if(state.laws[i].paras[j].doknr===parts[1]) return state.laws[i].paras[j];
    }
  }
  return null;
}
function startSearch(){
  var q2=document.getElementById('q2');
  state.query=q2?q2.value:'';
  var q=document.getElementById('q'); if(q) q.value=state.query;
  document.getElementById('landing').classList.add('is-hidden');
  document.getElementById('app').classList.add('is-visible');
  renderList(); updateTabs();
  window.scrollTo({top:0});
}
function showLanding(){
  var q=document.getElementById('q'), q2=document.getElementById('q2');
  if(q&&q2) q2.value=q.value;
  document.getElementById('app').classList.remove('is-visible');
  document.getElementById('landing').classList.remove('is-hidden');
  refreshChips();
}
/* ---------- Kopieren / Toast ---------- */
function copyText(t){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast('In die Zwischenablage kopiert');},function(){fallbackCopy(t);});}
  else fallbackCopy(t);
}
function fallbackCopy(t){var ta=document.createElement('textarea');ta.value=t;ta.className='copy-buffer';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('In die Zwischenablage kopiert');}catch(e){toast('Kopieren nicht möglich');}document.body.removeChild(ta);}
function copyPara(key){var p=findPara(key);if(!p)return;copyText(p.lawName+' – '+p.enbez+(p.titel?' – '+p.titel:'')+'\n\n'+p.text);}
function exportMerk(){
  var lines=state.merk.map(function(k){var p=findPara(k);return p?(p.lawName+' – '+p.enbez+(p.titel?' – '+p.titel:'')):k;});
  copyText(lines.join('\n'));
  toast(lines.length+' Merkliste-Einträge kopiert');
}
var toastTimer=null;
function toast(msg){var t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},2200);}

/* ---------- Init ---------- */
function init(){
  loadMerk();
  loadCache();
  refreshChips();
  var q=document.getElementById('q'), q2=document.getElementById('q2');
  q.addEventListener('input',function(){state.query=q.value;q2.value=q.value;renderList();window.scrollTo({top:0,behavior:'smooth'});});
  q2.addEventListener('input',function(){q.value=q2.value;});
  q2.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); startSearch(); } });
  document.getElementById('clear').addEventListener('click',function(){q.value='';q2.value='';state.query='';renderList();q.focus();window.scrollTo({top:0,behavior:'smooth'});});
  document.addEventListener('keydown',function(e){
    if(e.key==='/'&&document.activeElement!==q&&document.activeElement!==q2){e.preventDefault();(document.getElementById('landing').classList.contains('is-hidden')?q:q2).focus();}
    if(e.key==='Escape'&&(document.activeElement===q||document.activeElement===q2)){q.value='';q2.value='';state.query='';renderList();}
  });

  document.getElementById('searchbtn').addEventListener('click',startSearch);
  document.getElementById('homebtn').addEventListener('click',showLanding);
  document.getElementById('lawchips').addEventListener('click',function(e){
    var c=e.target.closest?e.target.closest('.chip'):null;
    if(!c) return;
    var id=c.getAttribute('data-law');
    state.activeLaws[id]=(state.activeLaws[id]===false)?true:false;
    refreshChips(); renderList();
  });

  var tabs=document.querySelectorAll('.tab');
  for(var i=0;i<tabs.length;i++){tabs[i].addEventListener('click',function(){state.view=this.getAttribute('data-view');updateTabs();renderList();});}

  document.getElementById('list').addEventListener('click',function(e){
    var b=e.target.closest?e.target.closest('button'):null;
    if(b){
      if(b.hasAttribute('data-star')){toggleStar(b.getAttribute('data-star'));return;}
      if(b.hasAttribute('data-copy')){copyPara(b.getAttribute('data-copy'));return;}
      if(b.hasAttribute('data-toggle')){togglePara(b.getAttribute('data-toggle'));return;}
    }
    var a=e.target.closest?e.target.closest('a[data-toggle]'):null;
    if(a){e.preventDefault();togglePara(a.getAttribute('data-toggle'));}
  });

  window.addEventListener('dragover',function(e){e.preventDefault();});
  window.addEventListener('drop',function(e){
    e.preventDefault();
    if(!e.dataTransfer||!e.dataTransfer.files.length) return;
    var fs=e.dataTransfer.files, list=[], pending=fs.length;
    for(var i=0;i<fs.length;i++){
      (function(f){
        if(!/\.xml$/i.test(f.name)){ if(--pending===0) addLawsFromTexts(list); return; }
        var rd=new FileReader();
        rd.onload=function(){ list.push({name:f.name,text:String(rd.result)}); if(--pending===0) addLawsFromTexts(list); };
        rd.readAsText(f);
      })(fs[i]);
    }
  });
  var ex=document.getElementById('exportmerk'); if(ex) ex.addEventListener('click',exportMerk);

  if(!state.laws.length){ showLanding(); }
  else { updateTabs(); renderList(); showLanding(); }
  loadBundledXML();
}
if(typeof document!=='undefined'){document.addEventListener('DOMContentLoaded',init);}
