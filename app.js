(() => {
"use strict";
const $ = id => document.getElementById(id);
const problems = window.MATHPAD_PROBLEMS || [];
let current = null;
let queue = [];
let currentIndex = 0;
let hintIndex = 0;

const state = load("mathpad_state", {solved:0, correct:0, wrongIds:[], favorites:[]});

function load(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}}
function save(){try{localStorage.setItem("mathpad_state",JSON.stringify(state))}catch{}}
function norm(v){return String(v??"").replace(/\s/g,"").replace(/−/g,"-").replace(/√/g,"sqrt").toLowerCase()}

function buildQueue(){
  const selected = $("topicSelect")?.value || "all";
  queue = problems.filter(p => selected==="all" || p.unit===selected);
  // 쉬운 문제 → 어려운 문제
  queue.sort((a,b)=>a.difficulty-b.difficulty || a.id-b.id);
  currentIndex = 0;
}
function renderStats(){
  if($("solvedCount")) $("solvedCount").textContent=state.solved;
  if($("correctCount")) $("correctCount").textContent=state.correct;
  if($("accuracyCount")) $("accuracyCount").textContent=state.solved?Math.round(state.correct/state.solved*100)+"%":"0%";
}
  function formatMathQuestion(q){
  let s = String(q || "");

  const convertMath = text => {
    let x = text;

    x = x.replace(/lim\(x→∞\)/g, "\\lim_{x\\to\\infty}");
    x = x.replace(/lim\(x→([^)]+)\)/g, "\\lim_{x\\to $1}");
    x = x.replace(/²/g, "^2");
    x = x.replace(/³/g, "^3");
    x = x.replace(/√\(([^()]+)\)/g, "\\sqrt{$1}");

    x = x.replace(
      /\(([^()]+)\)\/\(([^()]+)\)/g,
      "\\frac{$1}{$2}"
    );

    return x;
  };

  return s.split("\n").map(line => {
    if (
      line.includes("lim(") ||
      /^[\s\dxyabfk+\-*/().²³√→∞=<>]+$/.test(line)
    ){
      return "\\[" + convertMath(line) + "\\]";
    }

    return `<div>${line}</div>`;
  }).join("");
}
  function showProblem(i=currentIndex){
  if(!queue.length) buildQueue();
  if(i>=queue.length) i=0;
  currentIndex=i; current=queue[i]; hintIndex=0;
  $("problemText").innerHTML=formatMathQuestion(current.question);
if(window.MathJax?.typesetPromise) MathJax.typesetPromise([$("problemText")]);
  $("topicBadge").textContent=current.chapter;
  $("levelBadge").textContent=["","기본","보통","내신","고난도","최상위"][current.difficulty] || "고난도";
  $("problemIndex").textContent=`문제 ${i+1} / ${queue.length}`;
  $("answerInput").value="";
  $("feedback").textContent="";
  $("solutionPanel").classList.add("hidden");
  $("solutionText").textContent=formatSolution(current);
  $("answerKey").textContent=current.answer;
  if($("hintText")) $("hintText").textContent="";
  if(window.clearCanvas) clearCanvas();
}
function formatSolution(p){
  return `유형: ${p.style}\n\n${p.solution}\n\n핵심 태그: ${(p.tags||[]).join(" · ")}`;
}
function submit(){
  if(!current)return;
  state.solved++;
  const ok=norm($("answerInput").value)===norm(current.answer);
  if(ok){
    state.correct++;
    $("feedback").textContent="✅ 정답! 다음 문제로 넘어갑니다.";
    $("feedback").className="feedback good";
    state.wrongIds=state.wrongIds.filter(id=>id!==current.id);
    save(); renderStats();
    setTimeout(()=>showProblem(currentIndex+1),700);
  }else{
    $("feedback").textContent="❌ 오답. 힌트나 자세한 해설을 확인해보세요.";
    $("feedback").className="feedback bad";
    if(!state.wrongIds.includes(current.id)) state.wrongIds.push(current.id);
    save(); renderStats();
    $("solutionPanel").classList.remove("hidden");
  }
}
function next(){showProblem(currentIndex+1)}
function previous(){showProblem(Math.max(0,currentIndex-1))}
function hint(){
  if(!current?.hints?.length)return;
  const msg=current.hints[Math.min(hintIndex,current.hints.length-1)];
  hintIndex++;
  alert(`힌트 ${Math.min(hintIndex,current.hints.length)}\n\n${msg}`);
}
function similar(){
  if(!current)return;
  const candidates=queue.filter(p=>p.id!==current.id && p.tags?.some(t=>current.tags?.includes(t)));
  if(!candidates.length)return;
  const p=candidates[Math.floor(Math.random()*candidates.length)];
  const idx=queue.findIndex(x=>x.id===p.id);
  showProblem(idx>=0?idx:currentIndex);
}
function wrongOnly(){
  const wrong = problems.filter(p=>state.wrongIds.includes(p.id)).sort((a,b)=>a.difficulty-b.difficulty||a.id-b.id);
  if(!wrong.length){alert("저장된 오답이 아직 없습니다.");return;}
  queue=wrong; currentIndex=0; showProblem(0);
}

// Buttons already present
$("submitButton")?.addEventListener("click",submit);
$("skipButton")?.addEventListener("click",next);
$("nextButton")?.addEventListener("click",next);
$("solutionButton")?.addEventListener("click",()=>$("solutionPanel").classList.toggle("hidden"));
$("closeSolutionButton")?.addEventListener("click",()=>$("solutionPanel").classList.add("hidden"));
$("topicSelect")?.addEventListener("change",()=>{buildQueue();showProblem(0)});
$("levelSelect")?.addEventListener("change",()=>{
  const selected=$("levelSelect").value;
  buildQueue();
  if(selected!=="all") queue=queue.filter(p=>String(p.difficulty)===selected);
  showProblem(0);
});
$("answerInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")submit()});

// Extra compact study buttons
const actions=document.querySelector(".problem-actions");
if(actions){
  const hintBtn=document.createElement("button"); hintBtn.type="button"; hintBtn.textContent="💡 힌트"; hintBtn.addEventListener("click",hint);
  const similarBtn=document.createElement("button"); similarBtn.type="button"; similarBtn.textContent="🔁 비슷한 문제"; similarBtn.addEventListener("click",similar);
  const wrongBtn=document.createElement("button"); wrongBtn.type="button"; wrongBtn.textContent="📝 오답만"; wrongBtn.addEventListener("click",wrongOnly);
  actions.append(hintBtn,similarBtn,wrongBtn);
}

// MathPad V2 Pencil Engine
const canvas=$("scratchpad");
let pencil=null;

if(canvas && window.MathPadPencil){
  pencil=new MathPadPencil(canvas);

  window.clearCanvas=function(){
    pencil?.clear(false);
  };

  const setTool=(mode)=>{
    pencil?.setMode(mode);
    $("penButton")?.classList.toggle("active",mode==="pen");
    $("eraserButton")?.classList.toggle("active",mode==="eraser");
  };

  setTool("pen");

  $("penButton")?.addEventListener("click",()=>setTool("pen"));
  $("eraserButton")?.addEventListener("click",()=>setTool("eraser"));
  $("undoButton")?.addEventListener("click",()=>pencil?.undo());
  $("redoButton")?.addEventListener("click",()=>pencil?.redo());
  $("clearButton")?.addEventListener("click",()=>pencil?.clear(true));

  let penOnly=true;
  $("touchModeButton")?.addEventListener("click",()=>{
    penOnly=!penOnly;
    pencil?.setPenOnly(penOnly);
    $("touchModeButton").textContent=penOnly?"펜 전용":"손가락 허용";
    $("touchModeButton").dataset.mode=penOnly?"pen-only":"touch";
    $("touchModeButton").classList.toggle("active",penOnly);
  });

  $("touchModeButton").dataset.mode="pen-only";
  $("touchModeButton").classList.add("active");
}

const themeBtn = $("themeButton");
if(themeBtn){
  let savedTheme="light";
  try{savedTheme=JSON.parse(localStorage.getItem("mathpad_theme"))||"light"}catch{}
  if(savedTheme==="dark")document.documentElement.classList.add("dark");
  themeBtn.addEventListener("click",()=>{
    document.documentElement.classList.toggle("dark");
    const mode=document.documentElement.classList.contains("dark")?"dark":"light";
    try{localStorage.setItem("mathpad_theme",JSON.stringify(mode))}catch{}
  });
}

renderStats();buildQueue();showProblem(0);
})();
