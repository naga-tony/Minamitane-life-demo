(function (root) {
  'use strict';
  const initial = () => ({phase:'draft', title:'伝統菓子の包装を一緒に手伝ってほしい', consent:false, reward:500, budget:10000, balance:0, pending:null, sales:[], ledger:[]});
  function apply(previous, actor, action, payload={}) {
    const s=JSON.parse(JSON.stringify(previous));
    const require=(condition,message)=>{if(!condition)throw new Error(message);};
    const role=r=>require(actor===r,'この操作は担当の役割に切り替えてください。');
    const phase=p=>require(s.phase===p,'現在の状態ではこの操作はできません。');
    let note='';
    switch(action){
      case 'request': role('user');phase('draft');require(payload.consent===true,'デモ内での情報共有に同意してください。');require(typeof payload.title==='string'&&payload.title.trim().length>0&&payload.title.length<=80,'依頼は1〜80文字で入力してください。');s.title=payload.title.trim();s.consent=true;s.phase='requested';note='依頼を受付。公開前の確認待ち';break;
      case 'publish': role('operator');phase('requested');s.phase='published';note='内容・受け入れ条件を確認し、依頼を公開';break;
      case 'join': role('user');phase('published');s.phase='applied';note='来訪者あおい（架空）が応募。まだ成立していません';break;
      case 'match': role('operator');phase('applied');require(payload.confirmed===true,'双方の予定と受け入れ意思を確認してください。');s.phase='matched';note='双方への確認を記録し、参加を確定';break;
      case 'complete': role('user');phase('matched');s.phase='reported';note='参加者が活動完了を報告';break;
      case 'award': role('operator');phase('reported');require(payload.confirmed===true,'依頼者の完了確認が必要です。');require(s.budget>=s.reward,'実証用の付与枠が不足しています。');s.budget-=s.reward;s.balance+=s.reward;s.phase='awarded';note=`依頼者確認を記録し、${s.reward} seedを付与`;break;
      case 'pay': role('user');phase('awarded');require(!s.pending,'すでに店舗の確認待ちです。');require(Number.isSafeInteger(payload.amount)&&payload.amount>0&&payload.amount<=s.balance,'残高以内の正の整数を入力してください。');s.pending={id:s.ledger.length+1,amount:payload.amount};note=`島の食堂（架空）へ${payload.amount} seedの利用申請。未決済`;break;
      case 'cancel': role('user');require(!!s.pending,'取消対象がありません。');note=`利用申請 ${s.pending.amount} seedを取消。残高変更なし`;s.pending=null;break;
      case 'accept': role('merchant');require(!!s.pending,'利用申請がありません。');require(s.pending.amount<=s.balance,'残高不足です。');s.balance-=s.pending.amount;s.sales.push({...s.pending,settled:false});note=`店舗が${s.pending.amount} seedの利用を確認。精算待ち`;s.pending=null;break;
      case 'settle': role('operator');require(s.sales.some(x=>!x.settled),'精算対象がありません。');require(payload.confirmed===true,'店舗と金額を確認してください。');note=`店舗への精算完了を記録：${s.sales.filter(x=>!x.settled).reduce((n,x)=>n+x.amount,0)} seed相当（送金なし）`;s.sales.forEach(x=>x.settled=true);break;
      default:throw new Error('未定義の操作です。');
    }
    s.ledger.push({id:s.ledger.length+1,actor,action,note});return s;
  }
  const totals=s=>({issued:10000-s.budget,used:s.sales.reduce((n,x)=>n+x.amount,0),unsettled:s.sales.filter(x=>!x.settled).reduce((n,x)=>n+x.amount,0),settled:s.sales.filter(x=>x.settled).reduce((n,x)=>n+x.amount,0)});
  const api={initial,apply,totals};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SeedModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
