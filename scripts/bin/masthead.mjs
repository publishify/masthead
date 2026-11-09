// scripts/text/cli.ts
import { mkdirSync, readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { join } from "node:path";

// shared/types.ts
var GENRES = [
  "novel",
  "novella",
  "short-story",
  "flash-fiction",
  "poetry",
  "essay",
  "academic-essay",
  "academic-article",
  "academic-book",
  "memoir",
  "biography",
  "non-fiction",
  "children-ya",
  "play",
  "screenplay",
  "other"
];

// scripts/dashboard/render.ts
var REQUIRED = [
  "project",
  "summary",
  "lexical",
  "method",
  "chapters",
  "analysis",
  "labels",
  "colors"
];
var VERDICT_FIELDS = ["verdict", "ready_to_publish"];
var PLACEHOLDER = "__MASTHEAD_DATA__";
function validate(data) {
  if (typeof data !== "object" || data === null) throw new Error("Invalid dashboard data.");
  const record = data;
  for (const field of REQUIRED) {
    if (record[field] === void 0) throw new Error(`Missing dashboard field: ${field}`);
  }
  const analysis = record.analysis;
  for (const field of VERDICT_FIELDS) {
    if (field in analysis) throw new Error(`A report cannot carry a verdict field: ${field}`);
  }
}
var embed = (data) => JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replaceAll(String.fromCharCode(8232), "\\u2028").replaceAll(String.fromCharCode(8233), "\\u2029");
function renderHtml(data, template) {
  validate(data);
  if (!template.includes(PLACEHOLDER)) throw new Error("Data placeholder not found in template.");
  return template.split(PLACEHOLDER).join(embed(data));
}

// scripts/dashboard/template.html
var template_default = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Publishify Masthead \xB7 Dashboard</title>\n<style>\n:root{--ink:#193e33;--green:#1c5145;--paper:#faf4e6;--line:#d9dfd5;--muted:#5f7068;--gold:#d8b976;--card:#fffdf7;--red:#c65d56;--yellow:#edbb4a;--gray:#adb4b1}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}button,select{font:inherit;color:inherit}button,select,summary{cursor:pointer}button:focus-visible,select:focus-visible,summary:focus-visible,[role=button]:focus-visible{outline:3px solid #416aaf;outline-offset:4px}header{background:var(--green);color:var(--paper);padding:26px max(24px,calc((100vw - 1380px)/2)) 32px}header .top{display:flex;justify-content:space-between;align-items:center;gap:15px}.brand{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#e6ce9a}.eyebrow{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);font-weight:700}h1{font:clamp(32px,4vw,58px)/1.13 Georgia,serif;font-weight:400;margin:22px 0 10px;max-width:1100px}h2{font:30px/1.2 Georgia,serif;font-weight:400;margin:8px 0 18px}h3{font-size:16px;line-height:1.4;margin:0 0 9px}p{margin:7px 0 13px}header p{color:#e3eadf;max-width:1020px}.btn{background:transparent;border:1px solid currentColor;border-radius:7px;padding:8px 15px}.demo{background:#f4dfaa;color:#4d3c17;padding:9px 24px;text-align:center;font-size:13px;font-weight:700}main{max-width:1428px;margin:auto;padding:28px 24px 50px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin:0 0 32px}.kpi{padding:18px 24px;border-right:1px solid var(--line)}.kpi:first-child{padding-left:0}.kpi:last-child{border:0}.big{font:38px/1.15 Georgia,serif}.small{font-size:13px;color:var(--muted)}.two{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px}.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:25px;margin-bottom:25px}.clock-panel{background:#f3efe2}.clock-wrap{max-width:600px;margin:0 auto}svg{display:block;width:100%;height:auto}.clock-segment{cursor:pointer}.clock-segment:hover{filter:brightness(1.09)}.clock-segment:focus{outline:none}.clock-segment:focus path{stroke:#416aaf;stroke-width:4}.filters{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0 8px}.filters label{font-size:12px;font-weight:700;flex:1;min-width:160px}select{display:block;width:100%;margin-top:5px;padding:10px;background:var(--card);border:1px solid #bcc8bd;border-radius:7px}.legend{display:flex;gap:8px 18px;flex-wrap:wrap;margin:14px 0 9px;font-size:12px}.swatch{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:5px;vertical-align:middle}.current{border-left:3px solid var(--green);padding:4px 0 4px 14px;margin:20px 0}.current strong{display:block}.stage-detail{border-top:1px solid var(--line);padding-top:18px;min-height:155px}.badge{display:inline-block;font-size:11px;letter-spacing:.02em;border:1px solid #c3ccc2;border-radius:20px;padding:2px 8px;margin:0 6px 5px 0;color:var(--muted)}.role-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.role{border-top:3px solid var(--gold);padding:14px 0 4px}.role p{font-size:14px}.quote{font-size:12px;color:var(--muted);border-left:2px solid #d3c39e;padding:3px 0 3px 10px;margin:8px 0;overflow-wrap:anywhere}.decisions{counter-reset:decision;margin-top:24px}.decision{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--line)}.decision:before{counter-increment:decision;content:counter(decision,decimal-leading-zero);font:24px Georgia,serif;color:#a78b4e}.decision p{font-size:14px}.barrow{display:grid;grid-template-columns:minmax(130px,1fr) minmax(100px,2fr) 70px;align-items:center;gap:12px;width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);text-align:left;padding:14px 0}.barrow.selected{outline:2px solid var(--green);outline-offset:3px}.barrow .title{font-size:14px;font-weight:600}.bartrack{height:13px;background:#edf0e8;border-radius:4px;overflow:hidden}.barfill{height:100%;min-width:2px;border-radius:4px}.count{text-align:right;font-variant-numeric:tabular-nums}.chapter-note{font-size:12px;color:var(--muted);grid-column:1/-1}.section-title{margin-top:32px}.lexical{display:grid;grid-template-columns:1fr 1fr;gap:25px}.lexical .panel{margin:0}.lexical .wide{grid-column:1/-1}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:10px 8px;border-bottom:2px solid var(--line)}td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}td.num{text-align:right;width:50px;font-variant-numeric:tabular-nums}.refs{font-size:11px;color:var(--muted)}details.module{border:1px solid var(--line);background:var(--card);border-radius:10px;margin:10px 0;overflow:hidden}details.module summary{padding:16px 20px;font-size:15px;font-weight:650}details.module .inside{padding:0 20px 18px}.module-state{float:right;font-size:11px;font-weight:400;color:var(--muted);margin-left:10px}.finding{border-top:1px solid var(--line);padding-top:12px;margin-top:12px;font-size:14px}.sample{background:#f3f0e6;border:1px dashed #c6b381;padding:16px;font-size:14px;white-space:pre-wrap}.mapgrid{display:grid;grid-template-columns:1fr 1fr;gap:25px}.map-stage{border-left:4px solid var(--gray);padding:10px 14px;margin:13px 0;background:var(--card);border-radius:0 8px 8px 0}.map-stage h3{font-size:14px}.map-stage p{font-size:13px}.map-stage.current-stage{outline:2px solid var(--green)}footer{border-top:1px solid var(--line);margin-top:28px;padding-top:20px;font-size:12px;color:var(--muted);overflow-wrap:anywhere}.muted{color:var(--muted)}[hidden]{display:none!important}.print-note{font-size:12px}.notice{font-size:13px;color:var(--muted)}@media(max-width:900px){.two,.mapgrid{grid-template-columns:1fr}.role-grid{gap:16px}.kpi{padding:15px}.big{font-size:30px}.panel{padding:20px}.lexical{grid-template-columns:1fr}.lexical .wide{grid-column:auto}}@media(max-width:550px){main{padding:20px 14px}header{padding:22px 20px}.kpis{grid-template-columns:1fr 1fr}.kpi{border-bottom:1px solid var(--line)}.kpi:nth-child(2){border-right:0}.kpi:nth-child(3){padding-left:0}.role-grid{grid-template-columns:1fr}.barrow{grid-template-columns:110px 1fr 50px;gap:8px}h2{font-size:25px}.module-state{float:none;display:block;margin:4px 0 0}}@media print{body{background:white;font-size:10pt}.btn,.filters{display:none}.two{grid-template-columns:1fr 1fr;gap:16px}main{padding:12px}header{padding:20px;background:white;color:var(--ink)}header p,.brand{color:var(--muted)}.panel,details.module{break-inside:avoid}.mapgrid,.lexical{display:block}.panel{margin:10px 0}.big{font-size:26px}.demo{padding:6px}h1{font-size:30px}.module .inside{display:block!important}.map-stage{break-inside:avoid}summary{list-style:none}footer{break-inside:avoid}}\n</style></head><body>\n<div id="demo" class="demo" hidden>SAMPLE DATA \xB7 This is not a review of a real book.</div>\n<header><div class="top"><span class="brand" lang="en">Publishify Masthead / Editorial Board</span><button class="btn" id="print">Print</button></div><h1 id="title"></h1><p id="coverage"></p><span class="brand" id="reading"></span></header>\n<main><div class="kpis" id="kpis"></div><div class="two"><section class="panel clock-panel"><span class="eyebrow">The story clocks</span><h2>Two journeys, one view</h2><div class="filters"><label>Choose chapter<select id="chapter"><option value="">All chapters</option></select></label><label>Filter by status<select id="status"><option value="">All statuses</option></select></label></div><p class="small">Your selection highlights linked stages. Word and repetition counts apply to the whole report.</p><div class="clock-wrap"><svg id="clock" viewBox="0 0 640 640" role="img" aria-label="Campbell 17 stages outside, Vogler 12 stages inside. Numbered segments can be selected."></svg></div><div class="legend" id="legend"></div><p class="small">Outer: Campbell 17 \xB7 Inner: Vogler 12 \xB7 Black dot: current position. Angles do not imply a one-to-one match.</p><div class="current" id="current"></div><div class="stage-detail" id="stage" aria-live="polite"><h3>Select a segment</h3><p class="small">The stage name, function, linked chapters and evidence appear here. You can use Tab and Enter.</p></div></section><div><section class="panel"><span class="eyebrow">Different views of the same text</span><h2>Board notes</h2><div class="role-grid" id="opinions"></div><p class="notice">These are AI readings. Reader cards are simulations.</p></section><section class="panel"><span class="eyebrow">At most three main issues</span><h2>Key decisions</h2><p id="verdict"></p><div class="decisions" id="decisions"></div><div id="disagreements"></div></section></div></div>\n<section class="panel"><span class="eyebrow">By chapter</span><h2>Word counts and status</h2><div id="chapters"></div><p class="small" id="count-method"></p></section>\n<div class="section-title"><span class="eyebrow">A count is a signal, not a judgment</span><h2>Word and sentence patterns</h2><p class="notice" id="repeat-method"></p><p class="small" id="sentences"></p></div><div class="lexical" id="lexical"></div>\n<section class="section-title"><span class="eyebrow">Full reviews</span><h2>Every voice in its place</h2><p class="notice">Reader cards contain reactions only.</p><div id="modules"></div></section>\n<section class="section-title"><span class="eyebrow">From evidence to map</span><h2>All stages of both journeys</h2><p class="notice">"Not written yet" is not a fault. Gray marks drafts, notes or unread sections. A deliberate departure from the template can still be green.</p><div class="mapgrid" id="maps"></div></section>\n<footer><strong>Publishify Masthead</strong> \xB7 The voice belongs to the author.<p><a href="https://publishify.app/studio/" style="color:inherit">Keep writing in Publishify Studio</a></p><p id="method"></p><p id="fingerprint"></p><p class="print-note">This page works offline.</p></footer></main>\n<script id="dashboard-data" type="application/json">__MASTHEAD_DATA__</script>\n<script>\n"use strict";\nconst D=JSON.parse(document.getElementById("dashboard-data").textContent), A=D.analysis, L=D.labels;\nconst $=id=>document.getElementById(id), E=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};\nconst number=n=>n===null?"\u2014":new Intl.NumberFormat(D.locale||"en").format(n), chapterMap=Object.fromEntries(D.chapters.map(c=>[c.id,c]));\nlet chosen="",status="",active=null;\nfunction sourceRefs(refs){return[...new Set((refs||[]).map(r=>`${chapterMap[r.chapter]?.title||r.chapter} \xB6${r.paragraph}`))].join(" \xB7 ");}\nfunction addEvidence(parent,refs){for(const r of refs||[])parent.append(E("div","quote",`\u201C${r.quote}\u201D \u2014 ${sourceRefs([r])}`));}\nfunction badge(text,color){const b=E("span","badge",text);if(color){b.style.borderColor=color;b.style.color="var(--ink)";}return b;}\nfunction stageTitle(model,s){return`${model==="campbell"?"Campbell":"Vogler"} ${s.id} / ${s.name}`;}\nfunction showStage(model,s){active={model,id:s.id};const box=$("stage");box.replaceChildren(E("h3","",stageTitle(model,s)),badge(L.status[s.status],D.colors[s.status]),badge(L.assessment[s.assessment]),E("p","small",s.function),E("p","",s.note));if(s.chapters.length)box.append(E("p","small","Chapters: "+s.chapters.map(id=>chapterMap[id].title).join(", ")));addEvidence(box,s.evidence);drawClock();}\nconst point=(r,a)=>[320+r*Math.cos(a*Math.PI/180),320+r*Math.sin(a*Math.PI/180)];\nfunction wedge(ro,ri,start,end){const a=point(ro,start),b=point(ro,end),c=point(ri,end),d=point(ri,start);return`M${a} A${ro},${ro} 0 0 1 ${b} L${c} A${ri},${ri} 0 0 0 ${d} Z`;}\nfunction S(tag,attrs,text){const el=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const[k,v]of Object.entries(attrs||{}))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;}\nfunction drawClock(){const svg=$("clock");svg.replaceChildren();for(const[model,ro,ri]of[["campbell",292,211],["vogler",184,124]]){const stages=A.maps[model],step=360/stages.length;for(const s of stages){const start=-90+(s.id-1)*step+.75,end=-90+s.id*step-.75,mid=(start+end)/2,linked=!chosen||s.chapters.includes(chosen),visible=!status||s.status===status,selected=active?.model===model&&active.id===s.id;\nconst g=S("g",{class:"clock-segment",tabindex:0,role:"button","aria-label":`${stageTitle(model,s)}. ${L.status[s.status]}. ${L.assessment[s.assessment]}`,opacity:linked&&visible?1:.2});g.append(S("title",{},`${stageTitle(model,s)} \xB7 ${L.status[s.status]} \xB7 ${L.assessment[s.assessment]}`));g.append(S("path",{d:wedge(ro,ri,start,end),fill:D.colors[s.status],stroke:selected?"#142c24":chosen&&linked?"#142c24":"#faf4e6","stroke-width":selected?5:chosen&&linked?3:1}));const[x,y]=point((ro+ri)/2,mid);g.append(S("text",{x,y:y+5,"text-anchor":"middle","font-size":16,"font-weight":700,fill:["green","red"].includes(s.status)?"white":"#193e33","pointer-events":"none"},s.id));g.addEventListener("click",()=>showStage(model,s));g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showStage(model,s);}});svg.append(g);\nif((A.current?.[model]||[]).includes(s.id)){const[x,y]=point(ro+8,mid);svg.append(S("circle",{cx:x,cy:y,r:6,fill:"#142c24","aria-label":`${model} current ${s.id}`}));}}\n}svg.append(S("text",{x:320,y:297,"text-anchor":"middle","font-size":12,"letter-spacing":2,fill:"#5f7068"},"NOW"));for(const[model,y]of[["campbell",328],["vogler",352]])svg.append(S("text",{x:320,y,"text-anchor":"middle","font-size":16,"font-weight":600,fill:"#193e33"},`${model==="campbell"?"Campbell":"Vogler"} ${(A.current?.[model]||[]).join(", ")||"?"}`));}\nfunction drawChapters(){const parent=$("chapters");parent.replaceChildren();const max=Math.max(1,...D.chapters.map(c=>c.word_count||0));for(const c of D.chapters){if(status&&c.review.status!==status)continue;const row=E("button","barrow"+(chosen===c.id?" selected":""));row.type="button";row.setAttribute("aria-label",`${c.title}, ${number(c.word_count)} words, ${L.status[c.review.status]}`);const title=E("div","title",c.title);title.append(E("div","small",L.kinds[c.kind]+(c.locked?" \xB7 structure locked":"")));const track=E("div","bartrack"),fill=E("div","barfill");fill.style.width=`${(c.word_count||0)*100/max}%`;fill.style.background=D.colors[c.review.status];track.append(fill);row.append(title,track,E("div","count",number(c.word_count)),E("div","chapter-note",`${L.status[c.review.status]} \xB7 ${c.review.note}`));row.addEventListener("click",()=>{chosen=chosen===c.id?"":c.id;$("chapter").value=chosen;refresh();});parent.append(row);}}\nfunction drawMaps(){const parent=$("maps");parent.replaceChildren();for(const[model,title]of[["campbell","Campbell / 17"],["vogler","Vogler / 12"]]){const col=E("div");col.append(E("h3","",title));for(const s of A.maps[model]){if(status&&s.status!==status||chosen&&!s.chapters.includes(chosen))continue;const card=E("article","map-stage"+((A.current?.[model]||[]).includes(s.id)?" current-stage":""));card.style.borderLeftColor=D.colors[s.status];const button=E("button","btn",`${String(s.id).padStart(2,"0")} / ${s.name}`);button.addEventListener("click",()=>{showStage(model,s);$("stage").scrollIntoView({behavior:"smooth",block:"center"});});card.append(button,E("p","small",s.function),badge(L.status[s.status],D.colors[s.status]),badge(L.assessment[s.assessment]),E("p","",s.note));if(s.chapters.length)card.append(E("p","small",s.chapters.map(id=>chapterMap[id].title).join(", ")));addEvidence(card,s.evidence);col.append(card);}parent.append(col);}}\nfunction refresh(){drawClock();drawChapters();drawMaps();}\n$("title").textContent=D.project.title||"Shared text";$("coverage").textContent=A.coverage_note;$("demo").hidden=!D.project.demo;document.title=`Publishify Masthead \xB7 ${D.project.title||"Dashboard"}`;$("reading").textContent=A.reading_mode==="independent"?"Independent AI readings":"AI readings in one session";\nconst findModule=id=>(A.modules||[]).find(m=>m.id===id),problemsOf=m=>m?(m.findings||[]).filter(f=>f.label==="Definite issue"||f.label==="Preference"):[],NO_FINDINGS="Congratulations, no findings in the sections read. Well done.",moduleCard=(id,name)=>{const m=findModule(id),s=problemsOf(m),k=s.filter(f=>f.label==="Definite issue").length,t=s.length-k;if(!m||m.state==="not_run"||m.state==="not_needed")return[null,name+": not run"];if(!s.length)return[0,m.state==="complete"?name+" \xB7 "+NO_FINDINGS:name+": no findings, limited review"];return[s.length,name+": "+k+" definite, "+t+" preference"+(m.state==="complete"?"":" \xB7 limited review")];},repetitionCount=(D.lexical.phrases||[]).length+(D.lexical.sentences||[]).length+(D.lexical.patterns||[]).length;for(const[value,label]of[[D.summary.prose_words,"words read"],moduleCard("spelling","Spelling"),[repetitionCount,"Repetition candidates: a count, not an error"],moduleCard("continuity","Continuity")]){const k=E("div","kpi");k.append(E("div","big",number(value)),E("div","small",label));$("kpis").append(k);}\nfor(const c of D.chapters){const o=E("option","",c.title);o.value=c.id;$("chapter").append(o);}for(const[k,v]of Object.entries(L.status)){const o=E("option","",v);o.value=k;$("status").append(o);const i=E("span"),s=E("span","swatch");s.style.background=D.colors[k];i.append(s,document.createTextNode(v));$("legend").append(i);}\n$("chapter").addEventListener("change",e=>{chosen=e.target.value;refresh();});$("status").addEventListener("change",e=>{status=e.target.value;refresh();});$("print").addEventListener("click",()=>window.print());\n$("current").append(E("strong","",A.current?.chapter?`${chapterMap[A.current.chapter].title} / latest event`:"Position not determined"),E("p","small",A.current?.summary||"Not enough textual evidence yet."));addEvidence($("current"),A.current?.evidence);\nfor(const[key,title]of Object.entries(L.roles)){const item=A.opinions[key],box=E("article","role");box.append(E("h3","",title),badge(L.states[item.state]),E("p","",item.summary));addEvidence(box,item.evidence);$("opinions").append(box);}\n$("verdict").textContent=A.overview||"";for(const d of A.decisions||[]){const row=E("article","decision"),body=E("div");body.append(badge(d.label),E("p","",d.text));addEvidence(body,d.evidence);row.append(body);$("decisions").append(row);}if(A.disagreements)$("disagreements").append(E("h3","","Where the roles disagree"),E("p","small",A.disagreements));\n$("count-method").textContent=D.method.word_count;$("repeat-method").textContent=`${D.method.scope}. ${D.method.repetitions}`;$("sentences").textContent=`Sentences: ${number(D.summary.sentence_count)} \xB7 Average length: ${number(D.summary.mean_sentence_words)} words \xB7 Sentences over 35 words: ${number(D.summary.long_sentences_35)}. ${D.method.patterns}`;\nfor(const[title,key,field,wide]of[["Content words","content_words","word",false],["Frequent words \xB7 including function words","all_frequent_words","word",false],["Repeated 3\u20136 word phrases","phrases","phrase",true],["Repeated sentences","sentences","sentence",true],["Defined sentence patterns","patterns","pattern",true]]){const box=E("section","panel"+(wide?" wide":""));box.append(E("h3","",title));const wrap=E("div","table-wrap"),table=E("table"),head=E("thead"),hr=E("tr");for(const h of["Candidate / pattern","Count","Where"])hr.append(E("th","",h));head.append(hr);table.append(head);const body=E("tbody");for(const item of D.lexical[key]){const row=E("tr");row.append(E("td","",item[field]),E("td","num",number(item.count)),E("td","refs",sourceRefs(item.refs)));body.append(row);}if(!D.lexical[key].length){const row=E("tr"),cell=E("td","muted","No candidates above the threshold.");cell.colSpan=3;row.append(cell);body.append(row);}table.append(body);wrap.append(table);box.append(wrap);$("lexical").append(box);}\nfor(const m of A.modules||[]){const details=E("details","module"),summary=E("summary","",L.modules[m.id]),inside=E("div","inside");summary.append(E("span","module-state",L.states[m.state]));inside.append(E("p","",m.summary));addEvidence(inside,m.evidence);for(const f of m.findings||[]){const b=E("div","finding");b.append(badge(f.label),E("p","",f.text));addEvidence(b,f.evidence);inside.append(b);}details.append(summary,inside);$("modules").append(details);}\n$("method").textContent=D.method.patterns;$("fingerprint").textContent=`Source match: ${D.metrics_sha256} \xB7 Report date: ${A.generated_at||"Not specified"}`;refresh();\nwindow.addEventListener("beforeprint",()=>{for(const e of document.querySelectorAll("details.module")){e.dataset.wasOpen=e.open?"1":"0";e.open=true;}});window.addEventListener("afterprint",()=>{for(const e of document.querySelectorAll("details.module"))e.open=e.dataset.wasOpen==="1";});\n</script></body></html>\n';

// scripts/text/canonical.ts
var canonical = (text) => text.replace(/\r\n?/g, "\n").normalize("NFC");
async function hash(text) {
  const data = new TextEncoder().encode(canonical(text));
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}
var paragraphs = (text) => canonical(text).split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
var bookHash = (unitHashes) => hash(unitHashes.join("\n"));
var codePoints = (text) => Array.from(text).length;
var words = (text) => text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];

// scripts/text/formats.ts
import { readFileSync } from "node:fs";
import { extname } from "node:path";

// node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// scripts/text/formats.ts
var TextError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
  code;
};
var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
var decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (whole, v) => {
  if (v.startsWith("#")) {
    const isHex = v[1]?.toLowerCase() === "x";
    return String.fromCodePoint(Number.parseInt(v.slice(isHex ? 2 : 1), isHex ? 16 : 10));
  }
  return ENTITIES[v] ?? whole;
});
var HEADING_STYLE = /^(?:heading|ba[sş]l[iı]k|title)/iu;
function readDocx(data) {
  const file = unzipSync(data)["word/document.xml"];
  if (!file) throw new TextError("FORMAT_UNSUPPORTED", "The Word document could not be read.");
  const xml = strFromU8(file);
  const ps = [];
  const headings = [];
  for (const [p] of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
    let text = "";
    for (const m of p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
      if (m[1] !== void 0) text += decode(m[1]);
      else text += m[0] === "<w:tab/>" ? "	" : "\n";
    }
    text = text.trim();
    if (!text) continue;
    const style = p.match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1];
    if (style && HEADING_STYLE.test(style)) headings.push(ps.length);
    ps.push(text);
  }
  return { text: ps.join("\n\n"), headings, extractor: "docx@1" };
}
function readPlainText(content, stripYaml) {
  let text = content.replace(/^﻿/, "");
  if (stripYaml) text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  return { text, extractor: "text@1" };
}
function readFile(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".md") return readPlainText(readFileSync(path, "utf-8"), true);
  if (extension === ".txt") return readPlainText(readFileSync(path, "utf-8"), false);
  if (extension === ".docx") return readDocx(readFileSync(path));
  throw new TextError("FORMAT_UNSUPPORTED", `This file format is not supported yet: ${extension}`);
}

// scripts/text/measure.ts
var FUNCTION_WORDS = new Set(
  "bir ve ile de da ki bu \u015Fu o i\xE7in gibi ama daha \xE7ok en ne mi m\u0131 mu m\xFC ya hem ise de\u011Fil var yok".split(
    " "
  )
);
var lower = (s) => s.toLocaleLowerCase("tr");
var DIALOGUE = /^["“«‘'—–-]/u;
var tally = (items) => {
  const counts = /* @__PURE__ */ new Map();
  for (const k of items) counts.set(k, (counts.get(k) ?? 0) + 1);
  return counts;
};
function measure(text) {
  const ps = paragraphs(text);
  const all = words(text).map(lower);
  const content = all.filter((w) => w.length > 2 && !FUNCTION_WORDS.has(w));
  const frequent = [...tally(content)].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([word, count]) => ({ word, count }));
  const grams = [];
  for (const p of ps) {
    const w = words(p).map(lower);
    for (let n = 3; n <= 6; n++) {
      for (let i2 = 0; i2 + n <= w.length; i2++) grams.push(w.slice(i2, i2 + n).join(" "));
    }
  }
  const candidates = [...tally(grams)].filter(
    ([phrase, count]) => count >= (phrase.split(" ").length === 3 ? 3 : 2)
  );
  const repetition = candidates.filter(([phrase]) => !candidates.some(([other]) => other !== phrase && other.includes(phrase))).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([phrase, count]) => ({ phrase, count }));
  return {
    words: all.length,
    sentences: text.split(/[.!?…]+(?=\s|$)/u).filter((s) => words(s).length > 0).length,
    paragraphs: ps.length,
    dialogue_ratio: ps.length ? ps.filter((p) => DIALOGUE.test(p)).length / ps.length : 0,
    frequent_words: frequent,
    repetition_candidates: repetition
  };
}

// scripts/text/quote.ts
var TYPOGRAPHY = {
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
  "\xAB": '"',
  "\xBB": '"',
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u2014": "-",
  "\u2013": "-",
  "\u2011": "-"
};
function relax(chars) {
  const output = [];
  const source = [];
  chars.forEach((c, i2) => {
    if (/\s/u.test(c)) {
      if (output[output.length - 1] !== " ") {
        output.push(" ");
        source.push(i2);
      }
    } else if (c === "\u2026") {
      for (let k = 0; k < 3; k++) {
        output.push(".");
        source.push(i2);
      }
    } else {
      output.push(TYPOGRAPHY[c] ?? c);
      source.push(i2);
    }
  });
  return { chars: output, source };
}
function positions(haystack, needle) {
  const found = [];
  for (let i2 = 0; i2 + needle.length <= haystack.length; i2++) {
    if (needle.every((c, k) => haystack[i2 + k] === c)) found.push(i2);
  }
  return found;
}
function resolve(candidates, chars, hint) {
  const chosen = candidates.length > 1 && hint ? candidates.filter(([s, e]) => s >= hint[0] && e <= hint[1]) : candidates;
  const only = chosen[0];
  if (chosen.length === 1 && only) {
    return { status: "found", range: only, original: chars.slice(only[0], only[1]).join("") };
  }
  return { status: "ambiguous", count: chosen.length || candidates.length };
}
function findQuote(unit, quote, hint) {
  const chars = Array.from(canonical(unit));
  const target = Array.from(canonical(quote).trim());
  if (target.length === 0) return { status: "missing" };
  const exact = positions(chars, target);
  if (exact.length > 0) {
    return resolve(
      exact.map((s) => [s, s + target.length]),
      chars,
      hint
    );
  }
  const text = relax(chars);
  const needle = relax(target).chars;
  const relaxed = positions(text.chars, needle);
  if (relaxed.length === 0) return { status: "missing" };
  const candidates = relaxed.map((s) => {
    const start = text.source[s] ?? 0;
    const last = text.source[s + needle.length - 1] ?? start;
    return [start, last + 1];
  });
  return resolve(candidates, chars, hint);
}

// scripts/text/split.ts
var MAX_UNIT_CHARS = 4e4;
var LEVEL = {
  novel: "chapter",
  novella: "chapter",
  poetry: "poem",
  "academic-essay": "chapter",
  "academic-article": "chapter",
  "academic-book": "chapter",
  memoir: "chapter",
  biography: "chapter",
  "non-fiction": "chapter",
  "children-ya": "chapter",
  play: "scene",
  screenplay: "scene"
};
var CHAPTERS_EXPECTED = [
  "novel",
  "novella",
  "academic-book",
  "memoir",
  "biography"
];
var HEADING_PATTERNS = [
  /^#{1,3}\s+\S/u,
  /^(?:\d+\.?\s+)?bölüm\b/iu,
  /^[\p{Lu}]+(?:\s[\p{Lu}]+)?\s+BÖLÜM\b/u,
  /^(?:kısım|perde|sahne)\s+\S/iu,
  /^(?:chapter|part|act|scene)\s+\S/iu
];
var isHeading = (p) => p.length <= 80 && HEADING_PATTERNS.some((r) => r.test(p));
function buildUnit(no, level, ps, title) {
  const text = ps.join("\n\n");
  return {
    no,
    level,
    ...title ? { title } : {},
    text,
    chars: codePoints(text),
    words: words(text).length
  };
}
function chunk(ps) {
  const chunks = [];
  let current = [];
  let size = 0;
  for (const p of ps) {
    const length = codePoints(p);
    if (current.length > 0 && size + length > MAX_UNIT_CHARS) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(p);
    size += length + 2;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
function split(raw, genre) {
  const ps = paragraphs(raw.text);
  const fromFormat = new Set(raw.headings ?? []);
  const level = LEVEL[genre] ?? "text";
  const groups = [];
  let found = false;
  ps.forEach((p, i2) => {
    if (fromFormat.has(i2) || isHeading(p)) {
      found = true;
      groups.push({ title: p.replace(/^#{1,3}\s+/u, ""), ps: [] });
      return;
    }
    const last = groups[groups.length - 1];
    if (last) last.ps.push(p);
    else groups.push({ ps: [p] });
  });
  const units = [];
  for (const g of groups) {
    if (g.ps.length === 0) continue;
    const chunks = genre === "poetry" ? [g.ps] : chunk(g.ps);
    chunks.forEach((c, i2) => {
      const title = g.title && chunks.length > 1 ? `${g.title} (${i2 + 1})` : g.title;
      units.push(buildUnit(units.length + 1, level, c, title));
    });
  }
  return { units, confidence: found || !CHAPTERS_EXPECTED.includes(genre) ? "high" : "low" };
}

// scripts/text/cli.ts
var WORK_DIR = ".masthead";
var print = (value) => console.log(JSON.stringify(value));
var unitPath = (no) => join(WORK_DIR, "units", `${no}.txt`);
var readManifest = () => JSON.parse(readFileSync2(join(WORK_DIR, "manifest.json"), "utf-8"));
async function prepare(file, genre) {
  const raw = readFile(file);
  const { units, confidence } = split(raw, genre);
  mkdirSync(join(WORK_DIR, "units"), { recursive: true });
  const hashes = [];
  const list = [];
  for (const u of units) {
    const unitHash = await hash(u.text);
    hashes.push(unitHash);
    writeFileSync(unitPath(u.no), u.text);
    list.push({
      no: u.no,
      level: u.level,
      ...u.title ? { title: u.title } : {},
      hash: unitHash,
      chars: u.chars,
      words: u.words
    });
  }
  const manifest = {
    source: "core",
    extractor: raw.extractor,
    book_hash: await bookHash(hashes),
    units: list
  };
  writeFileSync(join(WORK_DIR, "manifest.json"), JSON.stringify(manifest));
  print({ ...manifest, confidence });
}
async function verify(file) {
  const notes = JSON.parse(readFileSync2(file, "utf-8"));
  const result = [];
  for (const n of notes) {
    const text = readFileSync2(unitPath(n.unit), "utf-8");
    result.push({ ...n, match: findQuote(text, n.quote), unit_hash: await hash(text) });
  }
  print(result);
}
async function main([command, ...args]) {
  if (command === "prepare" && args[0]) {
    const i2 = args.indexOf("--genre");
    const genre = i2 >= 0 ? args[i2 + 1] : "other";
    if (!GENRES.includes(genre)) throw new TextError("MODULE_MISSING", `Unknown genre: ${genre}`);
    return prepare(args[0], genre);
  }
  if (command === "unit" && args[0]) {
    return print(
      paragraphs(readFileSync2(unitPath(Number(args[0])), "utf-8")).map((text, i2) => ({
        no: i2 + 1,
        text
      }))
    );
  }
  if (command === "measure") {
    return print(
      readManifest().units.map((u) => ({
        no: u.no,
        ...measure(readFileSync2(unitPath(u.no), "utf-8"))
      }))
    );
  }
  if (command === "verify" && args[0]) return verify(args[0]);
  if (command === "render" && args[0]) {
    const i2 = args.indexOf("--output");
    const target = i2 >= 0 && args[i2 + 1] ? args[i2 + 1] : "masthead-dashboard.html";
    writeFileSync(String(target), renderHtml(JSON.parse(readFileSync2(args[0], "utf-8")), template_default));
    return print({ html: target });
  }
  throw new Error(
    "Usage: prepare <file> --genre <genre> | unit <no> | measure | verify <file> | render <data.json> --output <file>"
  );
}
main(process.argv.slice(2)).catch((e) => {
  const code = e instanceof TextError ? e.code : "UNKNOWN";
  console.error(
    JSON.stringify({ error: code, message: e instanceof Error ? e.message : String(e) })
  );
  process.exitCode = 1;
});
