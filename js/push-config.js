// push-config.js — the ONE place that switches push alerts on. Read by every page AND by sw.js.
// Leave it '' and alerts stay completely off (no prompts, no bell, nothing sent).
// After setting up the push worker (PUSH_SETUP.md, step 4), paste its address between the quotes, e.g.
//   self.MO_PUSH_API = 'https://mathura-push.yourname.workers.dev';
self.MO_PUSH_API = 'https://mathura-push.mathuraoverseas.workers.dev/';
