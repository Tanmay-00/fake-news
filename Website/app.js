/* ═══════════════════════════════════════════════ */
/* THEME TOGGLE                                    */
/* ═══════════════════════════════════════════════ */
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

/* ═══════════════════════════════════════════════ */
/* NAVBAR SCROLL                                   */
/* ═══════════════════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
});

/* ═══════════════════════════════════════════════ */
/* MOBILE MENU                                     */
/* ═══════════════════════════════════════════════ */
const mobileBtn = document.getElementById('mobile-menu-btn');
const navLinks = document.getElementById('nav-links');
mobileBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ═══════════════════════════════════════════════ */
/* HERO STAT COUNTER ANIMATION                     */
/* ═══════════════════════════════════════════════ */
function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const isDecimal = target % 1 !== 0;
    const duration = 1800;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}

const heroObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounters(); heroObserver.disconnect(); } });
}, { threshold: 0.3 });
const heroSection = document.getElementById('hero');
if (heroSection) heroObserver.observe(heroSection);

/* ═══════════════════════════════════════════════ */
/* SCANNER TABS                                    */
/* ═══════════════════════════════════════════════ */
document.querySelectorAll('.scanner-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.scanner-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isUrl = tab.dataset.tab === 'url';
    document.getElementById('text-input-group').classList.toggle('hidden', isUrl);
    document.getElementById('url-input-group').classList.toggle('hidden', !isUrl);
  });
});

/* ═══════════════════════════════════════════════ */
/* SCANNER ANALYSIS SIMULATION                     */
/* ═══════════════════════════════════════════════ */
const analyzeBtn = document.getElementById('analyze-btn');
const resultsEl = document.getElementById('scanner-results');

const DEMO_CLAIMS = [
  { text: "Global temperatures have risen by 5°C in the last decade.", verdict: "false", label: "FALSE" },
  { text: "The WHO declared a new public health emergency.", verdict: "true", label: "TRUE" },
  { text: "Unemployment has dropped to historic lows nationwide.", verdict: "misleading", label: "MISLEADING" },
  { text: "A new vaccine was approved with 95% efficacy.", verdict: "true", label: "TRUE" },
];

const DEMO_EVIDENCE = [
  { type: "support", source: "Reuters", summary: "Multiple independent sources confirm the WHO announcement as factually accurate." },
  { type: "support", source: "Associated Press", summary: "Official statistics corroborate the reported vaccine efficacy within a 2% margin." },
  { type: "contra", source: "Fact-Check.org", summary: "Temperature claim exaggerates findings — actual rise was 1.1°C, not 5°C." },
  { type: "contra", source: "Snopes", summary: "Unemployment claim omits key context about seasonal adjustments and underemployment." },
];

const HEATMAP_WORDS = [
  { word: "BREAKING:", level: "high" }, { word: "Scientists", level: "" }, { word: "confirm", level: "" },
  { word: "SHOCKING", level: "high" }, { word: "truth", level: "medium" }, { word: "about", level: "" },
  { word: "global", level: "" }, { word: "temperatures.", level: "" }, { word: "You", level: "" },
  { word: "WON'T", level: "high" }, { word: "BELIEVE", level: "high" }, { word: "what", level: "" },
  { word: "they", level: "" }, { word: "found!", level: "medium" }, { word: "Every", level: "" },
  { word: "expert", level: "low" }, { word: "is", level: "" }, { word: "TERRIFIED", level: "high" },
  { word: "by", level: "" }, { word: "these", level: "" }, { word: "unprecedented", level: "medium" },
  { word: "results.", level: "" }, { word: "Act", level: "medium" }, { word: "NOW", level: "high" },
  { word: "before", level: "" }, { word: "it's", level: "" }, { word: "too", level: "" },
  { word: "late!", level: "medium" },
];

analyzeBtn.addEventListener('click', () => {
  const textInput = document.getElementById('scanner-textarea').value.trim();
  const urlInput = document.getElementById('scanner-url-input').value.trim();
  const activeTab = document.querySelector('.scanner-tab.active').dataset.tab;

  if ((activeTab === 'text' && !textInput) || (activeTab === 'url' && !urlInput)) {
    analyzeBtn.textContent = 'Please enter content first!';
    setTimeout(() => { analyzeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Analyze Now'; }, 2000);
    return;
  }

  resultsEl.classList.remove('hidden');
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Reset
  document.querySelectorAll('.progress-step').forEach(s => { s.classList.remove('active', 'done'); });
  document.getElementById('confidence-fill').style.width = '0%';
  document.getElementById('confidence-score').textContent = '0%';

  // Animate progress steps
  const steps = document.querySelectorAll('.progress-step');
  const delays = [0, 600, 1200, 1800, 2400];
  steps.forEach((step, i) => {
    setTimeout(() => { step.classList.add('active'); if (i > 0) steps[i - 1].classList.remove('active'); if (i > 0) steps[i - 1].classList.add('done'); }, delays[i]);
  });

  // Show results after pipeline completes
  setTimeout(() => {
    steps[steps.length - 1].classList.remove('active');
    steps[steps.length - 1].classList.add('done');

    // Verdict
    const badge = document.getElementById('verdict-badge-display');
    badge.className = 'verdict-badge verdict-misleading';
    badge.querySelector('.verdict-text').textContent = 'MISLEADING';

    // Confidence
    const score = 73;
    document.getElementById('confidence-fill').style.width = score + '%';
    document.getElementById('confidence-score').textContent = score + '%';

    // Claims
    const claimsList = document.getElementById('claims-list');
    claimsList.innerHTML = '';
    DEMO_CLAIMS.forEach(claim => {
      const div = document.createElement('div');
      div.className = 'claim-item';
      const verdictClass = claim.verdict === 'true' ? 'verdict-true' : claim.verdict === 'false' ? 'verdict-false' : 'verdict-misleading';
      div.innerHTML = `<span class="claim-verdict ${verdictClass}">${claim.label}</span><span class="claim-text">${claim.text}</span>`;
      claimsList.appendChild(div);
    });

    // Evidence
    const evidenceGrid = document.getElementById('evidence-grid');
    evidenceGrid.innerHTML = '';
    DEMO_EVIDENCE.forEach(ev => {
      const div = document.createElement('div');
      div.className = 'evidence-card';
      div.innerHTML = `<div class="ev-type ${ev.type === 'support' ? 'ev-support' : 'ev-contra'}">${ev.type === 'support' ? '✅ Supporting' : '❌ Contradicting'}</div><div class="ev-source">${ev.source}</div><p class="ev-summary">${ev.summary}</p>`;
      evidenceGrid.appendChild(div);
    });

    // Heatmap
    const heatmapContent = document.getElementById('heatmap-content');
    heatmapContent.innerHTML = HEATMAP_WORDS.map(w =>
      w.level ? `<span class="heatmap-word heat-${w.level}">${w.word}</span>` : w.word
    ).join(' ');

    // Explanation
    document.getElementById('explanation-text').textContent =
      'This article contains a mix of verified and unverified claims. The core WHO announcement is confirmed by multiple sources. However, the temperature claim significantly exaggerates actual data (1.1°C vs 5°C), and the unemployment statistic omits critical context about seasonal adjustments. The article also uses several clickbait patterns including urgency cues ("ACT NOW"), fear language ("TERRIFIED"), and sensationalist framing ("SHOCKING truth", "WON\'T BELIEVE"). Overall verdict: Misleading — some facts are accurate but presented in a manipulative context.';
  }, 3200);
});

/* ═══════════════════════════════════════════════ */
/* KNOWLEDGE GRAPH CANVAS                          */
/* ═══════════════════════════════════════════════ */
const canvas = document.getElementById('knowledge-graph-canvas');

function drawGraph() {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width - 48;
  canvas.height = 450;
  const W = canvas.width, H = canvas.height;
  const isDark = html.getAttribute('data-theme') === 'dark';

  const nodes = [
    { x: W * 0.5, y: H * 0.12, r: 22, label: 'Claim A', color: '#6366f1', type: 'claim' },
    { x: W * 0.25, y: H * 0.35, r: 18, label: 'Reuters', color: '#22c55e', type: 'trusted' },
    { x: W * 0.75, y: H * 0.3, r: 18, label: 'AP News', color: '#22c55e', type: 'trusted' },
    { x: W * 0.15, y: H * 0.6, r: 15, label: 'BlogX', color: '#ef4444', type: 'low' },
    { x: W * 0.45, y: H * 0.55, r: 16, label: 'Snopes', color: '#22c55e', type: 'trusted' },
    { x: W * 0.7, y: H * 0.6, r: 14, label: 'NewsY', color: '#f59e0b', type: 'moderate' },
    { x: W * 0.5, y: H * 0.82, r: 20, label: 'Claim B', color: '#6366f1', type: 'claim' },
    { x: W * 0.85, y: H * 0.45, r: 17, label: 'WHO', color: '#22c55e', type: 'trusted' },
    { x: W * 0.3, y: H * 0.82, r: 13, label: 'FakeDaily', color: '#ef4444', type: 'low' },
    { x: W * 0.65, y: H * 0.85, r: 15, label: 'PolitiFact', color: '#22c55e', type: 'trusted' },
    { x: W * 0.1, y: H * 0.4, r: 12, label: 'TweetZ', color: '#f59e0b', type: 'moderate' },
    { x: W * 0.88, y: H * 0.75, r: 14, label: 'BBC', color: '#22c55e', type: 'trusted' },
  ];

  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 7], [5, 6], [6, 8], [6, 9], [6, 11],
    [3, 10], [7, 11], [4, 6], [1, 10], [5, 7], [9, 11],
  ];

  ctx.clearRect(0, 0, W, H);

  // Draw edges
  edges.forEach(([a, b]) => {
    ctx.beginPath();
    ctx.moveTo(nodes[a].x, nodes[a].y);
    ctx.lineTo(nodes[b].x, nodes[b].y);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Draw nodes
  nodes.forEach(node => {
    // Glow
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + 6, 0, Math.PI * 2);
    ctx.fillStyle = node.color + '18';
    ctx.fill();

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = node.color + '30';
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = isDark ? '#e4e4e7' : '#27272a';
    ctx.font = `${Math.max(10, node.r * 0.55)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y);
  });
}

drawGraph();
window.addEventListener('resize', drawGraph);
// Redraw on theme change
const origSetTheme = setTheme;
// Observe theme attribute
new MutationObserver(drawGraph).observe(html, { attributes: true, attributeFilter: ['data-theme'] });

/* ═══════════════════════════════════════════════ */
/* CHATBOT                                         */
/* ═══════════════════════════════════════════════ */
const chatToggle = document.getElementById('chatbot-toggle');
const chatPanel = document.getElementById('chatbot-panel');
const chatClose = document.getElementById('chatbot-close');
const chatInput = document.getElementById('chatbot-input');
const chatSend = document.getElementById('chatbot-send');
const chatMessages = document.getElementById('chatbot-messages');

chatToggle.addEventListener('click', () => chatPanel.classList.toggle('hidden'));
chatClose.addEventListener('click', () => chatPanel.classList.add('hidden'));

function addChatMessage(text, isUser) {
  const div = document.createElement('div');
  div.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;
  div.innerHTML = `<p>${text}</p>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

const BOT_RESPONSES = {
  'why is this article misleading?': 'The article mixes verified facts with exaggerated claims. The temperature data was inflated from 1.1°C to 5°C, and urgency language like "ACT NOW" and "TERRIFIED" are classic manipulation tactics.',
  'show me the evidence': 'Supporting: Reuters and AP confirm the WHO announcement. Contradicting: Fact-Check.org found temperature claims exaggerated by 4.5x. Snopes found unemployment data missing seasonal context.',
  'how does the scoring work?': 'Our confidence score (0-100%) is calculated by weighing: source credibility (40%), evidence consistency (30%), bias signals (20%), and cross-reference matches (10%). Scores above 80% indicate high confidence.',
};

function handleChat() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  addChatMessage(msg, true);
  chatInput.value = '';

  setTimeout(() => {
    const lower = msg.toLowerCase();
    const response = Object.entries(BOT_RESPONSES).find(([key]) => lower.includes(key.split(' ').slice(0, 3).join(' ')));
    addChatMessage(response ? response[1] : "I can help with fact-checking analysis! Try asking about why an article is misleading, evidence details, or how the confidence scoring works.", false);
  }, 800);
}

chatSend.addEventListener('click', handleChat);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleChat(); });
document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    chatInput.value = btn.dataset.msg;
    handleChat();
  });
});

/* ═══════════════════════════════════════════════ */
/* COPY BUTTONS                                    */
/* ═══════════════════════════════════════════════ */
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
      setTimeout(() => {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1500);
    } catch (err) { /* clipboard not available */ }
  });
});

/* ═══════════════════════════════════════════════ */
/* SCROLL REVEAL ANIMATIONS                        */
/* ═══════════════════════════════════════════════ */
const revealElements = document.querySelectorAll(
  '.feature-card, .step-card, .trust-card, .pipeline-node, .verdict-card, .comp-card, .contact-box'
);
revealElements.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 60);
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

/* ═══════════════════════════════════════════════ */
/* SMOOTH SCROLL FOR CTA                           */
/* ═══════════════════════════════════════════════ */
document.getElementById('nav-cta').addEventListener('click', () => {
  document.getElementById('scanner').scrollIntoView({ behavior: 'smooth' });
});
