// Pure interaction model. No wallets, signatures, contracts or chain transactions.
export const roles = ['alice', 'bob', 'charlie'];
export function initialRoom(room = 'stage', round = 1) {
  return { schema: 1, room, round, revision: 0, hosts: [false, false], seats: ['alice', 'bob', null], plan: 0, phase: 'hosts', consents: [], result: null, history: [] };
}
export function changeRoom(previous, role, action, seen = {}) {
  if (!roles.includes(role)) throw new Error('Choose a participant');
  if (seen.round !== undefined && seen.round !== previous.round) throw new Error('The room restarted. Review the current round.');
  const s = structuredClone(previous);
  if (action === 'reset') {
    // Presenter convenience on every simulated role page; never touches a real chain.
    const fresh = initialRoom(s.room, s.round + 1); fresh.revision = s.revision + 1; return fresh;
  }
  if (action === 'host') {
    const index = roles.indexOf(role);
    if (index > 1 || s.hosts[index]) throw new Error('This host approval is unavailable');
    s.hosts[index] = true; if (s.hosts.every(Boolean)) s.phase = 'ready';
  } else if (action === 'plan') {
    if (role !== 'alice' || !['ready', 'withdrawn'].includes(s.phase)) throw new Error('Wait for Alice to prepare an available plan');
    s.plan++; s.phase = 'consent'; s.consents = []; s.result = null;
  } else if (action === 'agree') {
    if (s.phase !== 'consent' || seen.plan !== s.plan) throw new Error('Plan changed. Review it again.');
    if (s.consents.includes(role)) throw new Error('You already approved this plan');
    s.consents.push(role);
  } else if (action === 'withdraw') {
    if (s.phase !== 'consent' || !s.consents.includes(role) || seen.plan !== s.plan) throw new Error('No current approval to withdraw');
    s.phase = 'withdrawn'; s.result = { kind: 'withdrawn', actor: role };
  } else if (action === 'execute') {
    if (role !== 'alice' || !s.plan) throw new Error('Alice demonstrates execution after a plan exists');
    if (s.phase === 'consent' && s.consents.length === 3 && seen.plan === s.plan) {
      s.seats = ['charlie', 'alice', 'bob']; s.phase = 'completed'; s.result = { kind: 'success' };
    } else s.result = { kind: 'rejected' };
  } else throw new Error('Unknown demo action');
  s.revision++; s.history.push({ revision: s.revision, role, action, result: s.result?.kind ?? null });
  s.history = s.history.slice(-30); return s;
}
