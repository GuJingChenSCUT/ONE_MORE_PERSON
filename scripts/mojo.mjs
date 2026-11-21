import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://mojo.devnads.com';
const credentialsPath = path.join(root, '.mojo/agent.json');
const credentials = () => {
  const value = JSON.parse(fs.readFileSync(credentialsPath, 'utf8').replace(/^\uFEFF/, ''));
  if (value.baseUrl !== base || value.eventId !== 18 || !value.agentSecret) throw new Error('Invalid credential origin or event');
  return value;
};
async function api(method, route, payload) {
  if (!route.startsWith('/api/agent/')) throw new Error('Unsupported route');
  const response = await fetch(base + route, { method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { authorization: `Bearer ${credentials().agentSecret}`, 'content-type': 'application/json', accept: 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload) });
  const body = await response.json();
  if (!response.ok) {
    // Only documented user-facing errors; never dump headers or credential objects.
    console.error(JSON.stringify({ httpStatus: response.status, error: body.error, code: body.code, fieldErrors: body.fieldErrors, completeUrl: body.completeUrl }));
    throw new Error('MOJO request was not accepted');
  }
  return body.data;
}
async function projects() { return api('GET', '/api/agent/projects?eventId=18'); }
function localFile(name) {
  const file = path.resolve(root, name ?? '');
  if (!file.startsWith(root + path.sep)) throw new Error('Input must be a file in this project');
  return file;
}
const [action = 'status', file, confirmation] = process.argv.slice(2);
try {
  fs.mkdirSync(path.join(root, '.mojo'), { recursive: true });
  fs.writeFileSync(path.join(root, '.mojo/.gitignore'), '*\n');
  if (action === 'status') {
    const data = await api('GET', '/api/agent/me');
    console.log(JSON.stringify({ status: data.agent.status, name: data.agent.name, hasClaimedUser: !!data.claimedUser }));
  } else if (action === 'projects') {
    console.log(JSON.stringify(await projects()));
  } else if (action === 'upload') {
    const input = localFile(file), bytes = fs.readFileSync(input);
    const contentType = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(input).toLowerCase()];
    if (!contentType || bytes.length > 10 * 1024 * 1024) throw new Error('Screenshot must be PNG, JPEG or WebP, at most 10 MB');
    const upload = await api('POST', '/api/agent/uploads', { filename: path.basename(input), contentType, size: bytes.length });
    if (new URL(upload.uploadUrl).protocol !== 'https:') throw new Error('Insecure upload URL');
    const response = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'content-type': contentType }, body: bytes, redirect: 'error', signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Screenshot upload HTTP ${response.status}`);
    await api('POST', '/api/agent/uploads/confirm', { uuid: upload.uuid });
    const screenshot = { uuid: upload.uuid, path: upload.path };
    fs.writeFileSync(path.join(root, '.mojo/screenshot.json'), JSON.stringify(screenshot, null, 2));
    console.log(JSON.stringify({ uploaded: true, ...screenshot }));
  } else if (action === 'submit') {
    if (confirmation !== '--confirmed') throw new Error('Review the prepared description and obtain user confirmation before submit <file> --confirmed');
    const payload = JSON.parse(fs.readFileSync(localFile(file), 'utf8'));
    if (payload.eventId !== 18 || !payload.meta?.screenshots?.length) throw new Error('Event 18 and a confirmed uploaded screenshot are required');
    for (const value of [payload.url, payload.meta.github]) if (new URL(value).protocol !== 'https:') throw new Error('Public links must use HTTPS');
    const current = await projects();
    if (current.event.status !== 'ongoing' && !(current.event.registration.allowSubmitDuringRegistration && ['registration', 'upcoming'].includes(current.event.status))) throw new Error('Submission is not currently open');
    const update = !!current.project;
    if (update) delete payload.eventId;
    const project = await api(update ? 'PATCH' : 'POST', update ? `/api/agent/projects/${current.project.id}` : '/api/agent/projects', payload);
    fs.writeFileSync(path.join(root, '.mojo/submission-result.json'), JSON.stringify(project, null, 2));
    console.log(JSON.stringify({ updated: update, project }));
  } else throw new Error('Usage: mojo.mjs status|projects|upload <screenshot>|submit <payload> --confirmed');
} catch (error) {
  console.error(error instanceof TypeError ? 'Request failed; no credentials logged.' : error.message);
  process.exitCode = 1;
}
