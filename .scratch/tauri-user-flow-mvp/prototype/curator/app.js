/* Local UI interactions only. No provider calls, Repository access, or persistent storage. */
(() => {
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const demo = window.CURATOR_DEMO;
  const models = new Map();
  const state = {
    page: new URLSearchParams(location.search).get('page') === 'app' ? 'app' : 'start',
    workspace: 'harbor', selected: 'flow_04', tab: 'description', sidebarMode: 'preview',
    flowsMinimized: false, chatMinimized: false, chatHeight: 152, chatDraft: '', scenario: 'ready', effort: 'Standard',
    busy: false, stopping: false, notice: '', recents: clone(demo.workspaces)
  };
  function model() {
    if (!models.has(state.workspace)) models.set(state.workspace, { flows: clone(demo.flows), chat: clone(demo.chat), scans: clone(demo.scans) });
    return models.get(state.workspace);
  }
  const workspace = () => state.recents.find(item => item.id === state.workspace) || demo.workspaces[0];
  const flow = () => model().flows.find(item => item.id === state.selected);
  const agentBlocked = () => state.busy || ['missing', 'config'].includes(state.scenario);
  const disabled = condition => condition ? 'disabled' : '';
  const button = (label, action, classes = '', extra = '') => `<button class="${classes}" data-action="${action}" ${extra}>${label}</button>`;
  const badge = status => `<span class="badge ${status.toLowerCase()}"><i class="dot ${status.toLowerCase()}"></i>${escape(status)}</span>`;
  function navigate(page) {
    state.page = page;
    const url = new URL(location.href);
    url.searchParams.set('page', page);
    history.replaceState({}, '', url);
    render();
  }
  function startPage() {
    return `<section class="frame start-frame"><div class="titlebar"><div class="traffic" aria-hidden="true"><i></i><i></i><i></i></div><div class="wordmark label">Curator</div></div>
      <div class="start-body"><section class="welcome"><div class="welcome-copy"><h1>Test Anything with Curator</h1><p>Open a folder or clone a repository to get started</p><div class="welcome-actions">${button('Choose a folder…', 'choose', 'primary')}${button('Clone from Git…', 'future-clone')}</div></div></section>
      <aside class="recents"><div class="section-heading"><h2>Recent</h2><div class="rule"></div><span class="mono muted">${state.recents.length}</span></div>
      ${state.recents.map(item => `<button class="recent" data-action="open-workspace" data-id="${item.id}"><div class="row between"><strong class="ellipsis">${escape(item.name)}</strong><span class="mono muted">${escape(item.opened)}</span></div><div class="path mono ellipsis">${escape(item.path)}</div><div class="counts mono"><span class="badge"><i class="dot"></i>${item.passing} passing</span>${item.failing ? `<span class="badge outdated"><i class="dot outdated"></i>${item.failing} failing</span>` : ''}</div></button>`).join('') || '<p class="recent-empty">Workspaces you open appear here. Choose a folder to get started.</p>'}
      <p class="preview-note">Test results are future UI placeholders.</p></aside></div></section>`;
  }
  function sidebar() {
    const data = model();
    const groups = state.sidebarMode === 'preview' ? ['Failing', 'Passing', 'Not run'] : ['Active', 'Outdated'];
    return `<aside class="sidebar ${state.flowsMinimized ? 'flows-minimized' : ''}"><header class="workspace-heading">${button('C', 'home', 'monogram', 'aria-label="Back to Workspaces" title="Back to Workspaces"')}<div class="grow"><h1>${escape(workspace().name)}</h1><div class="path mono ellipsis" title="${escape(workspace().path)}">${escape(workspace().path)}</div></div>${button('<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18.76 10.19 L20.86 10.44 L20.86 13.56 L18.76 13.81 L18.06 15.50 L19.37 17.16 L17.16 19.37 L15.50 18.06 L13.81 18.76 L13.56 20.86 L10.44 20.86 L10.19 18.76 L8.50 18.06 L6.84 19.37 L4.63 17.16 L5.94 15.50 L5.24 13.81 L3.14 13.56 L3.14 10.44 L5.24 10.19 L5.94 8.50 L4.63 6.84 L6.84 4.63 L8.50 5.94 L10.19 5.24 L10.44 3.14 L13.56 3.14 L13.81 5.24 L15.50 5.94 L17.16 4.63 L19.37 6.84 L18.06 8.50 Z"/><circle cx="12" cy="12" r="3"/></svg>', 'workspace-menu', 'plain icon-button', 'aria-label="Workspace options" title="Workspace options"')}</header>
    <section class="catalog ${state.flowsMinimized ? 'minimized' : ''}"><div class="row catalog-meta"><span class="label grow">${data.flows.length} User Flows</span><button class="plain mode-toggle" data-action="toggle-grouping">${state.sidebarMode === 'preview' ? 'Test preview ▾' : 'Flow status ▾'}</button>${button(state.flowsMinimized ? '+' : '−', 'toggle-flows', 'plain icon-button panel-toggle', `aria-label="${state.flowsMinimized ? 'Restore' : 'Minimize'} flow list" title="${state.flowsMinimized ? 'Restore' : 'Minimize'} flow list" aria-expanded="${!state.flowsMinimized}" aria-controls="flow-list"`)}</div><div id="flow-list" class="catalog-list">
      ${groups.map(group => { const items = data.flows.filter(item => (state.sidebarMode === 'preview' ? item.testGroup : item.status) === group); return `<div class="group-heading ${['Failing', 'Outdated'].includes(group) ? 'outdated' : 'active'}"><h2>${group}</h2><div class="rule"></div><span class="mono muted">${items.length}</span></div>${items.map(item => `<button class="flow-row ${state.selected === item.id ? 'selected' : ''}" data-action="select-flow" data-id="${item.id}"><span class="flow-marker ${['Failing', 'Outdated'].includes(group) ? 'outdated' : group === 'Not run' ? 'not-run' : ''}"></span><span class="grow ellipsis">${escape(item.title)}</span><span class="mono ${group === 'Failing' ? 'danger' : 'muted'}">${state.sidebarMode === 'preview' ? item.testMeta : `${item.citations.length} sources`}</span></button>`).join('')}`; }).join('')}
      ${!data.flows.length ? '<p class="preview-note">No User Flows yet. Start a Scan or add one manually.</p>' : ''}</div>
      ${button('+ Generate a flow', 'generate-modal', 'add-flow', disabled(agentBlocked()))}</section>${chatPanel()}</aside>`;
  }
  function chatPanel() {
    return `<section class="agent-panel ${state.chatMinimized ? 'minimized' : ''}" style="--chat-height:${state.chatHeight}px"><button class="resize-handle" role="separator" aria-label="Resize Agent Chat" aria-orientation="horizontal" aria-valuemin="110" aria-valuemax="600" aria-valuenow="${state.chatHeight}" title="Drag or use arrow keys to resize"></button><div class="agent-heading"><i class="dot"></i><h2 class="label">Agent Chat</h2><span class="grow"></span><span class="mono muted">${state.busy ? state.stopping ? 'stopping' : 'working' : 'idle'}</span>${button('↗', 'expand-chat', 'plain icon-button', 'aria-label="Expand Agent Chat" title="Expand Agent Chat"')}${button(state.chatMinimized ? '+' : '−', 'toggle-chat', 'plain icon-button panel-toggle', `aria-label="${state.chatMinimized ? 'Restore' : 'Minimize'} Agent Chat" title="${state.chatMinimized ? 'Restore' : 'Minimize'} Agent Chat" aria-expanded="${!state.chatMinimized}" aria-controls="chat-content"`)}</div>
      <div id="chat-content" class="chat-content"><div class="agent-messages">${chatMessages()}</div><div class="composer"><textarea id="chat-draft" aria-label="Message Agent Chat" placeholder="Message the agent…" ${disabled(agentBlocked())}>${escape(state.chatDraft)}</textarea>${button('↑', 'send', 'send', `aria-label="Send message" ${disabled(agentBlocked())}`)}</div></div></section>`;
  }
  function chatMessages() {
    return model().chat.map(item => item.role === 'tool' ? `<details class="tool-entry"><summary>${escape(item.text)}</summary><pre>${escape(item.output)}</pre></details>` : `<div class="message ${item.role}">${escape(item.text)}</div>`).join('');
  }
  function appPage() {
    const item = flow();
    const status = item?.status || 'Active';
    return `<section class="frame app-frame">${sidebar()}<section class="main">${noticeBar()}
      <header class="detail-header"><i class="dot ${status.toLowerCase()}"></i><div class="grow"><h2>${escape(item?.title || 'Your User Flows')}</h2><div class="meta mono">${item ? `${escape(item.id)} · ${escape(status)} · edited by ${escape(item.origin)}` : 'Source-grounded behavior, curated by you'}</div></div><div class="actions">${button('Edit flow', 'edit', '', disabled(state.busy || !item))}${button('Run', 'future-run', 'primary', disabled(!item))}</div></header>
      <div class="content-columns"><section class="reading-pane"><nav class="tabs" aria-label="User Flow views">${[['description', 'Description'], ['steps', `Steps${item?.steps ? ` <span class="muted">${item.steps.length}</span>` : ''}`], ['screenshots', 'Screenshots'], ['sources', `Sources <span class="muted">${item?.citations.length || 0}</span>`]].map(([key, label]) => button(label, 'tab', `tab ${state.tab === key ? 'selected' : ''}`, `data-tab="${key}" aria-current="${state.tab === key ? 'page' : 'false'}"`)).join('')}</nav>${mainContent(item)}</section>${inspector(item)}</div>${scanStrip()}</section></section>`;
  }
  function noticeBar() {
    if (state.scenario === 'missing') return `<div class="notice"><div class="grow"><strong>Repository unavailable.</strong> Saved data and manual editing remain available.</div>${button('Relink', 'relink')}</div>`;
    if (state.scenario === 'config') return '<div class="notice">Add OPENROUTER_API_KEY and OPENROUTER_MODEL to the application root .env, then restart Curator to use the agent.</div>';
    return state.notice ? `<div class="notice" role="status"><span class="grow">${escape(state.notice)}</span>${button('×', 'dismiss-notice', 'plain', 'aria-label="Dismiss notice"')}</div>` : '';
  }
  function mainContent(item) {
    if (!item) return `<div class="empty"><h2>Start with a User Flow</h2><p>Run a source Scan to discover what people can do, or describe a flow yourself.</p>${button('Add User Flow manually', 'add', '', disabled(state.busy))}</div>`;
    if (state.tab === 'description') return `<article class="document"><div class="row between" style="margin-bottom:22px">${badge(item.status)}${button('···', 'flow-menu', 'plain', 'aria-label="User Flow options"')}</div><p class="description">${escape(item.description)}</p>${item.status === 'Outdated' ? `<div class="outdated-note"><p>Source evidence indicates this behavior is no longer current. This is independent of its test preview.</p>${button('Mark Active', 'reactivate', '', disabled(state.busy))}</div>` : ''}<p class="evidence-note">Manual edits retain Source Citations. Those citations do not certify that the edited text has been reviewed.</p></article>`;
    if (state.tab === 'sources') return `<article class="document"><h3>Source Citations</h3><p class="small muted" style="margin-bottom:22px">Evidence supporting the agent’s judgment. Changed or unavailable source does not change the User Flow’s status.</p>${sources(item)}</article>`;
    if (state.tab === 'screenshots') return '<div class="empty"><span class="label">Future testing feature</span><h2>Screenshots from a test run</h2><p>This is where screenshots will appear when test execution is added. The source-analysis MVP does not run the product or capture screenshots.</p></div>';
    if (state.tab === 'history') return historyContent();
    if (state.tab === 'chat') return `<section class="document expanded-chat"><h3>Agent Chat</h3><p class="small muted" style="margin-bottom:20px">The same ongoing Workspace conversation. Compose messages in the left panel.</p>${chatMessages()}</section>`;
    return stepsContent(item);
  }
  function stepsContent(item) {
    if (!item.steps) return '<div class="empty"><span class="label">Future testing feature</span><h2>Test steps will appear here</h2><p>These are separate from the free-text User Flow description. Open Description to inspect or edit the current flow.</p></div>';
    return `<div class="test-preview-caption"><span>Test execution preview</span><span>12.4s total</span></div><div class="step-columns"><span>#</span><span>Action</span><span>Target</span><span>Time</span></div><div class="steps-list">${item.steps.map((step, index) => `<div class="step-block ${step[3] || ''}"><div class="step-row"><span class="step-number">${String(index + 1).padStart(2, '0')}</span><span class="step-action">${escape(step[0])}</span><span class="step-target" title="${escape(step[1])}">${escape(step[1])}</span><span class="step-time">${escape(step[2])}</span></div>${step[3] === 'failed' ? `<p class="trace-error">TimeoutError: navigation did not occur within 10000ms<br>still on /checkout — order 201 created, client never redirected</p><div class="trace-actions">${button('View trace', 'future-trace', 'text-button')}${button('Ask the agent to explain', 'explain', 'text-button')}</div>` : ''}</div>`).join('')}</div>`;
  }
  function sources(item) {
    return item.citations.map(citation => `<div class="citation"><span class="citation-location">${escape(citation.path)}:${citation.start}–${citation.end}</span><p>${escape(citation.reason)}</p><span class="citation-state ${citation.freshness.toLowerCase()}">${state.scenario === 'missing' ? 'Unavailable' : citation.freshness}</span></div>`).join('') || '<p class="small muted">This flow was added manually and has no Source Citations.</p>';
  }
  function inspector(item) {
    if (!item) return '';
    if (!['steps', 'screenshots'].includes(state.tab)) {
      return `<aside class="inspector" aria-label="Source evidence"><section class="inspector-section"><h3 class="label">Source Citations</h3>${sources(item)}<p class="small muted">Citations support the agent’s judgment. Manual edits do not establish a new source review.</p></section><section class="inspector-section"><h3 class="label">User Flow</h3>${badge(item.status)}<p class="small muted">Citation freshness and test results do not change this status.</p>${button('Scan history', 'history', 'text-button')}</section></aside>`;
    }
    return `<aside class="inspector"><section class="inspector-section"><div class="row between"><h3 class="label">Run history</h3><span class="future-tag">Preview</span></div><div class="run-bars" aria-label="Fictional test run history: 9 passed, 1 not run, 4 failed">${['pass','pass','pass','pass','pass','pass','none','pass','pass','pass','fail','fail','fail','fail'].map(type => `<i class="${type}"></i>`).join('')}</div><div class="row between mono muted" style="margin-top:7px"><span>Aug 24</span><span>now</span></div><div class="run-stats"><div><strong>64%</strong><span>pass rate</span></div><div><strong>12.4s</strong><span>median</span></div><div><strong class="danger">4</strong><span>runs failing</span></div></div></section>
      <section class="inspector-section"><div class="row between"><h3 class="label">Inferred assertions</h3><span class="future-tag">Preview</span></div>${[['✓','Confirmation total equals cart subtotal plus shipping','held 12 runs'],['✓','The cart is empty after a successful order','held 14 runs'],['✕','The order appears in the orders list within 2s','broken in the last 4 runs']].map(([mark, text, meta]) => `<div class="assertion"><span class="assertion-mark ${mark === '✕' ? 'failed' : ''}">${mark}</span><div><p>${text}</p><small class="mono ${mark === '✕' ? 'danger' : 'muted'}">${meta}</small></div></div>`).join('')}<div class="assertion suggestion"><span class="unchecked"></span><div><p>A saved card is never re-tokenized on a repeat purchase</p><div class="row">${button('Keep','future-assertion','text-button')}${button('Discard','future-assertion','text-button muted')}</div></div></div></section>
      <section class="inspector-section"><h3 class="label">User Flow</h3>${badge(item.status)}<p class="small muted">Source-based status. Independent of the test results shown above.</p>${button('Scan history', 'history', 'text-button')}</section></aside>`;
  }
  function scanStrip() {
    return `<footer class="scan-strip"><div class="grow small muted">${state.busy ? state.stopping ? 'Stopping… committed changes remain.' : 'Agent working · inspect results or Stop' : 'Scan the Repository for User Flows'}</div>${state.busy ? button(state.stopping ? 'Stopping…' : 'Stop', 'stop', '', disabled(state.stopping)) : `<label class="small muted"><span>Effort</span><select id="effort" aria-label="Scanning Effort" ${disabled(agentBlocked())}>${['Quick','Standard','Maximum'].map(level => `<option ${level === state.effort ? 'selected' : ''}>${level}</option>`).join('')}</select></label>${button('Start Scan', 'scan', '', disabled(agentBlocked()))}`}</footer>`;
  }
  function historyContent() {
    return `<article class="document"><h3>Workspace Scan history</h3><p class="small muted">Source analysis attempts, separate from the future test-run history.</p>${model().scans.map(scan => `<div class="history-item"><div class="row between"><strong>${escape(scan.date)}</strong><span class="badge ${scan.outcome === 'Completed' ? '' : 'outdated'}">${scan.outcome}</span></div><p>${scan.effort} effort · ${escape(scan.result)}</p><p class="small muted">${escape(scan.detail)}</p><p class="mono muted">Final usage: ${escape(scan.usage)}</p><details><summary>Activity and retained history</summary><pre>Considered: 184 files\nRead: src/routes/checkout/+page.ts, src/lib/orders/create.ts\nExcluded: node_modules/ — dependencies\nUnfinished: billing integration not inspected</pre><p class="small muted">Historical mentions of deleted flows remain. They cannot restore a deleted User Flow.</p></details>${button('Open Agent Chat','expand-chat','text-button')}</div>`).join('') || '<p class="evidence-note">No Scans yet. Choose an effort and start a Scan.</p>'}</article>`;
  }
  function controls() {
    return `<strong>Design prototype</strong>${button('Start page','home',state.page === 'start' ? 'selected' : '')}${button('App page','app',state.page === 'app' ? 'selected' : '')}<select id="scenario" aria-label="Prototype scenario">${[['ready','Populated Workspace'],['empty','Empty Workspace'],['missing','Repository unavailable'],['config','Configuration missing'],['busy','Scan running'],['failed','Scan failed'],['interrupted','Scan interrupted']].map(([value,label]) => `<option value="${value}" ${state.scenario === value ? 'selected' : ''}>${label}</option>`).join('')}</select>${button('Reset','reset')}<span>Mock data · testing and Git cloning are future placeholders</span><output>${escape(state.page)} / ${escape(state.tab)} / ${state.busy ? 'busy' : 'idle'}</output>`;
  }
  function render() {
    $('#app').innerHTML = state.page === 'start' ? startPage() : appPage();
    $('#prototype-controls').innerHTML = controls();
    document.title = `Curator — ${state.page === 'start' ? 'Workspaces' : workspace().name} (prototype)`;
    bindResize();
  }
  function showModal(title, subtitle, content, footer = button('Close','close')) {
    $('#modal').innerHTML = `<header class="modal-header"><h2 id="modal-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</header><div class="modal-body">${content}</div><footer class="modal-footer">${footer}</footer>`;
    $('#modal').showModal();
  }
  function closeModal() { $('#modal').close(); }
  function generateModal() {
    showModal('Generate a flow', 'Describe it the way you would to a teammate. Compose a request for the Workspace’s Agent Chat.', `<label class="sr-only" for="generate-prompt">Describe the User Flow</label><textarea id="generate-prompt" placeholder="e.g. A returning customer applies a promo code at checkout and the discount shows on the confirmation page"></textarea><div class="label" style="margin-top:20px">Try</div><div class="examples">${demo.examples.map((text,index) => button(escape(text),'example','example',`data-index="${index}"`)).join('')}</div>`, `<span class="meta mono ellipsis">${escape(workspace().path)}</span>${button('Cancel','close')}${button('Compose in Agent Chat','compose','primary')}`);
    $('#generate-prompt').focus();
  }
  function editModal(add) {
    const item = add ? { title: '', description: '' } : flow();
    showModal(add ? 'Add User Flow' : 'Edit User Flow', 'Describe user actions and expected outcomes in your own words.', `<div class="stack"><label>Title<input id="flow-title" value="${escape(item.title)}" required></label><label>Description<textarea id="flow-description" required>${escape(item.description)}</textarea></label><p class="small muted">${add ? 'Manual flows can be saved without Source Citations.' : 'Save retains the current status and Source Citations. No source review is performed.'}</p></div>`, `<span class="grow"></span>${button('Cancel','close')}${button('Save','save','primary',`data-new="${add}"`)}`);
  }
  function future(title, text) { showModal(title, 'Future testing feature', `<p>${text}</p><p class="small muted" style="margin-top:14px">This control is a visual placeholder. Nothing has been run or changed.</p>`); }
  function saveFlow(add) {
    const title = $('#flow-title'), description = $('#flow-description');
    if (!title.value.trim()) { title.setCustomValidity('Enter a title.'); title.reportValidity(); title.oninput = () => title.setCustomValidity(''); return; }
    if (!description.value.trim()) { description.setCustomValidity('Enter a description.'); description.reportValidity(); description.oninput = () => description.setCustomValidity(''); return; }
    const values = { title: title.value.trim(), description: description.value.trim(), origin: 'manual' };
    if (add) {
      const id = `manual_${Date.now()}`;
      model().flows.push({ id, ...values, status: 'Active', citations: [], testGroup: 'Not run', testMeta: '—' });
      state.selected = id;
    } else Object.assign(flow(), values);
    state.tab = 'description';
    closeModal(); render();
  }
  const actions = {
    home: () => navigate('start'), app: () => navigate('app'), close: closeModal,
    'open-workspace': target => { state.workspace = target.dataset.id; state.selected = model().flows[0]?.id; state.tab = 'description'; state.scenario = 'ready'; state.busy = false; state.notice = ''; state.chatDraft = ''; navigate('app'); },
    choose: () => showModal('Choose a folder', 'Directory selection is simulated in this prototype.', `<p>Open an existing sample Workspace or preview an empty one.</p><div class="stack" style="margin-top:18px">${demo.workspaces.map(item => button(`${escape(item.name)} <span class="mono muted">${escape(item.path)}</span>`, 'choose-sample', '', `data-id="${item.id}"`)).join('')}${button('Open an empty Workspace', 'choose-empty')}</div>`),
    'choose-sample': target => { if (!state.recents.some(item => item.id === target.dataset.id)) state.recents.push(clone(demo.workspaces.find(item => item.id === target.dataset.id))); closeModal(); actions['open-workspace'](target); },
    'choose-empty': () => { closeModal(); setScenario('empty'); },
    'future-clone': () => showModal('Clone from Git', 'Future feature', '<p>Git cloning is retained from the design as a placeholder. Choose a local folder for the source-analysis MVP.</p>'),
    'select-flow': target => { state.selected = target.dataset.id; state.tab = 'description'; render(); },
    'toggle-flows': () => { state.flowsMinimized = !state.flowsMinimized; render(); $('[data-action="toggle-flows"]').focus(); },
    'toggle-chat': () => { state.chatMinimized = !state.chatMinimized; render(); $('[data-action="toggle-chat"]').focus(); },
    'toggle-grouping': () => { state.sidebarMode = state.sidebarMode === 'preview' ? 'status' : 'preview'; render(); },
    tab: target => { state.tab = target.dataset.tab; render(); },
    history: () => { state.tab = 'history'; render(); },
    'expand-chat': () => { state.chatMinimized = false; state.tab = 'chat'; state.chatHeight = 300; render(); },
    'generate-modal': generateModal,
    example: target => { $('#generate-prompt').value = demo.examples[Number(target.dataset.index)]; $('#generate-prompt').focus(); },
    compose: () => { const prompt = $('#generate-prompt').value.trim(); if (!prompt) { $('#generate-prompt').focus(); return; } state.chatDraft = `Create a source-cited User Flow for: ${prompt}`; state.chatMinimized = false; state.chatHeight = Math.max(state.chatHeight,300); closeModal(); render(); $('#chat-draft').focus(); },
    send: () => { if (agentBlocked() || !state.chatDraft.trim()) return; model().chat.push({ role: 'user', text: state.chatDraft }, { role: 'agent', text: 'Prototype only: your message is shown in this conversation. No agent ran and no User Flows were changed.' }); state.chatDraft = ''; render(); const messages = $('.agent-messages'); messages.scrollTop = messages.scrollHeight; },
    explain: () => { state.chatMinimized = false; state.chatDraft = 'Explain the checkout behavior using the source for “Checkout with saved card”.'; state.chatHeight = 300; render(); $('#chat-draft').focus(); },
    edit: () => editModal(false), add: () => { closeModal(); editModal(true); },
    save: target => saveFlow(target.dataset.new === 'true'),
    'future-run': () => future('Run this User Flow', 'Test execution is not part of the current source-analysis MVP. The Run button preserves the intended future design.'),
    'future-trace': () => future('Test trace', 'The timeout and trace in the design are fictional test results. No browser session or trace file exists.'),
    'future-assertion': () => future('Curate an inferred assertion', 'Assertions are future test artifacts, separate from the current User Flow description and its source evidence.'),
    'workspace-menu': () => showModal('Workspace options', escape(workspace().path), `<div class="stack">${button('Back to Workspaces','home-close')}${button('Scan history','history-close')}${button('Add User Flow manually','add','',disabled(state.busy))}${button('Relink Repository','relink','',disabled(state.busy))}${button('Delete Workspace…','delete-workspace','danger',disabled(state.busy))}<p class="small muted">Workspace data and full Agent Chat will be retained outside the Repository. Stored chat may contain source content or secrets; the MVP adds no application encryption.</p></div>`),
    'home-close': () => { closeModal(); navigate('start'); },
    'history-close': () => { closeModal(); state.tab = 'history'; render(); },
    'flow-menu': () => showModal('User Flow options', escape(flow().title), `<div class="stack">${button('Edit User Flow','edit-close','',disabled(state.busy))}${button('Delete permanently…','delete-flow','danger',disabled(state.busy))}</div>`),
    'edit-close': () => { closeModal(); editModal(false); },
    'delete-flow': () => { closeModal(); showModal('Delete this User Flow?', '', '<p>This permanently removes the User Flow and its current citations. There is no undo.</p><p class="small muted" style="margin-top:14px">Historical mentions remain in Agent Chat and Scan Records. They cannot restore the flow. A later Scan may rediscover its behavior as a new User Flow.</p>', `<span class="grow"></span>${button('Cancel','close')}${button('Delete permanently','confirm-delete-flow','danger')}`); },
    'confirm-delete-flow': () => { const data = model(); data.flows = data.flows.filter(item => item.id !== state.selected); state.selected = data.flows[0]?.id; closeModal(); render(); },
    'delete-workspace': () => { closeModal(); showModal('Delete this Workspace?', '', '<p>Permanently remove its User Flows, Scan history, Agent Chat, and application-owned working data. The Repository and application configuration remain untouched. There is no undo.</p>', `<span class="grow"></span>${button('Cancel','close')}${button('Delete Workspace permanently','confirm-delete-workspace','danger')}`); },
    'confirm-delete-workspace': () => { models.set(state.workspace,{flows:[],chat:[],scans:[]}); state.recents = state.recents.filter(item => item.id !== state.workspace); state.selected = null; state.chatDraft = ''; closeModal(); navigate('start'); },
    reactivate: () => { flow().status = 'Active'; flow().origin = 'manual'; render(); },
    relink: () => { closeModal(); showModal('Relink Repository', 'Choose another location for the same Repository.', `<div class="stack"><label>Simulated new folder<input id="repository-path" value="~/Development/${escape(workspace().name)}"></label><label class="checkbox-label"><input type="checkbox" id="same-repository">I confirm this is the same Repository.</label><p class="small muted">The Workspace keeps its User Flows and history. Choosing a folder already associated with another Workspace opens that Workspace instead.</p></div>`, `<span class="grow"></span>${button('Cancel','close')}${button('Relink','confirm-relink','primary')}`); },
    'confirm-relink': () => { if (!$('#same-repository').checked || !$('#repository-path').value.trim()) { $('#same-repository').focus(); return; } const path = $('#repository-path').value.trim(); const existing = state.recents.find(item => item.path === path && item.id !== state.workspace); if (existing) { state.workspace = existing.id; state.selected = model().flows[0]?.id; state.chatDraft = ''; } else workspace().path = path; state.scenario = 'ready'; state.notice = existing ? 'Opened the Workspace already associated with this folder. The original Workspace is unchanged.' : 'Repository relinked. User Flows and history retained.'; closeModal(); render(); },
    scan: () => showModal('Start a Scan', `${state.effort} Scanning Effort`, '<p>A Scan reviews every existing Active and Outdated User Flow before discovering more. Results appear in this Workspace’s Agent Chat.</p><p class="small muted" style="margin-top:14px">Quick, Standard, and Maximum request different levels of detail. None promises complete coverage. This prototype only previews the working state.</p>', `<span class="grow"></span>${button('Cancel','close')}${button('Preview running Scan','preview-scan','primary')}`),
    'preview-scan': () => { closeModal(); state.busy = true; state.scenario = 'busy'; model().chat.push({ role:'event',text:`Scan started · ${state.effort} effort. Review Pass: reviewing existing Active and Outdated User Flows. (Simulated)` }); state.chatHeight = 300; render(); },
    stop: () => { state.stopping = true; render(); setTimeout(() => { if (!state.stopping) return; state.busy = false; state.stopping = false; state.scenario = 'ready'; model().chat.push({role:'event',text:'Scan cancelled. Already committed results remain. Final usage unavailable. (Simulated)'}); model().scans.unshift({ id: `scan_${Date.now()}`,date:'Just now',effort:state.effort,outcome:'Cancelled',result:'No changes in this simulated attempt',detail:'Stopped during the Review Pass. This Scan is terminal and cannot resume.',usage:'Unavailable' }); state.notice = 'Scan stopped. You can continue in Agent Chat or start a new Scan.'; render(); },700); },
    'dismiss-notice': () => { state.notice = ''; render(); },
    reset: () => { models.clear(); Object.assign(state,{ selected:'flow_04',workspace:'harbor',tab:'description',scenario:'ready',busy:false,stopping:false,notice:'',chatDraft:'',flowsMinimized:false,chatMinimized:false,chatHeight:152,sidebarMode:'preview',effort:'Standard',recents:clone(demo.workspaces) }); render(); }
  };
  function setScenario(value) {
    actions.reset(); state.scenario = value; state.page = 'app';
    if (value === 'empty') { models.set(state.workspace,{flows:[],chat:[],scans:[]}); state.selected = null; state.tab = 'description'; }
    if (value === 'busy') { state.busy = true; state.chatHeight = 300; model().chat.push({role:'event',text:'Review Pass in progress. Existing Active and Outdated User Flows are reviewed before discovery. (Simulated)'}); }
    if (value === 'failed' || value === 'interrupted') {
      state.notice = value === 'failed' ? 'OpenRouter request failed: 401 Unauthorized. Correct the application root .env, restart Curator, and begin a new task. Committed results remain.' : 'The application exited during the Scan. Committed results remain. Start a new Scan; this attempt cannot resume.';
      model().chat.push({role:'event',text:state.notice});
      model().scans.unshift({id:'scan_preview',date:'Just now',effort:'Maximum',outcome:value === 'failed' ? 'Failed' : 'Interrupted',result:'Committed results retained',detail:state.notice,usage:'Unavailable'});
    }
    navigate('app');
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    actions[target.dataset.action]?.(target);
  });
  document.addEventListener('input', event => { if (event.target.id === 'chat-draft') state.chatDraft = event.target.value; });
  document.addEventListener('change', event => {
    if (event.target.id === 'effort') state.effort = event.target.value;
    if (event.target.id === 'scenario') setScenario(event.target.value);
  });
  function bindResize() {
    const handle = $('.resize-handle'); if (!handle || state.flowsMinimized || state.chatMinimized) return;
    const heightLimit = () => Math.min(600,Math.max(110,$('.sidebar').clientHeight - 190));
    const setHeight = height => { state.chatHeight = Math.max(110,Math.min(heightLimit(),height)); $('.agent-panel').style.setProperty('--chat-height',`${state.chatHeight}px`); handle.setAttribute('aria-valuenow',state.chatHeight); };
    handle.addEventListener('keydown', event => { if (['ArrowUp','ArrowDown'].includes(event.key)) { event.preventDefault(); setHeight(state.chatHeight + (event.key === 'ArrowUp' ? 30 : -30)); } });
    handle.addEventListener('pointerdown', event => {
      event.preventDefault(); handle.setPointerCapture(event.pointerId);
      const y = event.clientY, height = state.chatHeight;
      const move = next => setHeight(height + y - next.clientY);
      const up = () => { handle.removeEventListener('pointermove',move); handle.removeEventListener('pointerup',up); handle.removeEventListener('pointercancel',up); };
      handle.addEventListener('pointermove',move); handle.addEventListener('pointerup',up); handle.addEventListener('pointercancel',up);
    });
  }
  render();
})();
