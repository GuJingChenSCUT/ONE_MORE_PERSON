(function (global) {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function createState(kind = 'relay') {
    return {
      kind, now: 100, deadline: 200, approved: true,
      seats: kind === 'full' ? ['lin', 'chen', 'ning'] : ['lin', 'chen', null],
      nonces: { lin: 0, chen: 0, yu: 0, ning: 0 },
      eligible: { lin: [1,2,3], chen: [1,2,3], yu: [1], ning: [3] }
    };
  }
  function planFor(state) {
    if (state.kind === 'full') return null;
    const wanted = state.kind === 'cycle' ? [['lin',2],['chen',1]] : [['lin',2],['chen',3],['yu',1]];
    return { deadline: state.deadline, moves: wanted.map(([person,to]) => ({person,from:state.seats.indexOf(person)+1,to,nonce:state.nonces[person]})) };
  }
  function execute(state, plan, consent) {
    const fail = message => ({ok:false,message,state:copy(state)});
    if (!plan || !state.approved) return fail('还没有可执行的共同方案。');
    if (state.now >= plan.deadline || state.now >= state.deadline || plan.deadline > state.deadline) return fail('方案已过期或超出名额池截止时间，原有名额保持不变。');
    if (!plan.moves.length || plan.moves.length > 12) return fail('换位人数不符合范围。');
    const people = new Set(), targets = new Set();
    for (const move of plan.moves) {
      if (!Number.isInteger(move.to) || move.to<1 || move.to>state.seats.length || move.from===move.to) return fail('目标位置无效。');
      if (people.has(move.person) || targets.has(move.to)) return fail('同一人或同一个位置重复出现。');
      people.add(move.person); targets.add(move.to);
      if (!consent[move.person]) return fail('还有人没有同意。大家的原名额都保留。');
      if (!state.eligible[move.person]?.includes(move.to)) return fail('目标场次不在这位参加者的资格范围内。');
      if (state.nonces[move.person]!==move.nonce || state.seats.indexOf(move.person)+1!==move.from) return fail('有人撤回或名额状态已变化。整个旧方案失效，大家保留原名额。');
      const occupant=state.seats[move.to-1];
      if (occupant && !plan.moves.some(m=>m.person===occupant && m.from===move.to)) return fail('目标位置的持有人没有参与本次换位。');
    }
    const next=copy(state);
    for (const move of plan.moves) if(move.from) next.seats[move.from-1]=null;
    for (const move of plan.moves) { next.seats[move.to-1]=move.person;next.nonces[move.person]++; }
    return {ok:true,message:'所有条件一起成立，整份换位方案完成。',state:next,additional:next.seats.filter(Boolean).length-state.seats.filter(Boolean).length};
  }
  function cancel(state,person) { const next=copy(state);next.nonces[person]++;return next; }
  global.SeatRelay=Object.freeze({createState,planFor,execute,cancel});
})(globalThis);
