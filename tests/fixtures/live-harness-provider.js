// LOCAL TEST HARNESS ONLY. Never copied into web/ or a public build.
// The RPC server owns isolated, publicly known Hardhat accounts. No production keys exist here.
const banner = document.createElement('aside');
banner.id = 'local-test-banner';
banner.style.cssText = 'position:sticky;top:0;z-index:1000;background:#ffe37a;color:#211900;padding:14px 20px;border-bottom:4px solid #17120a;font:700 16px/1.5 system-ui;box-shadow:0 4px 12px #0005';
banner.innerHTML = '<div>LOCAL EVM SIMULATION — NOT MONAD TESTNET</div><div style="font-size:13px;font-weight:500">Three unlocked public test accounts · no real funds · fake local finality · never publish this harness</div><label for="local-account">Act as: </label><select id="local-account" style="margin:8px 8px 0;padding:6px;background:#fff;color:#211900;border:1px solid #4b3811;border-radius:5px;font:inherit"></select><span id="local-account-address" style="font-size:12px;overflow-wrap:anywhere"></span>';
document.body.prepend(banner);
const listeners = new Map();
let requestId = 0;
async function rpc(method, params = []) {
  const response = await fetch('/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }) });
  const message = await response.json();
  if (message.error) { const error = new Error(message.error.message); error.code = message.error.code; error.data = message.error.data; throw error; }
  return message.result;
}
const accounts = (await rpc('eth_accounts')).slice(0, 3);
if (accounts.length !== 3) throw new Error('Local harness requires three isolated test accounts');
let selected = accounts[0];
const selector = document.getElementById('local-account');
for (let i = 0; i < accounts.length; i++) { const option = document.createElement('option'); option.value = accounts[i]; option.textContent = `${['A · host and participant', 'B · host and participant', 'C · waiting participant'][i]} (${accounts[i].slice(0, 8)}…)`; selector.append(option); }
document.getElementById('local-account-address').textContent = selected;
function emit(type, value) { for (const callback of listeners.get(type) ?? []) callback(value); }
selector.addEventListener('change', () => { selected = selector.value; document.getElementById('local-account-address').textContent = selected; emit('accountsChanged', [selected]); });
const provider = {
  isLocalHarness: true,
  async request({ method, params = [] }) {
    if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [selected];
    if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
      if (Number(params[0]?.chainId) !== 10143) throw Object.assign(new Error('Harness only supports its isolated 10143 chain'), { code: 4902 });
      return null;
    }
    if (method === 'eth_sendTransaction' && params[0]?.from?.toLowerCase() !== selected.toLowerCase()) throw new Error('Switch to the requested local account before sending');
    if (method === 'eth_signTypedData_v4' && params[0]?.toLowerCase() !== selected.toLowerCase()) throw new Error('Switch to the requested local account before signing');
    return rpc(method, params);
  },
  on(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
  removeListener(type, callback) { listeners.get(type)?.delete(callback); },
};
Object.defineProperty(window, 'ethereum', { value: provider, configurable: true });
const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: { uuid: 'omp-local-test-provider', name: 'LOCAL TEST WALLET · no funds', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>', rdns: 'local.one-more-person.test' }, provider } }));
window.addEventListener('eip6963:requestProvider', announce);
// Test accounts are deliberately visible in the form; this is fixture setup, not a connected real wallet.
for (const [index, suffix] of ['a', 'b', 'c'].entries()) document.getElementById(`participant-${suffix}`).value = accounts[index];
await import('/live.bundle.js');
