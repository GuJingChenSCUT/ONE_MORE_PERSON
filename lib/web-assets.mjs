// The only files allowed in the public static site. No credentials or source attachments.
export const sourceAssets = ['index.html','zh.html','relay.js','app.js','app.zh.js','styles.css','evidence.js',
  'live.html','live.css','break.html','break.css','pitch.html','pitch.css','pitch.js'];
export const bundles = { 'live.js':'live.bundle.js', 'break.js':'break.bundle.js' };
export const evidenceAssets = ['network.json','local-demo.json','monad-proof-evidence.json','cancellation-proof.json','challenge-timings.json'];
export const publicAssets = [...sourceAssets,...Object.values(bundles),'replay.mjs','live-artifact.json',
  'evidence/deployment.json',...evidenceAssets.map(name=>'evidence/'+name)];
