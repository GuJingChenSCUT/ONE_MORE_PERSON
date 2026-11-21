// The only files allowed in the public static site. No credentials or source attachments.
export const sourceAssets = ['index.html','zh.html','relay.js','app.js','app.zh.js','styles.css','evidence.js',
  'live.html','live.css','break.html','break.css','pitch.html','pitch.css','pitch.js',
  'demo.html','demo.js','demo.css','demo-state.mjs','demo-guide.html','story.html','story.css','story.js'];
export const bundles = { 'live.js':'live.bundle.js', 'break.js':'break.bundle.js' };
export const evidenceAssets = ['network.json','local-demo.json','monad-proof-evidence.json','cancellation-proof.json','challenge-timings.json'];
export const publicAssets = [...sourceAssets,'alice.html','bob.html','charlie.html',...Object.values(bundles),'replay.mjs','live-artifact.json',
  'evidence/deployment.json',...evidenceAssets.map(name=>'evidence/'+name)];
