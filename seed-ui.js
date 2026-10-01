'use strict';
let demo=SeedModel.initial(),role='user';
const names={user:'利用者',operator:'運営担当者',merchant:'協力店'};
const labels={draft:'依頼を作成',requested:'運営確認待ち',published:'参加者募集中',applied:'応募・双方確認待ち',matched:'参加確定',reported:'完了承認待ち',awarded:'seed付与済み'};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label)=>`<button class="primary" data-action="${action}">${label}</button>`;
const check=label=>`<label class="check"><input id="confirmed" type="checkbox">${label}</label>`;
const shared=()=>`<p class="eyebrow">架空の活動 / 依頼番号 SEED-001</p><h3>${escapeHtml(demo.title)}</h3><p>依頼者：地域のお菓子づくりの会（架空）<br>日時：訪問日の午後 14:00〜15:00（仮）<br>作業：包装・ラベル貼り。食品の調理は扱いません。</p><p class="hint">お礼は500 seed（デモ仮設定）。安全・受け入れ条件を確認したうえで参加します。実際の募集ではありません。</p>`;
function user(){
 let task='';
 if(demo.phase==='draft')task=`<p class="muted">まず依頼者の立場で登録します。公開範囲はこのデモ内のみです。</p><label for="title">困っています：お願いしたいこと</label><input id="title" type="text" maxlength="80" value="${escapeHtml(demo.title)}">${check('架空の依頼内容をデモの運営担当者・参加候補者と共有することに同意します。')}${button('request','依頼を運営へ送る（デモ）')}`;
 else if(demo.phase==='published')task=`<p class="muted">ここから参加者「あおい」の立場で操作します。料理や手仕事に関心があり、午後に1時間参加できます。</p>${button('join','このお手伝いに応募する')}`;
 else if(demo.phase==='matched')task=`<p>双方の確認が終わり、参加が確定しました。</p><p class="muted">当日の活動が終了した想定で、次へ進みます。</p>${button('complete','活動の完了を報告する')}`;
 else task=`<p>${{requested:'運営担当者による内容確認を待っています。',applied:'運営担当者が双方の予定・意思を確認します。',reported:'依頼者の確認と運営承認を待っています。',awarded:'お手伝いのありがとうが、500 seedになりました。'}[demo.phase]}</p>`;
 let wallet=demo.phase==='awarded'?(demo.pending?`<p>島の食堂へ ${demo.pending.amount} seed の利用確認待ち。</p><p class="muted">まだ残高は減っていません。協力店画面で確認します。</p>${button('cancel','利用申請を取り消す')}`:`<p>島の食堂（架空）で使う</p><label for="amount">利用するseed</label><input id="amount" type="number" min="1" step="1" max="${demo.balance}" value="${Math.min(300,demo.balance)}"><p class="muted">円への換算やお店への支払い条件は未定です。</p>${button('pay','店舗へ利用確認を送る')}`):'<p class="muted">活動完了後、運営担当者の承認で付与されます。</p>';
 return `<div class="grid"><article class="panel">${shared()}${task}</article><aside class="panel"><h3>あなたのseed</h3><div class="balance">${demo.balance.toLocaleString()} <small>seed</small></div><p>受け取ったありがとうを、次の誰かへ。</p>${wallet}</aside></div>`;
}
function operator(){
 const t=SeedModel.totals(demo);let action='';
 if(demo.phase==='requested')action=button('publish','内容と条件を確認し、公開する');
 if(demo.phase==='applied')action=check('依頼者と参加者の予定・受け入れ意思を確認しました（デモ）。')+button('match','双方確認を記録して参加確定');
 if(demo.phase==='reported')action=check('依頼者からも活動完了の確認を受けました（デモ）。')+button('award','承認して500 seedを付与');
 if(!action)action=`<p class="muted">${demo.phase==='draft'?'利用者画面から依頼を作成してください。':demo.phase==='published'?'利用者画面から応募できます。':demo.phase==='matched'?'利用者による完了報告を待っています。':'この活動の付与は完了しています。二重付与はできません。'}</p>`;
 return `<div class="metrics">${[['発行済み',t.issued],['利用済み',t.used],['店舗精算待ち',t.unsettled],['残り付与枠（仮）',demo.budget]].map(([l,n])=>`<div class="metric"><span>${l}</span><b>${n.toLocaleString()}</b> seed</div>`).join('')}</div><div class="grid"><article class="panel"><h3>今日の確認・承認</h3>${shared()}${action}</article><aside class="panel"><h3>地域AIの提案</h3><span class="badge">固定条件のシミュレーション</span><p><b>候補：来訪者 あおい（架空）</b></p><p>理由：午後に1時間空いている／手仕事への関心／同意した依頼との条件一致。</p><p class="hint">確認が必要：集合場所、作業の負担、安全面。AIは参加確定やseed付与を行いません。</p><p class="muted">実際のAI接続・個人情報の分析は行っていません。電話相談の代理登録や相談窓口との役割分担も協議対象です。</p></aside></div><section class="panel"><h3>協力店への精算</h3><p>島の食堂：精算待ち <b>${t.unsettled} seed相当</b> ／ 記録済み ${t.settled} seed相当</p><p class="muted">精算原資・円換算率・支払日・振込手段は未設定。ここでは送金せず、承認後の台帳記録だけを再現します。</p>${t.unsettled?check('対象店舗と精算対象を確認しました。実際の送金ではありません。')+button('settle','精算完了を記録する（デモ）'):'<p>精算対象はありません。</p>'}</section>`;
}
function merchant(){const t=SeedModel.totals(demo);return `<div class="grid"><article class="panel"><h3>島の食堂 / seed受付</h3><p class="muted">架空の協力店として、利用者からの申請を確認します。</p>${demo.pending?`<div class="balance">${demo.pending.amount} <small>seed</small></div><p>利用者：あおい（架空）<br>利用申請 #${demo.pending.id}</p>${button('accept','内容を確認してseedを受け取る')}`:'<p>利用確認を待っている申請はありません。</p>'}</article><aside class="panel"><h3>店舗の受取・精算状況</h3><p>受取累計：${t.used} seed<br>精算待ち：${t.unsettled} seed相当<br>精算記録済み：${t.settled} seed相当</p><p class="hint">seedは誰が、どの原資で精算するのか。地域の店が続けられる条件を決めるための表示です。</p></aside></div>`;}
function render(){
 document.querySelectorAll('[data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));
 document.getElementById('workspace').innerHTML=`<div class="workspace-title"><h2>${names[role]}の画面</h2><span class="badge">${labels[demo.phase]}</span></div>${role==='user'?user():role==='operator'?operator():merchant()}<details><summary>操作履歴・seed台帳（${demo.ledger.length}件）</summary><div class="table-wrap"><table><thead><tr><th>番号</th><th>操作した役割</th><th>記録</th></tr></thead><tbody>${demo.ledger.map(e=>`<tr><td>${e.id}</td><td>${names[e.actor]}</td><td>${escapeHtml(e.note)}</td></tr>`).join('')||'<tr><td colspan="3">まだ操作はありません。</td></tr>'}</tbody></table></div></details>`;
}
document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{role=b.dataset.role;document.getElementById('status').textContent='';render();}));
document.getElementById('workspace').addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const status=document.getElementById('status');
 try{demo=SeedModel.apply(demo,role,b.dataset.action,{title:document.getElementById('title')?.value,consent:document.getElementById('confirmed')?.checked,confirmed:document.getElementById('confirmed')?.checked,amount:Number(document.getElementById('amount')?.value)});status.className='status';status.textContent=demo.ledger.at(-1).note;render();}catch(err){status.className='status error';status.textContent=err.message;}
});
document.getElementById('reset').addEventListener('click',()=>{if(confirm('このタブのデモ操作とseed残高を初期状態に戻しますか？')){demo=SeedModel.initial();role='user';document.getElementById('status').textContent='初期状態に戻しました。';render();}});
render();
