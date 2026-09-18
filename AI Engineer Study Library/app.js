(function () {
  'use strict';

  const notes = Array.isArray(window.STUDY_NOTES) ? window.STUDY_NOTES : [];
  const homeView = document.getElementById('homeView');
  const noteView = document.getElementById('noteView');
  const sidebarSearch = document.getElementById('sidebarSearch');
  const phaseList = document.getElementById('phaseList');
  const breadcrumbs = document.getElementById('breadcrumbs');
  const phaseColors = ['#9af3bf', '#83b6ff', '#c1a2ff', '#ffb86c', '#ff8f9d'];
  const phaseIcons = ['◌', '⌁', '✦', '◇', '⊹', '∿', '▦', '↗', '◈', '⌘'];
  const favoritesKey = 'ai-engineer-study-favorites';
  const recentKey = 'ai-engineer-study-recent';
  let favorites = new Set(readStorage(favoritesKey));
  let recent = readStorage(recentKey);
  let activePhase = null;

  const phaseMap = new Map();
  notes.forEach(note => {
    if (note.phaseNumber > 0 && !phaseMap.has(note.phaseNumber)) phaseMap.set(note.phaseNumber, { number: note.phaseNumber, label: note.phaseLabel, notes: [] });
    if (note.phaseNumber > 0) phaseMap.get(note.phaseNumber).notes.push(note);
  });
  const phases = [...phaseMap.values()].sort((a, b) => a.number - b.number);
  const noteByPath = new Map(notes.map(note => [normalize(note.path), note]));

  function readStorage(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; } }
  function saveStorage(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
  function normalize(path) { return String(path || '').replace(/\\/g, '/').replace(/^\.\//, ''); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch])); }
  function slugify(value) { return String(value).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'); }
  function titleCase(value) { return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function getRootDocs() { return notes.filter(n => n.phaseNumber === 0); }
  function getNoteCount() { return notes.filter(n => n.phaseNumber > 0 && !/\/README\.md$/i.test(n.path)).length; }
  function getTopicCount(phase) { return phase.notes.filter(n => !/\/README\.md$/i.test(n.path)).length; }

  function initSidebar() {
    phaseList.innerHTML = phases.map((phase, index) => `
      <button class="phase-link" data-phase="${phase.number}" title="${escapeHtml(phase.label)}">
        <span class="phase-number">${String(phase.number).padStart(2, '0')}</span><span>${escapeHtml(shortPhase(phase.label))}</span>
      </button>`).join('');
    phaseList.addEventListener('click', event => {
      const button = event.target.closest('[data-phase]');
      if (!button) return;
      closeMobileSidebar();
      showPhase(Number(button.dataset.phase));
    });
    document.getElementById('sidebarNoteCount').textContent = `${getNoteCount()} notes`;
    document.getElementById('sidebarProgress').style.width = `${Math.min(100, Math.round(getNoteCount() / Math.max(1, notes.length) * 100))}%`;
    updateFavoriteCount();
  }

  function shortPhase(label) { return label.replace(/^Phase\s+\d+\s*[·:-]?\s*/i, '').replace(/\s+/g, ' '); }
  function updateFavoriteCount() { document.getElementById('favoriteCount').textContent = favorites.size || ''; }
  function setActiveNav(route) { document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.route === route)); }
  function setActivePhase(number) { document.querySelectorAll('.phase-link').forEach(item => item.classList.toggle('active', Number(item.dataset.phase) === number)); }

  function renderHome() {
    activePhase = null; setActiveNav('home'); setActivePhase(null);
    noteView.classList.add('hidden'); homeView.classList.remove('hidden');
    breadcrumbs.innerHTML = '<span>Study Library</span><span><strong>Overview</strong></span>';
    const rootDocs = getRootDocs();
    homeView.innerHTML = `
      <div class="hero">
        <h1>Learn the systems behind <em>useful AI.</em></h1>
        <p class="hero-copy">A structured field guide for going from machine-learning fundamentals to production-grade LLM, RAG, agent, and Google Cloud conversations.</p>
        <div class="hero-actions">
          <button class="primary-btn" id="startLearning">Start with foundations <span>→</span></button>
          <button class="secondary-btn" id="randomHero">Surprise me <span>⤨</span></button>
        </div>
        <div class="stats-row">
          <div class="stat"><div class="stat-number">${getNoteCount()}</div><div class="stat-label">study notes</div></div>
          <div class="stat"><div class="stat-number">${phases.length}</div><div class="stat-label">learning phases</div></div>
          <div class="stat"><div class="stat-number">10×</div><div class="stat-label">interview-ready format</div></div>
        </div>
      </div>
      <div class="section-heading"><div><h2>The roadmap</h2><p>Move from first principles to architecture, delivery, and interview fluency.</p></div><button class="section-link" id="showAllPhases">View all notes →</button></div>
      <div class="phase-grid">${phases.slice(0, 12).map((phase, index) => phaseCard(phase, index)).join('')}</div>
      ${phases.length > 12 ? `<div class="more-phases"><button class="secondary-btn" id="showMorePhases">Show all ${phases.length} phases</button></div>` : ''}
      <div class="callout"><div class="callout-icon">✦</div><div class="callout-copy"><strong>How to use this library.</strong> Read one concept, say the interview answer out loud, then use the follow-ups to test whether you can reason beyond the definition.</div></div>
      ${rootDocs.length ? `<div class="section-heading"><div><h2>Library notes</h2><p>Context and working conventions behind this study system.</p></div></div><div class="library-docs">${rootDocs.map(doc => `<button class="doc-chip" data-note-path="${encodeURIComponent(doc.path)}">${escapeHtml(doc.title)}</button>`).join('')}</div>` : ''}
    `;
    document.getElementById('startLearning').onclick = () => showPhase(1);
    document.getElementById('randomHero').onclick = openRandomNote;
    document.getElementById('randomNote').onclick = openRandomNote;
    document.getElementById('showAllPhases').onclick = () => showPhaseList();
    const more = document.getElementById('showMorePhases'); if (more) more.onclick = showPhaseList;
    homeView.querySelectorAll('[data-phase-card]').forEach(card => card.onclick = () => showPhase(Number(card.dataset.phaseCard)));
    homeView.querySelectorAll('[data-note-path]').forEach(button => button.onclick = () => showNote(decodeURIComponent(button.dataset.notePath)));
  }

  function phaseCard(phase, index) {
    const accent = phaseColors[index % phaseColors.length];
    return `<button class="phase-card" style="--card-accent:${accent}" data-phase-card="${phase.number}"><div class="phase-card-top"><span class="phase-index">PHASE ${String(phase.number).padStart(2, '0')}</span><span class="phase-icon">${phaseIcons[index % phaseIcons.length]}</span></div><h3>${escapeHtml(shortPhase(phase.label))}</h3><p>${phaseDescription(phase.number)}</p><div class="phase-card-meta"><span>${getTopicCount(phase)} notes</span><strong>Explore →</strong></div></button>`;
  }

  function phaseDescription(number) {
    const descriptions = { 1: 'The language of learning systems, data, and metrics.', 2: 'Neural networks, representation, and deep learning mechanics.', 3: 'Attention, architecture, and the transformer mental model.', 4: 'How language models learn, generate, and fail.', 5: 'Turn intent into reliable, structured model behavior.', 6: 'Make meaning searchable with vector representations.', 7: 'Store, index, and retrieve high-dimensional knowledge.', 8: 'Build the core retrieval-augmented generation loop.', 9: 'Improve quality with advanced retrieval strategies.', 10: 'Chunk knowledge so retrieval has the right context.', 11: 'Design retrieval that is relevant, robust, and fast.', 12: 'Measure what your RAG system actually does.', 13: 'Recognize and debug the ways RAG systems break.', 14: 'Protect AI systems from data and prompt threats.', 15: 'Compose LLM applications with practical building blocks.', 16: 'Orchestrate stateful, branching workflows with graphs.', 17: 'Design systems that can plan, use tools, and act.', 18: 'Combine agency and retrieval for adaptive answers.', 19: 'Understand Gemini as a multimodal model family.', 20: 'Build, deploy, and operate models on Vertex AI.', 21: 'Create production agent workflows with Google ADK.', 22: 'Evaluate models and applications with discipline.', 23: 'Operate AI systems across the delivery lifecycle.', 24: 'Make LLM inference faster, smaller, and more reliable.', 25: 'Reduce token, model, and infrastructure costs.', 26: 'Build safer, fairer, more governable AI.', 27: 'Reason across text, images, audio, and video.', 28: 'Connect requirements to scalable AI architectures.', 29: 'Practice the coding patterns AI engineers use.', 30: 'Sharpen the Python and tensor tools behind AI.', 31: 'Defend a banking FAQ RAG project end to end.', 32: 'Explain a LangGraph project with architectural depth.', 33: 'Practice ambiguity, trade-offs, and real scenarios.', 34: 'Prepare for Google-specific AI platform questions.', 35: 'Make your experience clear, honest, and memorable.', 36: 'Fast recall for the final stretch before interviews.', 37: 'Simulate the interview and practice thinking aloud.' };
    return descriptions[number] || 'A focused collection of interview-ready AI engineering notes.';
  }

  function showPhaseList() {
    activePhase = null; setActiveNav('home'); setActivePhase(null); noteView.classList.add('hidden'); homeView.classList.remove('hidden');
    breadcrumbs.innerHTML = '<span>Study Library</span><span><strong>All phases</strong></span>';
    homeView.innerHTML = `<div class="search-header"><div><h1>All phases</h1><p>Choose a thread and build your understanding one note at a time.</p></div></div><div class="phase-grid">${phases.map((phase, index) => phaseCard(phase, index)).join('')}</div>`;
    homeView.querySelectorAll('[data-phase-card]').forEach(card => card.onclick = () => showPhase(Number(card.dataset.phaseCard)));
  }

  function showPhase(number) {
    const phase = phaseMap.get(number); if (!phase) return;
    activePhase = number; setActiveNav('home'); setActivePhase(number); noteView.classList.add('hidden'); homeView.classList.remove('hidden');
    breadcrumbs.innerHTML = `<span>Study Library</span><span><strong>${escapeHtml(shortPhase(phase.label))}</strong></span>`;
    const topicNotes = phase.notes.filter(n => !/\/README\.md$/i.test(n.path));
    homeView.innerHTML = `<div class="search-header"><div><div class="eyebrow">Phase ${String(number).padStart(2, '0')}</div><h1>${escapeHtml(shortPhase(phase.label))}</h1><p>${phaseDescription(number)} ${topicNotes.length} notes to explore.</p></div></div><div class="result-list">${topicNotes.map(resultCard).join('')}</div>`;
    homeView.querySelectorAll('[data-note-path]').forEach(card => card.onclick = () => showNote(decodeURIComponent(card.dataset.notePath)));
  }

  function resultCard(note) {
    return `<button class="result-card" data-note-path="${encodeURIComponent(note.path)}"><div class="result-card-top"><h3>${escapeHtml(note.title)}</h3><span class="result-phase">${escapeHtml(note.topicNumber ? `TOPIC ${String(note.topicNumber).padStart(2, '0')}` : 'NOTE')}</span></div><p>${escapeHtml(note.excerpt || firstText(note.content))}</p></button>`;
  }

  function showNote(path, push = true) {
    const note = noteByPath.get(normalize(path)); if (!note) return showSearch(path);
    if (push) window.location.hash = `note=${encodeURIComponent(note.path)}`;
    activePhase = note.phaseNumber || null; setActiveNav(''); setActivePhase(activePhase); homeView.classList.add('hidden'); noteView.classList.remove('hidden');
    const phaseName = note.phaseNumber ? shortPhase(note.phaseLabel) : 'Library notes';
    breadcrumbs.innerHTML = `<span>Study Library</span><span>${escapeHtml(phaseName)}</span><span><strong>${escapeHtml(note.title)}</strong></span>`;
    if (!recent.includes(note.path)) recent.unshift(note.path); recent = recent.slice(0, 12); saveStorage(recentKey, recent);
    const isSaved = favorites.has(note.path);
    const rendered = markdownToHtml(note.content, note);
    noteView.innerHTML = `<div class="note-toolbar"><button class="back-btn" id="backToList">← Back to ${note.phaseNumber ? 'phase' : 'overview'}</button><div class="note-actions"><button class="small-action ${isSaved ? 'saved' : ''}" id="saveNote">${isSaved ? '★ Saved' : '☆ Save note'}</button><button class="small-action" id="copyLink">⌘ Copy link</button></div></div><div class="note-header"><div class="eyebrow">${escapeHtml(phaseName)} ${note.topicNumber ? `· Topic ${String(note.topicNumber).padStart(2, '0')}` : ''}</div><h1>${escapeHtml(note.title)}</h1><div class="note-meta">Interview-ready note · ${readingTime(note.content)} min read</div></div><div class="note-layout"><article class="markdown">${rendered}</article><aside class="toc"><div class="toc-title">On this page</div><div id="tocLinks"></div></aside></div>`;
    document.getElementById('backToList').onclick = () => note.phaseNumber ? showPhase(note.phaseNumber) : renderHome();
    document.getElementById('saveNote').onclick = () => toggleFavorite(note);
    document.getElementById('copyLink').onclick = async () => { try { await navigator.clipboard.writeText(window.location.href); document.getElementById('copyLink').textContent = '✓ Copied'; setTimeout(() => document.getElementById('copyLink').textContent = '⌘ Copy link', 1400); } catch (_) {} };
    const headings = [...noteView.querySelectorAll('.markdown h2, .markdown h3')];
    document.getElementById('tocLinks').innerHTML = headings.map((heading, index) => { const id = `${slugify(heading.textContent)}-${index}`; heading.id = id; return `<a class="${heading.tagName === 'H3' ? 'toc-h3' : ''}" href="#${id}">${escapeHtml(heading.textContent)}</a>`; }).join('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function toggleFavorite(note) { if (favorites.has(note.path)) favorites.delete(note.path); else favorites.add(note.path); saveStorage(favoritesKey, [...favorites]); updateFavoriteCount(); showNote(note.path, false); }
  function openRandomNote() { const pool = notes.filter(n => n.phaseNumber > 0 && !/\/README\.md$/i.test(n.path)); if (pool.length) showNote(pool[Math.floor(Math.random() * pool.length)].path); }
  function readingTime(text) { return Math.max(1, Math.ceil(String(text).trim().split(/\s+/).length / 220)); }
  function firstText(text) { return String(text).replace(/^```[\s\S]*?```/gm, '').replace(/[#>*`_\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180); }

  function markdownToHtml(markdown, note) {
    const lines = String(markdown || '').replace(/\r/g, '').split('\n'); let html = ''; let inCode = false; let code = ''; let list = null; let table = false;
    const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
    const inline = raw => String(raw).replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => { const target = linkTarget(href); return `<a href="${target}" data-note-link="${target}">${label}</a>`; }).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/_([^_]+)_/g, '<em>$1</em>');
    const linkTarget = href => { const clean = normalize(String(href).split('#')[0]); const candidate = noteByPath.get(clean) || [...noteByPath.entries()].find(([p]) => p.endsWith('/' + clean) || p.endsWith(clean))?.[1]; return candidate ? `#note=${encodeURIComponent(candidate.path)}` : String(href); };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^```/.test(line)) { closeList(); if (inCode) { html += `<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`; code = ''; } inCode = !inCode; continue; }
      if (inCode) { code += line + '\n'; continue; }
      if (/^\s*$/.test(line)) { closeList(); table = false; continue; }
      if (/^# /.test(line)) { closeList(); html += `<h1>${inline(line.slice(2))}</h1>`; continue; }
      if (/^## /.test(line)) { closeList(); html += `<h2>${inline(line.slice(3))}</h2>`; continue; }
      if (/^### /.test(line)) { closeList(); html += `<h3>${inline(line.slice(4))}</h3>`; continue; }
      if (/^#### /.test(line)) { closeList(); html += `<h3>${inline(line.slice(5))}</h3>`; continue; }
      if (/^---+$/.test(line.trim())) { closeList(); html += '<hr>'; continue; }
      if (/^> ?/.test(line)) { closeList(); html += `<blockquote><p>${inline(line.replace(/^> ?/, ''))}</p></blockquote>`; continue; }
      if (/^\|/.test(line)) { closeList(); const cells = line.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim()); if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) { table = true; continue; } html += `${table ? '' : '<table><thead>'}<tr>${cells.map(cell => `<${table ? 'td' : 'th'}>${inline(cell)}</${table ? 'td' : 'th'}>`).join('')}</tr>${table ? '</tbody>' : '</thead><tbody>'}`; table = true; continue; }
      const ordered = line.match(/^\s*\d+\.\s+(.*)$/); const unordered = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ordered || unordered) { const kind = ordered ? 'ol' : 'ul'; if (list !== kind) { closeList(); html += `<${kind}>`; list = kind; } html += `<li>${inline((ordered || unordered)[1])}</li>`; continue; }
      closeList(); html += `<p>${inline(line)}</p>`;
    }
    closeList(); if (table) html += '</tbody></table>'; if (inCode) html += `<pre><code>${escapeHtml(code)}</code></pre>`;
    return html.replace(/<a href="(#note=[^"]+)" data-note-link="\1">/g, '<a href="$1" data-note-link="$1">');
  }

  function search(term) {
    const query = String(term || '').trim().toLowerCase(); if (!query) return renderHome();
    setActiveNav(''); setActivePhase(null); noteView.classList.add('hidden'); homeView.classList.remove('hidden'); breadcrumbs.innerHTML = `<span>Study Library</span><span><strong>Search</strong></span>`;
    const results = notes.filter(note => `${note.title} ${note.phaseLabel} ${note.content}`.toLowerCase().includes(query)).sort((a, b) => score(b, query) - score(a, query)).slice(0, 80);
    homeView.innerHTML = `<div class="search-header"><div><h1>Search results</h1><p>${results.length} result${results.length === 1 ? '' : 's'} for “${escapeHtml(term)}”</p></div></div>${results.length ? `<div class="result-list">${results.map(resultCard).join('')}</div>` : '<div class="empty-state"><strong>No notes found</strong>Try a broader term like “attention”, “RAG”, “evaluation”, or “agents”.</div>'}`;
    homeView.querySelectorAll('[data-note-path]').forEach(card => card.onclick = () => showNote(decodeURIComponent(card.dataset.notePath)));
  }
  function score(note, query) { const title = note.title.toLowerCase(); return (title === query ? 100 : 0) + (title.includes(query) ? 30 : 0) + (note.phaseLabel.toLowerCase().includes(query) ? 10 : 0); }
  function showSearch(term) { sidebarSearch.value = term; search(term); }

  function renderSaved() { renderCollection('Saved notes', 'Notes you marked for quick revision.', notes.filter(n => favorites.has(n.path))); }
  function renderRecent() { renderCollection('Recently viewed', 'Your latest trail through the library.', recent.map(path => noteByPath.get(path)).filter(Boolean), true); }
  function renderCollection(title, subtitle, items, canClear = false) { setActivePhase(null); setActiveNav(title === 'Saved notes' ? 'favorites' : 'recent'); noteView.classList.add('hidden'); homeView.classList.remove('hidden'); breadcrumbs.innerHTML = `<span>Study Library</span><span><strong>${title}</strong></span>`; homeView.innerHTML = `<div class="search-header"><div><h1>${title}</h1><p>${subtitle}</p></div>${canClear && items.length ? '<button class="secondary-btn" id="clearRecent">Clear history</button>' : ''}</div>${items.length ? `<div class="result-list">${items.map(resultCard).join('')}</div>` : '<div class="empty-state"><strong>Nothing here yet</strong>Open a note and save it, or start exploring the roadmap.</div>'}`; homeView.querySelectorAll('[data-note-path]').forEach(card => card.onclick = () => showNote(decodeURIComponent(card.dataset.notePath))); const clearButton = document.getElementById('clearRecent'); if (clearButton) clearButton.onclick = clearRecent; }
  function clearRecent() { recent = []; saveStorage(recentKey, recent); renderRecent(); }

  sidebarSearch.addEventListener('input', event => search(event.target.value));
  document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => { if (item.dataset.route === 'home') renderHome(); if (item.dataset.route === 'favorites') renderSaved(); if (item.dataset.route === 'recent') renderRecent(); closeMobileSidebar(); }));
  document.addEventListener('click', event => { const link = event.target.closest('[data-note-link]'); if (link && link.getAttribute('href').startsWith('#note=')) { event.preventDefault(); showNote(decodeURIComponent(link.getAttribute('href').slice(6))); } });
  document.addEventListener('keydown', event => { if (event.key === '/' && document.activeElement.tagName !== 'INPUT') { event.preventDefault(); sidebarSearch.focus(); } if (event.key === 'Escape') { sidebarSearch.blur(); closeMobileSidebar(); } });
  document.getElementById('openSidebar').onclick = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('mobileScrim').classList.remove('hidden'); };
  document.getElementById('closeSidebar').onclick = closeMobileSidebar;
  document.getElementById('mobileScrim').onclick = closeMobileSidebar;
  function closeMobileSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('mobileScrim').classList.add('hidden'); }
  window.addEventListener('hashchange', routeFromHash);
  function routeFromHash() { const hash = window.location.hash; if (hash.startsWith('#note=')) showNote(decodeURIComponent(hash.slice(6)), false); else if (hash.startsWith('#search=')) showSearch(decodeURIComponent(hash.slice(8))); }

  initSidebar(); routeFromHash(); if (!window.location.hash) renderHome();
})();
