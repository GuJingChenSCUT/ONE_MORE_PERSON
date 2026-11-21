"""Mojo credential lifecycle; never prints the agent secret."""
from pathlib import Path
import json, sys, urllib.request, urllib.error

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://mojo.devnads.com'
CREDENTIALS = ROOT / '.mojo' / 'agent.json'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def api(method, path, payload=None, authenticated=False):
    if not path.startswith('/api/agent/'):
        raise ValueError('Only Mojo Agent API paths are allowed')
    headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
    if authenticated:
        credentials = json.loads(CREDENTIALS.read_text(encoding='utf-8-sig'))
        if credentials.get('baseUrl') != BASE:
            raise ValueError('Credential origin mismatch')
        headers['Authorization'] = 'Bearer ' + credentials['agentSecret']
    req = urllib.request.Request(BASE + path, data=None if payload is None else json.dumps(payload, ensure_ascii=False).encode(), headers=headers, method=method)
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=180 if path == '/api/agent/mentor' else 30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        try:
            body = json.load(error)
        except (ValueError, OSError):
            body = {}
        return error.code, {'error': body.get('error'), 'quota': body.get('quota')}

def status():
    code, result = api('GET', '/api/agent/me', authenticated=True)
    data = result.get('data', {})
    agent = data.get('agent') or {}
    safe = {'httpStatus': code, 'status': agent.get('status'), 'name': agent.get('name'), 'hasClaimedUser': bool(data.get('claimedUser'))}
    if code == 200 and agent.get('status') != 'claimed':
        safe['claimUrl'] = json.loads(CREDENTIALS.read_text(encoding='utf-8-sig')).get('claimUrl')
    return safe

def setup():
    if CREDENTIALS.exists():
        try:
            json.loads(CREDENTIALS.read_text(encoding='utf-8-sig'))['agentSecret']
        except (ValueError, KeyError):
            pass
        else:
            current = status()
            if current['httpStatus'] not in (401, 403):
                return {'reused': True, **current}
    CREDENTIALS.parent.mkdir(exist_ok=True)
    (CREDENTIALS.parent / '.gitignore').write_text('*\n', encoding='utf-8')
    code, result = api('POST', '/api/agent/register', {'description': ROOT.name + ' · Monad Blitz@广州'})
    if code != 201:
        return {'httpStatus': code, 'registered': False}
    data = result['data']
    record = {'baseUrl': BASE, 'eventId': 18, 'eventTitle': 'Monad Blitz@广州', 'agentId': data['agentId'], 'agentSecret': data['agentSecret'], 'claimUrl': data['claimUrl']}
    CREDENTIALS.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'registered': True, 'name': data['name'], 'claimUrl': data['claimUrl']}

if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else 'status'
    if action not in ('setup', 'status', 'projects', 'mentor'):
        raise SystemExit('Usage: mojo.py setup|status|projects|mentor <approved-idea-file>')
    try:
        if action == 'projects':
            code, body = api('GET', '/api/agent/projects?eventId=18', authenticated=True)
            data = body.get('data', {})
            result = {'httpStatus': code, 'event': data.get('event'), 'project': data.get('project'), 'error': body.get('error')}
        elif action == 'mentor':
            idea = (ROOT / sys.argv[2]).read_text(encoding='utf-8-sig')
            code, body = api('POST', '/api/agent/mentor', {'idea': idea}, authenticated=True)
            result = {'httpStatus': code, **body}
            if code == 200:
                (ROOT / '.mojo' / 'mentor-response.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        else:
            result = setup() if action == 'setup' else status()
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'errorType': type(error).__name__, 'message': 'Mojo request failed; credentials were not logged.'}))
        raise SystemExit(1)
