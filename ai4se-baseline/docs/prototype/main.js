/* RouteMe 路觅 · 路由、事件与交互编排 */
(function (global) {
  'use strict';

  var S = global.Store;
  var UI = global.UI;
  var D = global.RMData;

  var view = document.getElementById('view');
  var shell = document.getElementById('shell');
  var gateEl = document.getElementById('gate');
  var drawerRoot = document.getElementById('drawer-root');
  var modalRoot = document.getElementById('modal-root');
  var toastRoot = document.getElementById('toast-root');

  var THEME_KEY = 'routeme.theme';

  var App = {
    route: { name: 'discover', a: null, b: null },
    filters: { tab: 'trips', q: '', destination: '', from: '', to: '', tags: [], sort: 'match' },
    mineTab: 'published',
    draft: null,
    draftErrors: {},
    draftSource: null,
    editingId: null,
    shareDraft: null,
    shareErrors: {},
    shareTripId: null,
    picked: [],
    appsTripId: null,
    overlay: null,
    confirm: null,
    chatKey: '',
    pollTimer: null
  };

  /* ---------------- 主题 ---------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { global.localStorage.setItem(THEME_KEY, t); } catch (e) { }
  }
  (function initTheme() {
    var saved = null;
    try { saved = global.localStorage.getItem(THEME_KEY); } catch (e) { }
    if (!saved) saved = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved);
  })();

  /* ---------------- Toast ---------------- */
  function toast(text, kind, undoable) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok') + (undoable ? ' has-undo' : '');
    var ic = kind === 'bad' ? 'alert' : kind === 'warn' ? 'info' : 'check';
    el.innerHTML = UI.icon(ic) + '<span class="toast-text">' + UI.esc(text) + '</span>' +
      (undoable ? '<button class="toast-undo" data-action="undo" type="button">撤销</button>' : '') +
      '<button class="toast-x" data-action="dismiss-toast" type="button" aria-label="关闭提示">' + UI.icon('x') + '</button>';
    toastRoot.appendChild(el);
    var closed = false;
    var timer = setTimeout(close, undoable ? 12000 : 3200);
    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 240);
    }
    function hold() { clearTimeout(timer); }
    function resume() { if (!closed && !el.contains(document.activeElement)) { clearTimeout(timer); timer = setTimeout(close, undoable ? 8000 : 2000); } }
    /* 悬停或聚焦时暂停自动关闭，保证撤销按钮始终点得到 */
    el.addEventListener('mouseenter', hold);
    el.addEventListener('focusin', hold);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('focusout', function () { setTimeout(resume, 0); });
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="undo"]')) {
        e.stopPropagation();
        var label = S.undo();
        close();
        if (label) { toast('已撤销：' + label, 'ok'); render(); }
      } else if (e.target.closest('[data-action="dismiss-toast"]')) {
        e.stopPropagation();
        close();
      }
    });
    while (toastRoot.children.length > 4) {
      var all = toastRoot.children, victim = null;
      for (var i = 0; i < all.length - 1; i++) { if (!all[i].classList.contains('has-undo')) { victim = all[i]; break; } }
      toastRoot.removeChild(victim || all[0]);
    }
  }

  /* ---------------- 焦点保持 ---------------- */
  var FOCUS_ATTRS = ['data-filter', 'data-form', 'data-share', 'data-stop-input', 'data-chat-input', 'data-apply-msg', 'data-report-note', 'data-view-name'];
  function captureFocus() {
    var el = document.activeElement;
    if (!el || !view.contains(el)) return null;
    for (var i = 0; i < FOCUS_ATTRS.length; i++) {
      var a = FOCUS_ATTRS[i];
      if (el.hasAttribute(a)) {
        var v = el.getAttribute(a);
        var sel = v ? '[' + a + '="' + v + '"]' : '[' + a + ']';
        var pos = null;
        try { pos = el.selectionStart; } catch (e) { }
        return { sel: sel, pos: pos };
      }
    }
    return null;
  }
  function restoreFocus(info) {
    if (!info) return;
    var el = view.querySelector(info.sel);
    if (!el) return;
    el.focus();
    if (info.pos != null && el.setSelectionRange) {
      try { el.setSelectionRange(info.pos, info.pos); } catch (e) { }
    }
  }

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    var h = (global.location.hash || '#/discover').replace(/^#\/?/, '');
    var p = h.split('/').filter(Boolean);
    if (!p.length) return { name: 'discover', a: null, b: null };
    return { name: p[0], a: p[1] || null, b: p[2] || null };
  }
  var lastHandled = null;
  function handleRoute() {
    lastHandled = global.location.hash;
    App.route = parseHash();
    if (App.route.name !== 'create' && App.route.name !== 'edit') {
      App.draft = null; App.editingId = null; App.draftSource = null; App.draftErrors = {};
    }
    if (App.route.name !== 'share') { App.shareTripId = null; App.shareDraft = null; App.shareErrors = {}; }
    App.overlay = null; App.confirm = null; App.picked = [];
    render();
    global.scrollTo(0, 0);
  }
  function go(hash) {
    if (global.location.hash !== hash) global.location.hash = hash;
    handleRoute();
  }

  /* ---------------- 草稿 ---------------- */
  function blankDraft() {
    return {
      title: '', destination: '', terrain: 'coast',
      startDate: D.offsetDay(1), endDate: D.offsetDay(1),
      stops: ['', ''], meetingArea: '', meetingTime: '', budgetMin: '', budgetMax: '',
      tags: [], capacity: 3, note: ''
    };
  }
  function draftFromTrip(t) {
    return {
      id: t.id, title: t.title, destination: t.destination, terrain: t.terrain,
      startDate: t.startDate, endDate: t.endDate, stops: t.stops.slice(),
      meetingArea: t.meetingArea || '', meetingTime: t.meetingTime || '', budgetMin: t.budgetMin || '', budgetMax: t.budgetMax || '',
      tags: t.tags.slice(), capacity: t.capacity, note: t.note || ''
    };
  }
  function draftFromSource(t) {
    var d = blankDraft();
    d.destination = t.destination;
    d.terrain = t.terrain;
    d.stops = t.stops.slice();
    d.tags = t.tags.slice(0, 5);
    d.title = '';
    d.startDate = '';
    d.endDate = '';
    d.capacity = t.capacity;
    d.sourceTripId = t.id;
    return d;
  }

  function ensureDraft() {
    var r = App.route;
    if (r.name === 'edit') {
      var t = S.trip(r.a);
      if (!t) return;
      if (App.editingId !== r.a) {
        App.editingId = r.a;
        App.draft = draftFromTrip(t);
        App.draftErrors = {};
        App.draftSource = null;
      }
    } else if (r.name === 'create') {
      if (App.editingId !== null || !App.draft) {
        App.editingId = null;
        if (!App.draft || App.draft.__consumed) { App.draft = blankDraft(); App.draftSource = null; }
        App.draft.__consumed = false;
        App.draftErrors = {};
      }
    }
  }

  /* ---------------- 常驻撤销入口 ----------------
     提示条之外再给一个不会消失的撤销按钮，避免错过时机。 */
  function syncUndo() {
    var can = S.canUndo();
    var label = can ? '撤销：' + S.undoLabel() : '没有可撤销的操作';
    var top = document.getElementById('undo-btn');
    if (top) { top.hidden = !can; top.title = label; top.setAttribute('aria-label', label); }
    var rail = document.getElementById('undo-rail');
    if (rail) {
      rail.hidden = !can;
      rail.innerHTML = UI.icon('refresh') + '<span>撤销上一步</span>';
      rail.title = label;
    }
  }

  /* ---------------- 筛选控件节点保持 ----------------
     重渲染时保留同一组输入控件，避免打断输入、原生下拉与焦点。 */
  function syncFilterRow(row) {
    var f = App.filters;
    row.querySelectorAll('[data-filter]').forEach(function (el) {
      var v = f[el.getAttribute('data-filter')];
      v = v == null ? '' : String(v);
      if (el.value !== v) el.value = v;
    });
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    var me = S.me();
    if (!me) {
      shell.hidden = true;
      gateEl.hidden = false;
      gateEl.innerHTML = UI.gate();
      document.title = 'RouteMe 路觅 · 选择演示身份';
      stopPoll();
      return;
    }
    gateEl.hidden = true;
    gateEl.innerHTML = '';
    shell.hidden = false;

    var r = App.route;
    var navKey = r.name === 'trip' ? 'discover' : r.name === 'edit' ? 'create' : r.name === 'share' ? 'mine' : r.name;
    var n = UI.nav(navKey);
    document.getElementById('rail-nav').innerHTML = n.rail;
    document.getElementById('tabbar').innerHTML = n.tabs;
    document.getElementById('user-chip').innerHTML = UI.userChip(me);

    var focus = captureFocus();
    var keepRow = r.name === 'discover' ? view.querySelector('.filter-row') : null;
    var html = '';
    var title = 'RouteMe 路觅';

    if (r.name === 'trip') {
      html = UI.detail(r.a);
      var t = S.trip(r.a);
      title = (t ? t.title : '行程详情') + ' · RouteMe';
      stopPoll();
    } else if (r.name === 'create' || r.name === 'edit') {
      ensureDraft();
      if (r.name === 'edit' && !S.trip(r.a)) {
        html = UI.empty('找不到要编辑的行程', '它可能已被删除。', '<a class="btn primary" href="#/mine">回到我的旅行</a>', 'search');
      } else if (!App.draft) {
        App.draft = blankDraft();
        html = UI.tripForm(App.draft, App.draftErrors, App.draftSource, false);
      } else {
        html = UI.tripForm(App.draft, App.draftErrors, App.draftSource, r.name === 'edit');
      }
      title = (r.name === 'edit' ? '编辑行程' : '发布行程') + ' · RouteMe';
      stopPoll();
    } else if (r.name === 'mine') {
      if (r.a) App.mineTab = r.a;
      html = UI.mine(App.mineTab);
      title = '我的旅行 · RouteMe';
      stopPoll();
    } else if (r.name === 'chat') {
      html = UI.chat(r.a, r.b);
      title = '同行消息 · RouteMe';
      startPoll();
    } else if (r.name === 'share') {
      if (App.shareTripId !== r.a) {
        App.shareTripId = r.a;
        var ex = S.myExperience(r.a);
        App.shareDraft = ex ? { content: ex.content, intensity: ex.intensity, advice: ex.advice } : { content: '', intensity: '', advice: '' };
        App.shareErrors = {};
      }
      html = UI.share(r.a, App.shareDraft, App.shareErrors);
      title = '游后分享 · RouteMe';
      stopPoll();
    } else {
      html = UI.discover(App.filters);
      title = '旅行灵感 · RouteMe';
      stopPoll();
    }

    view.innerHTML = html;
    if (keepRow) {
      var freshRow = view.querySelector('.filter-row');
      if (freshRow) { syncFilterRow(keepRow); freshRow.parentNode.replaceChild(keepRow, freshRow); }
    }
    document.title = title;
    restoreFocus(focus);
    syncUndo();

    if (r.name === 'chat') {
      syncChatHeight();
      scrollChatToEnd();
    }
    renderOverlay();
  }

  /* 消息区贴底要贴三次：立即一次（不闪），下一帧一次（等高度改完生效），
     入场动画结束再一次——msgIn 的 scale/translate 会临时改变可滚动高度，
     只在渲染当时贴底会差出一截。 */
  function scrollChatToEnd() {
    var body = document.getElementById('chat-body');
    if (!body) return;
    body.scrollTop = body.scrollHeight;
    requestAnimationFrame(function () {
      var b = document.getElementById('chat-body');
      if (b) b.scrollTop = b.scrollHeight;
    });
    var msgs = body.querySelectorAll('.msg');
    var last = msgs[msgs.length - 1];
    if (last) {
      last.addEventListener('animationend', function () {
        var b = document.getElementById('chat-body');
        if (b) b.scrollTop = b.scrollHeight;
      }, { once: true });
    }
  }

  /* 聊天区高度按它自己在文档里的真实偏移量算，而不是减一个写死的常数：
     页头在窄屏会换行、视口高度也各不相同，写死的余量会把输入框顶到折叠线以下。 */
  function syncChatHeight() {
    var layout = view.querySelector('.chat-layout');
    if (!layout) return;
    if (global.matchMedia('(max-width: 980px)').matches) { layout.style.removeProperty('--chat-h'); return; }
    var top = layout.getBoundingClientRect().top + global.pageYOffset;
    var pad = parseFloat(getComputedStyle(view).paddingBottom) || 0;
    layout.style.setProperty('--chat-h', Math.max(320, Math.round(global.innerHeight - top - pad)) + 'px');
  }

  var overlayKey = '';
  var overlayTrigger = null;
  function renderOverlay() {
    drawerRoot.innerHTML = '';
    modalRoot.innerHTML = '';
    var o = App.overlay;
    var key = o ? o.kind + '|' + (o.id || '') + '|' + (App.appsTripId || '') : '';
    var changed = key !== overlayKey;
    if (changed && !overlayKey && o) {
      overlayTrigger = lastActionEl || ((document.activeElement && document.activeElement !== document.body) ? document.activeElement : null);
    }
    overlayKey = key;
    if (!o) {
      document.body.style.overflow = '';
      if (overlayTrigger && document.contains(overlayTrigger)) { try { overlayTrigger.focus(); } catch (e) { } }
      overlayTrigger = null;
      return;
    }
    document.body.style.overflow = 'hidden';
    var scrim = '<div class="scrim" data-action="close-overlay"></div>';
    if (o.kind === 'apps') {
      drawerRoot.innerHTML = scrim + UI.appsDrawer(App.appsTripId, App.picked);
    } else if (o.kind === 'script') {
      drawerRoot.innerHTML = scrim + UI.scriptDrawer();
    } else if (o.kind === 'profile') {
      modalRoot.innerHTML = scrim + '<div class="modal-wrap">' + UI.profileModal(o.id) + '</div>';
    } else if (o.kind === 'switch') {
      modalRoot.innerHTML = scrim + '<div class="modal-wrap">' + UI.switchUserModal() + '</div>';
    } else if (o.kind === 'meeting') {
      modalRoot.innerHTML = scrim + '<div class="modal-wrap">' + UI.meetingModal(o.id) + '</div>';
    } else if (o.kind === 'report') {
      modalRoot.innerHTML = scrim + '<div class="modal-wrap">' + UI.reportModal(o.type, o.id, o.label) + '</div>';
    } else if (o.kind === 'saveView') {
      modalRoot.innerHTML = scrim + '<div class="modal-wrap">' + UI.saveViewModal(App.filters) + '</div>';
    } else if (o.kind === 'confirm') {
      modalRoot.innerHTML = scrim + '<div class="modal-wrap">' + UI.confirmModal(App.confirm) + '</div>';
    } else if (o.kind === 'cancelTrip') {
      modalRoot.innerHTML = scrim + '<div class="modal-wrap">' + UI.cancelTripModal(S.trip(o.id)) + '</div>';
    }
    /* 首次打开时把焦点送进浮层面板（不是遮罩），Esc 与键盘导航才可靠 */
    if (changed) {
      var root = drawerRoot.innerHTML ? drawerRoot : modalRoot;
      var panel = root.querySelector('.drawer, .modal');
      var target = panel && (panel.querySelector('input, textarea, select') || panel.querySelector('button, a[href]'));
      if (target) { try { target.focus(); } catch (e) { } }
    }
  }
  function closeOverlay() {
    App.overlay = null;
    App.confirm = null;
    App.picked = [];
    renderOverlay();
  }
  function askConfirm(cfg, onYes) {
    App.confirm = cfg;
    App.confirm.onYes = onYes;
    App.overlay = { kind: 'confirm' };
    renderOverlay();
  }

  /* ---------------- 聊天轮询 ---------------- */
  function startPoll() {
    stopPoll();
    App.chatKey = chatSignature();
    App.pollTimer = setInterval(function () {
      var sig = chatSignature();
      if (sig !== App.chatKey) { App.chatKey = sig; render(); }
    }, 3000);
  }
  function stopPoll() { if (App.pollTimer) { clearInterval(App.pollTimer); App.pollTimer = null; } }
  function chatSignature() {
    var r = App.route;
    if (r.name !== 'chat') return '';
    var partners = S.chatPartners();
    var a = r.a, b = r.b;
    if (!a || !b) { if (partners.length) { a = partners[0].trip.id; b = partners[0].other.id; } }
    return a + '|' + b + '|' + S.thread(a, b).length + '|' + S.state.messages.length;
  }

  /* ---------------- 筛选 ---------------- */
  var searchTimer = null;
  function setFilter(key, value) {
    App.filters[key] = value;
    if (key === 'q') {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 200);
    } else render();
  }
  function clearFilters() {
    App.filters = { tab: App.filters.tab, q: '', destination: '', from: '', to: '', tags: [], sort: 'match' };
    render();
    toast('已清除全部筛选条件', 'ok');
  }

  /* ---------------- 事件：输入 ---------------- */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-filter')) { setFilter(el.getAttribute('data-filter'), el.value); return; }
    if (el.hasAttribute('data-form') && App.draft) {
      App.draft[el.getAttribute('data-form')] = el.value;
      if (el.getAttribute('data-form') === 'startDate' && App.draft.endDate && S.dayDiff(App.draft.endDate, el.value) < 0) App.draft.endDate = el.value;
      render();
      return;
    }
    if (el.hasAttribute('data-stop-input') && App.draft) {
      App.draft.stops[parseInt(el.getAttribute('data-stop-input'), 10)] = el.value;
      render();
      return;
    }
    if (el.hasAttribute('data-share') && App.shareDraft) {
      App.shareDraft[el.getAttribute('data-share')] = el.value;
      render();
      return;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-filter')) { setFilter(el.getAttribute('data-filter'), el.value); }
    else if (el.hasAttribute('data-form') && App.draft) { App.draft[el.getAttribute('data-form')] = el.value; render(); }
  });

  /* ---------------- 事件：点击 ---------------- */
  var lastActionEl = null;
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-action]');
    if (!trigger) return;
    lastActionEl = trigger;
    var act = trigger.getAttribute('data-action');
    var id = trigger.getAttribute('data-id');

    if (act === 'open-trip') { e.preventDefault(); go('#/trip/' + id); return; }

    if (trigger.tagName === 'A' && act === 'close-overlay') { closeOverlay(); return; }

    switch (act) {
      /* --- 身份与外壳 --- */
      case 'pick-user': {
        /* 从身份门进来时保留地址栏里的深链（原型包的闭环环图会直接跳到某一步）；
           会话中切换身份则回到首页，避免停在新身份看不到的行程或会话上。 */
        var deep = !S.me() ? global.location.hash : '';
        var keep = /^#\/(discover|create|mine|chat|trip|share|edit)(\/|$)/.test(deep) ? deep : '#/discover';
        S.setUser(id);
        closeOverlay();
        App.draft = null; App.editingId = null; App.shareTripId = null;
        go(keep);
        render();
        toast('已切换为 ' + S.user(id).nickname + '，数据随之更新', 'ok');
        return;
      }
      case 'switch-user': App.overlay = { kind: 'switch' }; renderOverlay(); return;
      case 'logout': S.setUser(null); closeOverlay(); render(); return;
      case 'toggle-theme':
        applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        return;
      case 'open-script': App.overlay = { kind: 'script' }; renderOverlay(); return;
      case 'reset-data':
        askConfirm({
          title: '重置演示数据？', danger: true, ok: '重置',
          body: '所有行程、申请、消息与体验都会回到初始种子状态。这个操作不可撤销，适合在演示前把环境恢复干净。'
        }, function () {
          S.reset(); App.draft = null; App.editingId = null; App.shareTripId = null;
          App.filters = { tab: 'trips', q: '', destination: '', from: '', to: '', tags: [], sort: 'match' };
          closeOverlay(); go('#/discover'); render(); toast('演示数据已重置', 'ok');
        });
        return;
      case 'close-overlay': closeOverlay(); return;
      case 'confirm-yes': {
        var fn = App.confirm && App.confirm.onYes;
        closeOverlay();
        if (fn) fn();
        return;
      }
      case 'confirm-cancel-trip': {
        var reasonEl = modalRoot.querySelector('[data-cancel-reason]');
        var noteEl = modalRoot.querySelector('[data-cancel-note]');
        var reason = reasonEl ? reasonEl.value : '';
        var note = noteEl ? noteEl.value.trim() : '';
        if (!reason) { toast('请选择取消原因', 'warn'); return; }
        if (reason === 'other' && (note.length < 1 || note.length > 100)) { toast('请填写 1–100 字的取消说明', 'warn'); return; }
        if (note.length > 100) { toast('取消说明不能超过 100 字', 'warn'); return; }
        var tripId = App.overlay && App.overlay.id;
        if (tripId && S.cancelTrip(tripId, reason, note)) {
          closeOverlay();
          go('#/mine/published');
          render();
          toast('行程已取消', 'ok');
        }
        return;
      }
      case 'undo': {
        var label = S.undo();
        if (label) { toast('已撤销：' + label, 'ok'); render(); }
        return;
      }

      /* --- 发现与筛选 --- */
      case 'set-tab': App.filters.tab = trigger.getAttribute('data-tab'); render(); return;
      case 'toggle-tag': {
        var tag = trigger.getAttribute('data-tag');
        var i = App.filters.tags.indexOf(tag);
        if (i > -1) App.filters.tags.splice(i, 1); else App.filters.tags.push(tag);
        render();
        return;
      }
      case 'clear-filters': clearFilters(); return;
      case 'save-view': App.overlay = { kind: 'saveView' }; renderOverlay(); return;
      case 'confirm-save-view': {
        var nameEl = modalRoot.querySelector('[data-view-name]');
        var name = nameEl ? nameEl.value.trim() : '';
        if (!name) { toast('给这组筛选起个名字', 'warn'); return; }
        S.saveView({
          name: name, destination: App.filters.destination, from: App.filters.from,
          to: App.filters.to, tags: App.filters.tags, sort: App.filters.sort, q: App.filters.q
        });
        closeOverlay(); render(); toast('已保存筛选「' + name + '」', 'ok');
        return;
      }
      case 'apply-view': {
        var v = null;
        S.state.savedViews.forEach(function (x) { if (x.id === id) v = x; });
        if (!v) return;
        App.filters = {
          tab: App.filters.tab, q: v.q || '', destination: v.destination || '',
          from: v.from || '', to: v.to || '', tags: (v.tags || []).slice(), sort: v.sort || 'match'
        };
        render(); toast('已应用筛选「' + v.name + '」', 'ok');
        return;
      }
      case 'del-view': S.deleteView(id); render(); toast('已删除这组常用筛选', 'ok'); return;

      /* --- 集合信息编辑 --- */
      case 'edit-meeting': App.overlay = { kind: 'meeting', id: id }; renderOverlay(); return;
      case 'submit-meeting': {
        var areaEl = modalRoot.querySelector('[data-meeting-area]');
        var timeEl = modalRoot.querySelector('[data-meeting-time]');
        var mr = S.updateMeetingInfo(id, {
          meetingArea: areaEl ? areaEl.value : '',
          meetingTime: timeEl ? timeEl.value : ''
        });
        if (!mr.ok) { toast(Object.keys(mr.errors)[0] === '_' ? mr.errors._ : '请检查集合信息', 'warn'); return; }
        closeOverlay();
        render();
        toast('集合信息已更新', 'ok');
        return;
      }

      /* --- 资料与举报 --- */
      case 'profile': App.overlay = { kind: 'profile', id: id }; renderOverlay(); return;
      case 'report':
        App.overlay = { kind: 'report', type: trigger.getAttribute('data-type'), id: id, label: trigger.getAttribute('data-label') || '' };
        renderOverlay();
        return;
      case 'submit-report': {
        var rEl = modalRoot.querySelector('[data-report-reason]');
        var nEl = modalRoot.querySelector('[data-report-note]');
        S.addReport(trigger.getAttribute('data-type'), id, rEl ? rEl.value : '其他', nEl ? nEl.value : '');
        closeOverlay();
        toast('举报已收到，我们会尽快处理。如遇危险请先联系警方或学校保卫处。', 'ok');
        return;
      }

      /* --- S08 申请 --- */
      case 'submit-apply': {
        var msgEl = view.querySelector('[data-apply-msg]');
        var res = S.apply(id, msgEl ? msgEl.value : '');
        if (!res.ok) { toast(res.reason, 'warn'); return; }
        render();
        toast('申请已提交，等待发起人回应', 'ok');
        return;
      }
      case 'cancel-app':
        askConfirm({ title: '撤回这条申请？', ok: '撤回申请', danger: true, body: '撤回后对方将不再看到这条申请，你可以重新申请。名额会立即释放。' }, function () {
          if (S.cancelApplication(id)) { render(); toast('申请已撤回', 'ok', true); }
        });
        return;

      /* --- S09 处理申请 --- */
      case 'open-apps': App.appsTripId = id; App.picked = []; App.overlay = { kind: 'apps' }; renderOverlay(); return;
      case 'pick-app': {
        var pi = App.picked.indexOf(id);
        if (pi > -1) App.picked.splice(pi, 1); else App.picked.push(id);
        renderOverlay();
        return;
      }
      case 'pick-all': {
        var pend = S.pendingApps(App.appsTripId).map(function (a) { return a.id; });
        App.picked = App.picked.length === pend.length ? [] : pend;
        renderOverlay();
        return;
      }
      case 'accept-app': {
        var ar = S.decide(id, 'ACCEPTED');
        if (!ar.ok) { toast(ar.reason, 'warn'); return; }
        App.picked = [];
        render(); renderOverlay();
        toast('已接受申请，双方现在可以聊天了', 'ok', true);
        return;
      }
      case 'reject-app': {
        var rr = S.decide(id, 'REJECTED');
        if (!rr.ok) { toast(rr.reason, 'warn'); return; }
        App.picked = [];
        render(); renderOverlay();
        toast('已拒绝这条申请', 'ok', true);
        return;
      }
      case 'bulk-accept': case 'bulk-reject': {
        var status = act === 'bulk-accept' ? 'ACCEPTED' : 'REJECTED';
        var br = S.bulkDecide(App.picked.slice(), status);
        App.picked = [];
        render(); renderOverlay();
        if (!br.done) toast(br.blocked ? '名额已满，无法接受更多同行者' : '没有可处理的申请', 'warn');
        else toast('已' + (status === 'ACCEPTED' ? '接受' : '拒绝') + ' ' + br.done + ' 条申请' + (br.blocked ? '，' + br.blocked + ' 条因名额已满被跳过' : ''), 'ok', true);
        return;
      }

      /* --- S13 / S15 行程生命周期 --- */
      case 'leave-trip':
        askConfirm({ title: '退出这次同行？', ok: '退出同行', danger: true, body: '退出后名额会释放，聊天将关闭，你不再是这条行程的同行者。若行程仍在招募中，你可以重新申请。' }, function () {
          if (S.leaveTrip(id)) { go('#/mine/matched'); render(); toast('已退出同行，名额已释放', 'ok', true); }
        });
        return;
      case 'complete-trip':
        askConfirm({ title: '标记为已结束？', ok: '结束行程', body: '结束后不再接受新申请，待处理的申请会被拒绝，参加者可以发表游后体验。演示时用它模拟旅行完成。' }, function () {
          if (S.completeTrip(id)) { render(); toast('行程已结束，参加者现在可以分享体验', 'ok', true); }
        });
        return;
      case 'cancel-trip':
        App.overlay = { kind: 'cancelTrip', id: id };
        renderOverlay();
        return;
      case 'delete-trip':
        askConfirm({ title: '永久删除这条行程？', ok: '删除', danger: true, body: '行程、相关申请、聊天记录与游后体验都会一并删除。删除后可以在提示条里撤销一次。' }, function () {
          if (S.deleteTrip(id)) { go('#/mine/published'); render(); toast('行程已删除', 'ok', true); }
        });
        return;

      /* --- S06 / S17 发布表单 --- */
      case 'copy-trip': {
        var src = S.trip(id);
        if (!src) return;
        App.draft = draftFromSource(src);
        App.draftSource = src;
        App.editingId = null;
        App.draftErrors = {};
        go('#/create');
        render();
        toast('已预填目的地、路线与兴趣，请重新选择日期和人数', 'ok');
        return;
      }
      case 'set-terrain': App.draft.terrain = trigger.getAttribute('data-terrain'); render(); return;
      case 'form-tag': {
        var ft = trigger.getAttribute('data-tag');
        var fi = App.draft.tags.indexOf(ft);
        if (fi > -1) App.draft.tags.splice(fi, 1);
        else if (App.draft.tags.length >= 5) { toast('最多选择 5 个兴趣标签', 'warn'); return; }
        else App.draft.tags.push(ft);
        render();
        return;
      }
      case 'cap-step': {
        var delta = parseInt(trigger.getAttribute('data-delta'), 10);
        var next = Math.min(12, Math.max(2, (parseInt(App.draft.capacity, 10) || 2) + delta));
        App.draft.capacity = next;
        render();
        return;
      }
      case 'add-stop':
        if (App.draft.stops.length >= 10) { toast('首版最多 10 个途经点，够写清楚一条路线了', 'warn'); return; }
        App.draft.stops.push('');
        render();
        setTimeout(function () {
          var inputs = view.querySelectorAll('[data-stop-input]');
          if (inputs.length) inputs[inputs.length - 1].focus();
        }, 20);
        return;
      case 'del-stop':
        if (App.draft.stops.length <= 2) { toast('至少保留两个途经点', 'warn'); return; }
        App.draft.stops.splice(parseInt(trigger.getAttribute('data-index'), 10), 1);
        render();
        return;
      case 'submit-trip': {
        var isEdit = App.route.name === 'edit';
        var result = isEdit ? S.updateTrip(App.route.a, App.draft) : S.createTrip(App.draft);
        if (!result.ok) {
          App.draftErrors = result.errors;
          render();
          toast('还有 ' + Object.keys(result.errors).length + ' 处需要修改', 'bad');
          var firstBad = view.querySelector('.field.bad input, .field.bad select, .field.bad textarea');
          if (firstBad) firstBad.focus();
          return;
        }
        App.draftErrors = {};
        App.draft = null;
        App.draftSource = null;
        App.editingId = null;
        go('#/trip/' + result.trip.id);
        render();
        toast(isEdit ? '行程已更新，同行者看到的内容同步生效' : '行程已发布，现在它出现在灵感首页了', 'ok');
        return;
      }

      /* --- S11 我的旅行 --- */
      case 'mine-tab': App.mineTab = trigger.getAttribute('data-tab'); go('#/mine/' + App.mineTab); render(); return;

      /* --- S12 聊天 --- */
      case 'send-msg': sendChat(trigger.getAttribute('data-trip'), trigger.getAttribute('data-to')); return;
      case 'refresh': App.chatKey = chatSignature(); render(); toast('消息已刷新', 'ok'); return;

      /* --- S16 游后分享 --- */
      case 'set-intensity': App.shareDraft.intensity = trigger.getAttribute('data-value'); render(); return;
      case 'submit-share': {
        var sr = S.saveExperience(id, App.shareDraft);
        if (!sr.ok) {
          if (sr.errors) { App.shareErrors = sr.errors; render(); toast('还有 ' + Object.keys(sr.errors).length + ' 处需要补充', 'bad'); }
          else toast(sr.reason, 'warn');
          return;
        }
        App.shareErrors = {};
        App.shareTripId = null;
        go('#/trip/' + id);
        render();
        toast(sr.updated ? '体验已更新' : '体验已发布，它已回到灵感首页，成为下一位同学的灵感', 'ok');
        return;
      }
    }
  });

  function sendChat(tripId, toId) {
    var input = view.querySelector('[data-chat-input]');
    if (!input) return;
    var text = input.value.trim();
    if (!text) { toast('先写点什么再发送', 'warn'); input.focus(); return; }
    var res = S.sendMessage(tripId, toId, text);
    if (!res.ok) { toast(res.reason, 'bad'); return; }
    input.value = '';
    App.chatKey = tripId + '|' + toId + '|' + S.thread(tripId, toId).length + '|' + S.state.messages.length;
    render();
    var again = view.querySelector('[data-chat-input]');
    if (again) again.focus();
  }

  /* ---------------- 键盘 ---------------- */
  global.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && App.overlay) { e.preventDefault(); closeOverlay(); return; }
    if (e.target.hasAttribute && e.target.hasAttribute('data-chat-input') && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var btn = view.querySelector('[data-action="send-msg"]');
      if (btn) sendChat(btn.getAttribute('data-trip'), btn.getAttribute('data-to'));
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('trip-card')) {
      e.preventDefault();
      go('#/trip/' + e.target.getAttribute('data-id'));
    }
  }, true);

  /* ---------------- 途经点拖动排序 ---------------- */
  var dragIndex = null;
  view.addEventListener('mousedown', function (e) {
    var row = e.target.closest('.stop-row');
    if (!row) return;
    row.draggable = !!e.target.closest('.stop-handle');
  });
  view.addEventListener('dragstart', function (e) {
    var row = e.target.closest('.stop-row');
    if (!row || !App.draft) return;
    dragIndex = parseInt(row.getAttribute('data-stop'), 10);
    row.classList.add('dragging');
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragIndex)); } catch (err) { }
  });
  view.addEventListener('dragover', function (e) {
    var row = e.target.closest('.stop-row');
    if (!row || dragIndex === null) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch (err) { }
    view.querySelectorAll('.stop-row.drag-over').forEach(function (x) { x.classList.remove('drag-over'); });
    row.classList.add('drag-over');
  });
  view.addEventListener('drop', function (e) {
    var row = e.target.closest('.stop-row');
    if (!row || dragIndex === null || !App.draft) return;
    e.preventDefault();
    var to = parseInt(row.getAttribute('data-stop'), 10);
    if (to !== dragIndex) {
      var moved = App.draft.stops.splice(dragIndex, 1)[0];
      App.draft.stops.splice(to, 0, moved);
      dragIndex = null;
      render();
      toast('路线顺序已调整', 'ok');
    } else dragIndex = null;
  });
  view.addEventListener('dragend', function () {
    dragIndex = null;
    view.querySelectorAll('.stop-row').forEach(function (x) { x.classList.remove('dragging', 'drag-over'); x.draggable = true; });
  });

  /* ---------------- 视口变化 ---------------- */
  var resizeFrame = 0;
  global.addEventListener('resize', function () {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(function () {
      resizeFrame = 0;
      syncChatHeight();
      scrollChatToEnd();
    });
  });

  /* ---------------- 跨标签同步 ---------------- */
  global.addEventListener('storage', function (e) {
    if (e.key === 'routeme.mvp.v1') { global.location.reload(); }
  });

  /* ---------------- 启动 ---------------- */
  global.addEventListener('hashchange', function () {
    if (global.location.hash !== lastHandled) handleRoute();
  });

  S.subscribe(function () { /* 状态变更由具体动作触发渲染，避免重复重绘 */ });

  App.route = parseHash();
  if (!global.location.hash) global.location.replace('#/discover');
  render();
})(window);
