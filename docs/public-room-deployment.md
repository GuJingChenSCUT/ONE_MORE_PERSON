# Public access status

**Updated scope:** the owner selected a public three-page interaction simulation with synchronization inside one browser profile, while preserving the local real-contract room and Monad proof. The new static routes are `demo.html`, `alice.html`, `bob.html`, `charlie.html` and `demo-guide.html`; see `public-three-page-demo.md` and `config/site.json` for release details. The cloud authorization blocker below applies only to hosting the real shared EVM service, not the explicitly simulated static option.

The published presentation is available at https://one-more-person-guangzhou.justdog33.chatgpt.site. It is the existing static presentation, challenge simulation and wallet lab. It is not the three-person shared rehearsal service.

The three-person room is still running at `http://127.0.0.1:4180/` on the prepared laptop. No public URL for that room has been issued or verified.

On 21 November 2026, launching a local public tunnel was rejected by automatic approval review (`blocked by policy`, no more specific reason supplied). The tunnel was not started. A separate managed cloud deployment was investigated; the ProductOS connector requires reauthentication. The user reported reconnecting, but the subsequent usage and project-list calls still returned `UNAUTHORIZED`. Deployment is pending a working connection. Do not describe the prepared gateway as a live cloud deployment.

## Prepared cloud entry point

Use a dedicated, single-instance Node container with Node 22.10+ (the repository CI uses Node 24) and pnpm 11.25.0. Install with `pnpm install --frozen-lockfile`. Configure `OMP_PUBLIC_ORIGIN` as the exact allocated HTTPS origin, without a trailing slash, and `PORT` as the provider's HTTP port. Start with:

```sh
node scripts/serve-cloud-rehearsal.mjs
```

The entry point starts an isolated Hardhat rehearsal on loopback port 4180, then an HTTP gateway on the cloud container's allocated port. It is not suitable for stateless serverless functions, multiple replicas or a production booking service. Restarting the process loses the demo round. No secrets, actual user identity data or public funds are required. Public role selection is deliberately a fictional demonstration, not production authentication.

The gateway serves only the three app assets, `/demo-guide.pdf`, and the state, evidence, login, logout and action endpoints. Configure the provider health check as `/healthz`. Other routes check the exact host; writes validate origins and body size. It never serves repository files or a generic RPC endpoint. Public clients poll the same authoritative room every 1.5 seconds so hosting proxies need not support event streams. Direct laptop pages continue using server-sent events.

Once the cloud service is live, its role links are the returned HTTPS origin followed by `/?role=alice`, `/?role=bob` and `/?role=charlie`. Do not replace the loopback links in the main runbook until the cloud deployment has been verified. A cloud rehearsal still uses isolated EVM chain 31337; the recorded public Monad Testnet proof on chain 10143 remains separate.

## Validation before sharing a cloud URL

The local automated suite passes 34 checks, including gateway route isolation, host validation, same-origin writes, request size limits and forwarding. Cloud startup and public browser behavior remain unverified until hosting access is restored.

After deployment, confirm all three roles can log in, two hosts can approve, three signatures are accepted, withdrawal preserves every seat, the old plan reverts, a fresh plan succeeds, and all tabs display Charlie / Alice / Bob. Download the record, then reset to the starting state for presentation. Also verify the downloadable PDF and keep the public-chain evidence boundary visible.
