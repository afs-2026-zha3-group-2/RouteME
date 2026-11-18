/* ============================================================
   RouteMe 路觅 · 管理后台编排
   与用户端共享 store.js 的同一份 localStorage：
   处罚即时生效、举报状态双向可见、客服跨标签页实时对话。
   ============================================================ */
(function (global) {
  'use strict';
  var S = global.Store, UI = global.UI, D = global.RMData;
  var esc = UI.esc, icon = UI.icon, avatar = UI.avatar;
  var KEY = 'routeme.mvp.v1', THEME_KEY = 'routeme.theme', SESSION_KEY = 'routeme.admin.session.v1';
  var DAY = 86400000;

  var gateEl = document.getElementById('agate');
  var consoleEl = document.getElementById('aconsole');
  var navEl = document.getElementById('anav');
  var viewEl = document.getElementById('aview');
  var titleEl = document.getElementById('a-title');
  var crumbEl = document.getElementById('a-crumb');
  var liveEl = document.getElementById('a-live');
  var syncEl = document.getElementById('async-hint');
  var modalRoot = document.getElementById('amodal-root');
  var toastRoot = document.getElementById('atoast-root');

  function blankM() { return { reason: '', note: '', banReason: '', until: '', days: 0, penalty: 'none', err: '' }; }
  var A = {
    session: false, route: { name: 'overview', id: null },
    loginUser: '', loginPass: '', loginErr: '',
    usersQ: '', usersStatus: 'ALL', usersSort: 'new',
    reportsQ: '', reportsStatus: 'ALL',
    userTab: 'trips',
    supportTab: 'WAITING', supportId: null,
    overlay: null, m: blankM()
  };

  /* ---------------- 小工具 ---------------- */
  function $(sel) { return document.querySelector(sel); }
  function fullTime(ts) {
    return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function dtLocal(ts) {
    var d = new Date(ts);
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function parseDt(v) { var t = new Date(v).getTime(); return isNaN(t) ? 0 : t; }
  function statusBadge(u) {
    var m = S.ACCOUNT_STATUS[u.status || 'ACTIVE'];
    return '<span class="badge ' + m.tone + '">' + m.label + '</span>';
  }
  function repBadge(r) { var m = S.REPORT_STATUS[r.status]; return '<span class="badge ' + m.tone + '">' + m.label + '</span>'; }
  function sessBadge(c) { var m = S.SESSION_STATUS[c.status]; return '<span class="badge ' + m.tone + '">' + m.label + '</span>'; }
  function userLink(u) {
    if (!u) return '<span class="hint">未知用户</span>';
    return '<a class="a-link" href="#/users/' + u.id + '">' + esc(u.nickname) + '</a> <span class="a-mono">' + esc(u.id) + '</span>';
  }
  function toast(text, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok');
    el.innerHTML = icon(kind === 'bad' ? 'alert' : kind === 'warn' ? 'info' : 'check') +
      '<span class="toast-text">' + esc(text) + '</span>' +
      '<button class="toast-x" type="button" aria-label="关闭提示">' + icon('x') + '</button>';
    toastRoot.appendChild(el);
    var kill = function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 260); };
    el.querySelector('.toast-x').addEventListener('click', kill);
    setTimeout(kill, 3800);
  }
  function panelTitle(ic, text, sideHtml) {
    return '<h3 class="a-panel-title">' + icon(ic) + esc(text) + '<span class="grow"></span>' + (sideHtml || '') + '</h3>';
  }
  function timeline(items) {
    if (!items.length) return UI.empty('暂无记录', '这里还没有产生任何记录。', '', 'clock');
    return '<div class="a-timeline">' + items.map(function (it) {
      return '<div class="a-tl-item ' + (it.tone || '') + '">' +
        '<div class="a-tl-head">' + it.head + '<span class="a-tl-time">' + esc(UI.fmtStamp(it.at)) + '</span></div>' +
        (it.text ? '<p class="a-tl-text">' + esc(it.text) + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  }
  var LOG_TONE = { ban: 'danger', suspend: 'amber', restore: 'jade', report: 'dusk', takedown: 'danger', session: '' };
  function logItems(list) {
    return list.map(function (g) {
      var link = g.reportId ? '<a class="a-link" href="#/reports/' + g.reportId + '">查看举报</a>'
        : g.userId ? '<a class="a-link" href="#/users/' + g.userId + '">查看用户</a>' : '';
      return { at: g.at, tone: LOG_TONE[g.kind] || '', head: esc(g.actor) + (link ? ' · ' + link : ''), text: g.text };
    });
  }

  /* ---------------- 主题 ---------------- */
  var theme = 'light';
  try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { }
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light'); }
  applyTheme(theme);

  /* ---------------- 登录门（仅管理员可访问） ---------------- */
  function loginView() {
    return '<div class="a-login"><div class="a-login-card">' +
      '<div class="a-login-brand">' +
      '<svg class="brand-bare" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 24c5-13 17-13 22 0" fill="none" stroke="var(--coral)" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="10" r="3.4" fill="var(--amber)"/></svg>' +
      '<span><b>RouteMe 路觅</b><i>ADMIN CONSOLE</i></span></div>' +
      '<h1 class="a-login-title">管理后台登录</h1>' +
      '<p class="a-login-sub">用户管理、账号处罚、举报处理与人工客服。仅管理员账号可访问，普通用户账号将被拒绝。</p>' +
      '<form id="a-login-form" class="a-login-fields" novalidate>' +
      '<label class="field"><span class="label">用户名</span>' +
      '<input class="input" id="a-user" name="username" autocomplete="username" placeholder="管理员用户名" value="' + esc(A.loginUser) + '"></label>' +
      '<label class="field"><span class="label">密码</span>' +
      '<input class="input" id="a-pass" name="password" type="password" autocomplete="current-password" placeholder="管理员密码" value="' + esc(A.loginPass) + '"></label>' +
      (A.loginErr ? '<div class="a-login-err" role="alert">' + icon('alert') + '<span>' + esc(A.loginErr) + '</span></div>' : '') +
      '<button class="btn primary block" type="submit">' + icon('shield') + '登录管理后台</button>' +
      '</form>' +
      '<div class="a-login-hint">' +
      '<p>' + icon('info') + '<span>演示管理员：<code>admin</code> / <code>admin123</code></span></p>' +
      '<p>' + icon('info') + '<span>普通用户账号（如 <code>linjianxia</code>）登录会被拒绝，以验证「仅管理员可访问」。</span></p>' +
      '</div>' +
      '<div class="a-login-foot"><a href="prototype.html">← 返回用户端</a><a href="index.html">原型门户</a></div>' +
      '</div></div>';
  }
  function doLogin() {
    var name = A.loginUser.trim(), pass = A.loginPass;
    if (!name || !pass) { A.loginErr = '请输入用户名和密码。'; render(); return; }
    if (name === S.ADMIN_DEMO.username && D.demoHash(pass) === S.ADMIN_DEMO.passHash) {
      A.session = true; A.loginErr = '';
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { }
      A.route = parseHash();
      if (!global.location.hash || global.location.hash === '#/') global.location.hash = '#/overview';
      render();
      toast('欢迎回来，' + S.ADMIN_DEMO.name);
      return;
    }
    var isDemo = S.state.users.some(function (u) { return u.username === name; });
    A.loginErr = isDemo
      ? '「' + name + '」是普通用户账号。管理后台仅管理员可访问，请使用管理员账号登录。'
      : '用户名或密码不正确，请重试。';
    render();
    var p = $('#a-pass'); if (p) { p.focus(); p.select(); }
  }

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    var h = (global.location.hash || '#/overview').replace(/^#\/?/, '');
    var p = h.split('/').filter(Boolean);
    var name = p[0] || 'overview';
    if (['overview', 'users', 'reports', 'support'].indexOf(name) === -1) name = 'overview';
    return { name: name, id: p[1] || null };
  }
  function go(hash) {
    if (global.location.hash !== hash) global.location.hash = hash;
    else { A.route = parseHash(); A.overlay = null; render(); global.scrollTo(0, 0); }
  }

  /* ---------------- 外壳：导航 / 顶栏 ---------------- */
  var NAV = [
    { key: 'overview', href: '#/overview', label: '总览', ic: 'compass' },
    { key: 'users', href: '#/users', label: '用户管理', ic: 'users' },
    { key: 'reports', href: '#/reports', label: '举报管理', ic: 'flag' },
    { key: 'support', href: '#/support', label: '客户服务', ic: 'chat' }
  ];
  function renderNav() {
    var pending = S.state.reports.filter(function (r) { return r.status === 'PENDING'; }).length;
    var waiting = S.state.supportSessions.filter(function (c) { return c.status === 'WAITING'; }).length;
    navEl.innerHTML = NAV.map(function (n) {
      var badge = '';
      if (n.key === 'reports' && pending) badge = '<span class="a-nav-badge" title="' + pending + ' 条待处理举报">' + pending + '</span>';
      if (n.key === 'support' && waiting) badge = '<span class="a-nav-badge amber" title="' + waiting + ' 个等待接入会话">' + waiting + '</span>';
      return '<a class="a-nav-link' + (A.route.name === n.key ? ' active' : '') + '" href="' + n.href + '"' +
        (A.route.name === n.key ? ' aria-current="page"' : '') + '>' + icon(n.ic) + '<span>' + n.label + '</span>' + badge + '</a>';
    }).join('');
    syncEl.innerHTML = icon('refresh') + '<span>与用户端共用同一份本地数据，处罚与消息即时同步。</span>';
    liveEl.textContent = '实时同步中';
  }
  function renderTopbar() {
    var r = A.route, t = '总览', c = '平台运行状况与待办';
    if (r.name === 'users') {
      if (r.id) { var u = S.user(r.id); t = '用户详情'; c = u ? u.nickname + ' · ' + u.id : '用户不存在'; }
      else { t = '用户管理'; c = '全部注册用户 · 搜索、状态与处罚'; }
    } else if (r.name === 'reports') {
      if (r.id) { var rp = S.reportOf(r.id); t = '举报详情'; c = rp ? rp.no + ' · ' + S.REPORT_STATUS[rp.status].label : '举报不存在'; }
      else { t = '举报管理'; c = '用户、旅行计划与旅行体验的举报'; }
    } else if (r.name === 'support') { t = '客户服务'; c = '人工客服工作台 · 接入、对话与结束'; }
    titleEl.textContent = t; crumbEl.textContent = '管理后台 / ' + c;
  }

  /* ---------------- 视图：总览 ---------------- */
  function statCard(ic, tone, num, label, action, v) {
    return '<div class="a-stat"><span class="a-stat-ic ' + tone + '">' + icon(ic) + '</span>' +
      '<b>' + num + '</b><span>' + esc(label) + '</span>' +
      '<button class="a-stat-link" type="button" data-action="' + action + '"' + (v ? ' data-v="' + v + '"' : '') +
      ' aria-label="查看' + esc(label) + '"></button></div>';
  }
  function overviewView() {
    var users = S.state.users;
    var nActive = users.filter(function (u) { return u.status === 'ACTIVE'; }).length;
    var nSusp = users.filter(function (u) { return u.status === 'SUSPENDED'; }).length;
    var nBan = users.filter(function (u) { return u.status === 'BANNED'; }).length;
    var pending = S.state.reports.filter(function (r) { return r.status === 'PENDING'; });
    var processing = S.state.reports.filter(function (r) { return r.status === 'PROCESSING'; });
    var waiting = S.state.supportSessions.filter(function (c) { return c.status === 'WAITING'; });
    var handling = S.state.supportSessions.filter(function (c) { return c.status === 'HANDLING'; });

    var stats = '<div class="a-stats">' +
      statCard('users', '', users.length, '注册用户', 'a-go-users', 'ALL') +
      statCard('check', 'surf', nActive, '正常账号', 'a-go-users', 'ACTIVE') +
      statCard('clock', 'amber', nSusp, '已暂停账号', 'a-go-users', 'SUSPENDED') +
      statCard('shield', 'danger', nBan, '已封禁账号', 'a-go-users', 'BANNED') +
      statCard('flag', 'dusk', pending.length + processing.length, '待办举报', 'a-go-reports', 'PENDING') +
      statCard('chat', 'amber', waiting.length + handling.length, '进行中客服会话', 'a-go-support', 'WAITING') +
      '</div>';

    var queue = pending.concat(processing).sort(function (a, b) { return a.createdAt - b.createdAt; });
    var queueHtml = queue.length
      ? '<div class="a-list">' + queue.slice(0, 5).map(function (r) {
        var tu = r.targetUserId ? S.user(r.targetUserId) : null;
        return '<div class="a-item"><div class="a-item-body">' +
          '<div class="a-item-title"><span class="a-mono">' + esc(r.no) + '</span>' + repBadge(r) + '</div>' +
          '<div class="a-item-meta"><span>' + icon('flag') + esc(r.reason) + '</span><span>' + icon('users') + (tu ? esc(tu.nickname) : '—') + '</span><span>' + icon('clock') + esc(UI.relTime(r.createdAt)) + '</span></div>' +
          '<p class="a-item-text">' + esc(S.REPORT_TARGET[r.targetType]) + ' · ' + esc(UI.reportTargetLabel(r)) + '</p>' +
          '</div><div class="a-item-side"><a class="btn sm ' + (r.status === 'PENDING' ? 'primary' : 'sea') + '" href="#/reports/' + r.id + '">' +
          icon(r.status === 'PENDING' ? 'play' : 'right') + (r.status === 'PENDING' ? '受理' : '继续处理') + '</a></div></div>';
      }).join('') + '</div>'
      : UI.empty('举报队列已清空', '当前没有待处理或处理中的举报。', '', 'check');

    var waitHtml = waiting.length
      ? '<div class="a-list" style="margin-top:12px">' + waiting.map(function (c) {
        var u = S.user(c.userId);
        var last = c.messages[c.messages.length - 1];
        return '<div class="a-item"><div class="a-item-body">' +
          '<div class="a-item-title">' + avatar(u, 'sm') + esc(u ? u.nickname : c.userId) + sessBadge(c) + '</div>' +
          '<p class="a-item-text">' + esc(last ? last.text : '') + '</p>' +
          '</div><div class="a-item-side"><button class="btn sm primary" type="button" data-action="a-cs-accept" data-id="' + c.id + '">' + icon('chat') + '接入</button>' +
          '<a class="btn sm ghost" href="#/support" data-action="a-cs-open" data-id="' + c.id + '">打开会话</a></div></div>';
      }).join('') + '</div>'
      : '';

    var log = S.state.adminLog.slice(0, 8);
    return stats +
      '<div class="a-cols">' +
      '<section class="panel">' + panelTitle('inbox', '待办队列', '<a href="#/reports">全部举报 →</a>') + queueHtml +
      (waiting.length ? panelTitle('chat', '等待接入的客服会话', '<a href="#/support">工作台 →</a>').replace('a-panel-title', 'a-panel-title" style="margin-top:18px') + waitHtml : '') +
      '</section>' +
      '<section class="panel">' + panelTitle('clock', '最近管理动作') + timeline(logItems(log)) + '</section>' +
      '</div>' +
      '<div class="a-quick">' +
      '<a class="btn sea" href="#/users">' + icon('users') + '管理用户</a>' +
      '<a class="btn sea" href="#/reports">' + icon('flag') + '处理举报</a>' +
      '<a class="btn sea" href="#/support">' + icon('chat') + '进入客服工作台</a>' +
      '<a class="btn ghost" href="prototype.html" target="_blank" rel="noopener">' + icon('exit') + '打开用户端对照验证</a>' +
      '</div>';
  }

  /* ---------------- 视图：用户管理 ---------------- */
  function filteredUsers() {
    var q = A.usersQ.trim().toLowerCase();
    var list = S.state.users.filter(function (u) {
      if (A.usersStatus !== 'ALL' && u.status !== A.usersStatus) return false;
      if (!q) return true;
      return (u.id + ' ' + u.nickname + ' ' + (u.email || '') + ' ' + (u.username || '')).toLowerCase().indexOf(q) > -1;
    });
    list.sort(function (a, b) {
      if (A.usersSort === 'old') return a.joinedAt - b.joinedAt;
      if (A.usersSort === 'name') return a.nickname.localeCompare(b.nickname, 'zh-CN');
      return b.joinedAt - a.joinedAt;
    });
    return list;
  }
  function usersView() {
    var users = S.state.users;
    function n(st) { return st === 'ALL' ? users.length : users.filter(function (u) { return u.status === st; }).length; }
    var chips = [['ALL', '全部'], ['ACTIVE', '正常'], ['SUSPENDED', '已暂停'], ['BANNED', '已封禁']].map(function (c) {
      return '<button class="a-chip' + (A.usersStatus === c[0] ? ' on' : '') + '" type="button" data-action="a-users-status" data-v="' + c[0] + '">' +
        c[1] + '<span class="a-chip-n">' + n(c[0]) + '</span></button>';
    }).join('');
    var list = filteredUsers();
    var rows = list.map(function (u) {
      var trips = S.state.trips.filter(function (t) { return t.creatorId === u.id && t.status !== 'CANCELLED'; }).length;
      var exps = S.state.experiences.filter(function (e) { return e.authorId === u.id; }).length;
      var hint = u.status === 'BANNED' && u.banInfo ? '至 ' + UI.fmtStamp(u.banInfo.until)
        : u.status === 'SUSPENDED' && u.suspendInfo ? u.suspendInfo.reason : '';
      return '<tr data-action="a-nav" data-href="#/users/' + u.id + '" tabindex="0" aria-label="查看 ' + esc(u.nickname) + ' 的详情">' +
        '<td><span class="a-user-cell">' + avatar(u) + '<span><b>' + esc(u.nickname) + '</b><i>' + esc(u.id) + '</i></span></span></td>' +
        '<td><span class="a-email">' + esc(u.email || '—') + '</span></td>' +
        '<td><span class="a-time">' + esc(UI.fmtStamp(u.joinedAt)) + '<i>' + esc(UI.relTime(u.joinedAt)) + '</i></span></td>' +
        '<td><span class="a-status-cell">' + statusBadge(u) + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</span></td>' +
        '<td><span class="a-mono">' + trips + ' 行程 · ' + exps + ' 体验</span></td>' +
        '<td><span class="a-row-actions"><span class="btn sm ghost">' + icon('right') + '详情</span></span></td></tr>';
    }).join('');
    return '<div class="a-page-head"><div><h2>用户管理</h2><p>平台全部注册用户，支持按 ID、昵称或邮箱搜索；点击行进入用户详情。</p></div></div>' +
      '<div class="a-toolbar">' +
      '<div class="a-search">' + icon('search') + '<input class="input" type="search" placeholder="搜索用户 ID / 昵称 / 邮箱…" value="' + esc(A.usersQ) + '" data-aq="usersQ" aria-label="搜索用户"></div>' +
      '<div class="a-chips">' + chips + '</div>' +
      '<select class="select" data-asort style="width:auto" aria-label="排序方式">' +
      '<option value="new"' + (A.usersSort === 'new' ? ' selected' : '') + '>最新注册</option>' +
      '<option value="old"' + (A.usersSort === 'old' ? ' selected' : '') + '>最早注册</option>' +
      '<option value="name"' + (A.usersSort === 'name' ? ' selected' : '') + '>昵称排序</option></select>' +
      '</div>' +
      '<p class="a-count">共 <b>' + list.length + '</b> 位用户' + (A.usersQ ? '（搜索“' + esc(A.usersQ) + '”）' : '') + '</p>' +
      (list.length
        ? '<div class="a-table-wrap"><table class="a-table"><thead><tr><th>用户</th><th>邮箱</th><th>注册时间</th><th>账号状态</th><th>内容</th><th style="text-align:right">操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : UI.empty('没有匹配的用户', '换个关键词，或清除状态筛选再试试。', '<button class="btn ghost" type="button" data-action="a-users-clear">' + icon('refresh') + '清除筛选</button>', 'search'));
  }

  /* ---------------- 视图：用户详情 ---------------- */
  function tripItem(t) {
    return '<div class="a-item"><div class="a-item-body">' +
      '<div class="a-item-title">' + esc(t.title) + UI.tripBadge(t) + (t.adminNote ? '<span class="badge danger no-dot">管理员下架</span>' : '') + '</div>' +
      '<div class="a-item-meta"><span>' + icon('calendar') + esc(UI.fmtRange(t.startDate, t.endDate)) + '</span>' +
      '<span>' + icon('pin') + esc(t.destination) + '</span><span>' + icon('users') + esc(t.capacity) + ' 人</span>' +
      '<span>' + esc(UI.budgetText(t)) + '</span></div>' +
      (t.note ? '<p class="a-item-text">' + esc(t.note) + '</p>' : '') +
      (t.adminNote ? '<p class="a-item-text" style="color:var(--t-danger)">下架说明：' + esc(t.adminNote) + '</p>' : '') +
      '</div><div class="a-item-side">' +
      '<button class="btn sm ghost" type="button" data-action="a-preview-trip" data-id="' + t.id + '">' + icon('eye') + '预览</button>' +
      '<a class="btn sm ghost" href="prototype.html#/trip/' + t.id + '" target="_blank" rel="noopener">' + icon('exit') + '用户端</a>' +
      '</div></div>';
  }
  function expItem(e) {
    var t = S.trip(e.tripId), it = D.INTENSITY[e.intensity] || { label: e.intensity, tone: 'muted' };
    return '<div class="a-item"><div class="a-item-body">' +
      '<div class="a-item-title">' + esc(t ? t.title : '行程') + ' 的旅行体验' +
      '<span class="badge ' + it.tone + ' no-dot">强度 · ' + esc(it.label) + '</span>' +
      (e.hidden ? '<span class="badge danger no-dot">已下架</span>' : '') + '</div>' +
      '<div class="a-item-meta"><span>' + icon('clock') + esc(UI.fmtStamp(e.createdAt)) + '</span></div>' +
      '<p class="a-item-text">' + esc(e.content) + '</p>' +
      (e.advice ? '<p class="a-item-text"><b>给后来者：</b>' + esc(e.advice) + '</p>' : '') +
      (e.adminNote ? '<p class="a-item-text" style="color:var(--t-danger)">下架说明：' + esc(e.adminNote) + '</p>' : '') +
      '</div><div class="a-item-side">' +
      '<button class="btn sm ghost" type="button" data-action="a-preview-exp" data-id="' + e.id + '">' + icon('eye') + '预览</button>' +
      '</div></div>';
  }
  function reportItem(r, role) {
    return '<div class="a-item"><div class="a-item-body">' +
      '<div class="a-item-title"><span class="a-mono">' + esc(r.no) + '</span>' + repBadge(r) +
      (role ? '<span class="badge muted no-dot">' + esc(role) + '</span>' : '') + '</div>' +
      '<div class="a-item-meta"><span>' + icon('flag') + esc(r.reason) + '</span>' +
      '<span>' + esc(S.REPORT_TARGET[r.targetType]) + ' · ' + esc(UI.reportTargetLabel(r)) + '</span>' +
      '<span>' + icon('clock') + esc(UI.relTime(r.createdAt)) + '</span></div>' +
      (r.note ? '<p class="a-item-text">' + esc(r.note) + '</p>' : '') +
      '</div><div class="a-item-side"><a class="btn sm ghost" href="#/reports/' + r.id + '">' + icon('right') + '详情</a></div></div>';
  }
  function userDetailView(id) {
    var u = S.user(id);
    if (!u) return UI.empty('找不到该用户', '用户可能不存在。回到用户管理重新选择。', '<a class="btn primary" href="#/users">回到用户管理</a>', 'users');
    var st = S.stats(u.id);
    var trips = S.state.trips.filter(function (t) { return t.creatorId === u.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    var exps = S.state.experiences.filter(function (e) { return e.authorId === u.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; });
    var reps = S.reportsRelated(u.id);
    var logs = S.state.adminLog.filter(function (g) { return g.userId === u.id; });

    var head = '<section class="panel"><div class="a-profile-head">' + avatar(u, 'xl') +
      '<div class="a-profile-id"><h2 class="a-profile-name">' + esc(u.nickname) + statusBadge(u) + '</h2>' +
      '<p class="a-profile-school">' + esc(u.school || '') + (u.city ? ' · ' + esc(u.city) : '') + '</p>' +
      '<p class="a-profile-bio">' + esc(u.bio || '这位用户还没有填写简介。') + '</p>' +
      '<div class="row" style="margin-top:10px">' + UI.tags(u.interests) + '</div></div></div>' +
      '<dl class="a-meta">' +
      '<div><dt>用户 ID</dt><dd class="mono">' + esc(u.id) + '</dd></div>' +
      '<div><dt>邮箱</dt><dd>' + esc(u.email || '—') + '</dd></div>' +
      '<div><dt>用户名</dt><dd class="mono">' + esc(u.username || '—') + '</dd></div>' +
      '<div><dt>注册时间</dt><dd>' + esc(fullTime(u.joinedAt)) + '</dd></div>' +
      '<div><dt>账号状态</dt><dd>' + S.ACCOUNT_STATUS[u.status].label + '</dd></div>' +
      '<div><dt>所在城市</dt><dd>' + esc(u.city || '—') + '</dd></div>' +
      '</dl>' +
      '<div class="a-profile-stats">' +
      '<span><b>' + st.published + '</b>发布行程</span><span><b>' + st.completed + '</b>已完成</span>' +
      '<span><b>' + st.joined + '</b>参加同行</span><span><b>' + st.shared + '</b>分享体验</span>' +
      '<span><b>' + reps.length + '</b>相关举报</span></div>' +
      UI.acctNote(u) + '</section>';

    var tabs = [['trips', '旅行计划', trips.length], ['exps', '旅行体验', exps.length], ['reports', '举报记录', reps.length], ['log', '处罚记录', logs.length]];
    var tabHtml = '<div class="a-chips a-tabs">' + tabs.map(function (t) {
      return '<button class="a-chip' + (A.userTab === t[0] ? ' on' : '') + '" type="button" data-action="a-user-tab" data-v="' + t[0] + '">' +
        t[1] + '<span class="a-chip-n">' + t[2] + '</span></button>';
    }).join('') + '</div>';

    var body;
    if (A.userTab === 'trips') {
      body = trips.length ? '<div class="a-list">' + trips.map(tripItem).join('') + '</div>'
        : UI.empty('还没有旅行计划', '该用户尚未发布任何行程。处罚不会删除已有内容。', '', 'route');
    } else if (A.userTab === 'exps') {
      body = exps.length ? '<div class="a-list">' + exps.map(expItem).join('') + '</div>'
        : UI.empty('还没有旅行体验', '该用户尚未分享游后体验。', '', 'spark');
    } else if (A.userTab === 'reports') {
      body = reps.length ? '<div class="a-list">' + reps.map(function (r) {
        return reportItem(r, r.targetUserId === u.id ? '被举报' : '举报人');
      }).join('') + '</div>'
        : UI.empty('没有相关举报', '该用户没有被举报，也没有提交过举报。', '', 'flag');
    } else {
      body = '<section class="panel">' + timeline(logItems(logs)) + '</section>';
    }

    var acts = '';
    if (u.status === 'ACTIVE') {
      acts = '<button class="btn" type="button" data-action="a-suspend" data-id="' + u.id + '" style="color:var(--t-warn)">' + icon('clock') + '暂停账号</button>' +
        '<button class="btn danger" type="button" data-action="a-ban" data-id="' + u.id + '">' + icon('shield') + '封禁账号</button>';
    } else if (u.status === 'SUSPENDED') {
      acts = '<button class="btn sea" type="button" data-action="a-restore" data-id="' + u.id + '">' + icon('check') + '恢复为正常</button>' +
        '<button class="btn danger" type="button" data-action="a-ban" data-id="' + u.id + '">' + icon('shield') + '升级为封禁</button>';
    } else {
      acts = '<button class="btn sea" type="button" data-action="a-unban" data-id="' + u.id + '">' + icon('refresh') + '提前解封</button>';
    }
    var sess = S.sessionsOf(u.id)[0] || null;
    var side = '<section class="panel a-action-panel">' + panelTitle('shield', '账号操作') + acts +
      '<button class="btn ghost" type="button" data-action="a-user-support" data-id="' + u.id + '"' + (sess ? '' : ' disabled style="opacity:.55;cursor:not-allowed"') + '>' +
      icon('chat') + (sess ? '打开客服会话（' + S.SESSION_STATUS[sess.status].label + '）' : '暂无客服会话') + '</button>' +
      '<p class="a-state-note">' + icon('info') + '<span>暂停限制发布行程、申请同行、发消息与分享体验；封禁后用户端展示封禁门。处罚不会删除行程、体验、聊天与举报记录，MVP 不提供永久删除。</span></p>' +
      '</section>';

    return '<a class="a-back" href="#/users">' + icon('left') + '回到用户管理</a>' +
      '<div class="a-profile"><div>' + head + tabHtml + body + '</div>' + side + '</div>';
  }

  /* ---------------- 视图：举报管理 ---------------- */
  function filteredReports() {
    var q = A.reportsQ.trim().toLowerCase();
    var list = S.state.reports.filter(function (r) {
      if (A.reportsStatus !== 'ALL' && r.status !== A.reportsStatus) return false;
      if (!q) return true;
      var reporter = S.user(r.reporterId), tu = r.targetUserId ? S.user(r.targetUserId) : null;
      var hay = (r.no + ' ' + r.reason + ' ' + (reporter ? reporter.nickname : '') + ' ' + (tu ? tu.nickname : '') + ' ' + UI.reportTargetLabel(r)).toLowerCase();
      return hay.indexOf(q) > -1;
    });
    return list.sort(function (a, b) { return b.createdAt - a.createdAt; });
  }
  function reportsView() {
    var all = S.state.reports;
    function n(st) { return st === 'ALL' ? all.length : all.filter(function (r) { return r.status === st; }).length; }
    var chips = [['ALL', '全部'], ['PENDING', '待处理'], ['PROCESSING', '处理中'], ['RESOLVED', '已处理'], ['REJECTED', '不成立']].map(function (c) {
      return '<button class="a-chip' + (A.reportsStatus === c[0] ? ' on' : '') + '" type="button" data-action="a-reports-status" data-v="' + c[0] + '">' +
        c[1] + '<span class="a-chip-n">' + n(c[0]) + '</span></button>';
    }).join('');
    var list = filteredReports();
    var rows = list.map(function (r) {
      var reporter = S.user(r.reporterId), tu = r.targetUserId ? S.user(r.targetUserId) : null;
      return '<tr data-action="a-nav" data-href="#/reports/' + r.id + '" tabindex="0" aria-label="查看举报 ' + esc(r.no) + '">' +
        '<td><span class="a-mono" style="font-weight:700;color:var(--t-lagoon)">' + esc(r.no) + '</span></td>' +
        '<td><span class="a-user-cell">' + avatar(reporter, 'sm') + '<span><b>' + esc(reporter ? reporter.nickname : r.reporterId) + '</b></span></span></td>' +
        '<td>' + (tu ? '<span class="a-user-cell">' + avatar(tu, 'sm') + '<span><b>' + esc(tu.nickname) + '</b><i>' + esc(tu.id) + '</i></span></span>' : '<span class="hint">—</span>') + '</td>' +
        '<td><span class="a-target-cell"><span class="badge muted no-dot" style="justify-self:start">' + esc(S.REPORT_TARGET[r.targetType]) + '</span><b>' + esc(UI.reportTargetLabel(r)) + '</b></span></td>' +
        '<td style="max-width:180px">' + esc(r.reason) + '</td>' +
        '<td><span class="a-time">' + esc(UI.fmtStamp(r.createdAt)) + '<i>' + esc(UI.relTime(r.createdAt)) + '</i></span></td>' +
        '<td>' + repBadge(r) + '</td></tr>';
    }).join('');
    return '<div class="a-page-head"><div><h2>举报管理</h2><p>用户提交的举报默认待处理；点击行进入详情，受理后可处罚账号或下架内容。</p></div></div>' +
      '<div class="a-toolbar">' +
      '<div class="a-search">' + icon('search') + '<input class="input" type="search" placeholder="搜索编号 / 类型 / 举报人 / 对象…" value="' + esc(A.reportsQ) + '" data-aq="reportsQ" aria-label="搜索举报"></div>' +
      '<div class="a-chips">' + chips + '</div></div>' +
      '<p class="a-count">共 <b>' + list.length + '</b> 条举报' + (A.reportsQ ? '（搜索“' + esc(A.reportsQ) + '”）' : '') + '</p>' +
      (list.length
        ? '<div class="a-table-wrap"><table class="a-table"><thead><tr><th>编号</th><th>举报人</th><th>被举报用户</th><th>举报对象</th><th>举报类型</th><th>举报时间</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : UI.empty('没有匹配的举报', '换个关键词，或清除状态筛选再试试。', '<button class="btn ghost" type="button" data-action="a-reports-clear">' + icon('refresh') + '清除筛选</button>', 'flag'));
  }

  /* ---------------- 视图：举报详情 ---------------- */
  function reportDetailView(id) {
    var r = S.reportOf(id);
    if (!r) return UI.empty('找不到该举报', '举报可能不存在。回到举报管理重新选择。', '<a class="btn primary" href="#/reports">回到举报管理</a>', 'flag');
    var reporter = S.user(r.reporterId), tu = r.targetUserId ? S.user(r.targetUserId) : null;

    var targetHtml;
    if (r.targetType === 'user') {
      targetHtml = tu ? '<div class="a-item"><div class="a-item-body"><div class="a-item-title">' + avatar(tu, 'sm') + esc(tu.nickname) + statusBadge(tu) + '</div>' +
        '<div class="a-item-meta"><span class="a-mono">' + esc(tu.id) + '</span><span>' + esc(tu.email || '') + '</span></div>' +
        '<p class="a-item-text">' + esc(tu.bio || '') + '</p></div>' +
        '<div class="a-item-side"><a class="btn sm ghost" href="#/users/' + tu.id + '">' + icon('right') + '用户详情</a></div></div>'
        : UI.empty('对象用户不存在', '', '', 'users');
    } else if (r.targetType === 'trip') {
      var t = S.trip(r.targetId);
      targetHtml = t ? tripItem(t) : UI.empty('行程不存在', '可能已被删除。', '', 'route');
    } else {
      var e = null;
      S.state.experiences.forEach(function (x) { if (x.id === r.targetId) e = x; });
      targetHtml = e ? expItem(e) : UI.empty('体验不存在', '可能已被删除。', '', 'spark');
    }

    var hist = r.history.map(function (h) {
      var m = S.REPORT_STATUS[h.status];
      return { at: h.at, tone: m.tone === 'muted' ? 'muted' : m.tone, head: '<span class="badge ' + m.tone + ' no-dot">' + m.label + '</span>' + esc(h.by), text: h.note };
    });

    var resolution = '';
    if (r.resolution) {
      var rej = r.status === 'REJECTED';
      resolution = '<div class="a-resolution' + (rej ? ' rejected' : '') + '" style="margin-top:14px">' +
        '<b>' + icon(rej ? 'x' : 'check') + (rej ? '举报不成立' : '处理完成 · ' + esc(S.penaltyLabel(r.resolution.penalty))) + '</b>' +
        '<p>' + esc(r.resolution.note) + '</p>' +
        (r.resolution.banReason ? '<p>封禁理由：' + esc(r.resolution.banReason) + (r.resolution.banUntil ? ' · 解封时间 ' + esc(fullTime(r.resolution.banUntil)) : '') + '</p>' : '') +
        (r.resolution.reason ? '<p>暂停原因：' + esc(r.resolution.reason) + '</p>' : '') +
        '<p class="hint" style="margin-top:6px">' + esc(r.resolution.by) + ' · ' + esc(fullTime(r.resolution.at)) + ' · 处理记录保留，不删除</p>' +
        '</div>';
    }

    var left = '<section class="panel">' +
      '<div class="a-report-head"><span class="a-report-no">' + esc(r.no) + '</span>' + repBadge(r) +
      '<span class="hint">提交于 ' + esc(fullTime(r.createdAt)) + '</span></div>' +
      '<dl class="a-kv">' +
      '<div><dt>举报人</dt><dd>' + userLink(reporter) + '</dd></div>' +
      '<div><dt>被举报用户</dt><dd>' + (tu ? userLink(tu) + ' ' + statusBadge(tu) : '<span class="hint">—</span>') + '</dd></div>' +
      '<div><dt>举报对象</dt><dd><span class="badge muted no-dot">' + esc(S.REPORT_TARGET[r.targetType]) + '</span> ' + esc(UI.reportTargetLabel(r)) + '</dd></div>' +
      '<div><dt>举报类型</dt><dd>' + esc(r.reason) + '</dd></div>' +
      (r.startedAt ? '<div><dt>受理时间</dt><dd>' + esc(fullTime(r.startedAt)) + '</dd></div>' : '') +
      '</dl>' +
      (r.note ? '<p class="a-item-text" style="margin-top:12px"><b>举报说明：</b>' + esc(r.note) + '</p>' : '') +
      '<div class="a-target-card">' + panelTitle('eye', '被举报内容') + targetHtml + '</div>' +
      resolution + '</section>' +
      '<section class="panel">' + panelTitle('clock', '处理时间线') + timeline(hist) + '</section>';

    var handle;
    if (r.status === 'PENDING') {
      handle = '<button class="btn primary" type="button" data-action="a-report-start" data-id="' + r.id + '">' + icon('play') + '开始处理</button>' +
        '<p class="a-handle-hint">受理后状态变为「处理中」，举报人可在用户端看到已受理。处理时可暂停 / 封禁账号或下架内容，也可标记不成立。</p>';
    } else if (r.status === 'PROCESSING') {
      handle = '<button class="btn primary" type="button" data-action="a-resolve" data-id="' + r.id + '">' + icon('check') + '举报成立 · 处理</button>' +
        '<button class="btn ghost" type="button" data-action="a-reject" data-id="' + r.id + '">' + icon('x') + '举报不成立</button>' +
        '<p class="a-handle-hint">两种结论都必须填写处理结果或备注；完成后状态变为「已处理」或「举报不成立」，记录保留，举报人可见最终结果。</p>';
    } else {
      handle = '<p class="a-handle-hint" style="margin-top:0">该举报已完成处理，记录与结论永久保留。如需进一步处罚，可前往被举报用户详情页操作。</p>' +
        (tu ? '<a class="btn ghost" href="#/users/' + tu.id + '" style="margin-top:10px">' + icon('users') + '查看被举报用户</a>' : '');
    }
    var right = '<section class="panel a-handle-panel">' + panelTitle('shield', '处理操作') + handle + '</section>';

    return '<a class="a-back" href="#/reports">' + icon('left') + '回到举报管理</a>' +
      '<div class="a-report-grid"><div>' + left + '</div>' + right + '</div>';
  }

  /* ---------------- 视图：客户服务工作台 ---------------- */
  function csMessagesAgent(c) {
    var u = S.user(c.userId);
    return c.messages.map(function (m) {
      if (m.from === 'system') return '<div class="cs-sys">' + esc(m.text) + ' · ' + esc(UI.fmtStamp(m.at)) + '</div>';
      var mine = m.from === 'agent';
      return '<div class="msg' + (mine ? ' me' : '') + '">' + (mine ? '' : avatar(u, 'sm')) +
        '<span class="msg-col"><span class="bubble">' + esc(m.text) + '</span>' +
        '<span class="msg-time">' + (mine ? esc(c.agentName || S.AGENT_NAME) : esc(u ? u.nickname : '用户')) + ' · ' + esc(UI.fmtStamp(m.at)) + '</span></span></div>';
    }).join('');
  }
  function supportView() {
    var all = S.state.supportSessions;
    function of(st) { return all.filter(function (c) { return c.status === st; }).sort(function (a, b) { return b.createdAt - a.createdAt; }); }
    var groups = { WAITING: of('WAITING'), HANDLING: of('HANDLING'), CLOSED: of('CLOSED') };
    var tabs = [['WAITING', '等待接入'], ['HANDLING', '处理中'], ['CLOSED', '已结束']].map(function (t) {
      return '<button class="a-cs-tab' + (A.supportTab === t[0] ? ' on' : '') + '" type="button" data-action="a-cs-tab" data-v="' + t[0] + '">' +
        t[1] + '<span class="n">' + groups[t[0]].length + '</span></button>';
    }).join('');
    var items = groups[A.supportTab];
    if (!A.supportId || !items.some(function (c) { return c.id === A.supportId; })) {
      A.supportId = items.length ? items[0].id : null;
    }
    var listHtml = items.length ? items.map(function (c) {
      var u = S.user(c.userId), last = null;
      for (var i = c.messages.length - 1; i >= 0; i--) { if (c.messages[i].from !== 'system') { last = c.messages[i]; break; } }
      return '<button class="a-cs-item' + (c.id === A.supportId ? ' on' : '') + '" type="button" data-action="a-cs-open" data-id="' + c.id + '">' +
        avatar(u) + '<span><b>' + esc(u ? u.nickname : c.userId) + sessBadge(c) + '</b>' +
        '<p>' + esc(last ? last.text : '暂无消息') + '</p>' +
        '<span class="a-cs-time">' + esc(UI.fmtStamp(c.createdAt)) + ' · ' + c.messages.length + ' 条消息</span></span></button>';
    }).join('') : UI.empty('暂无' + S.SESSION_STATUS[A.supportTab].label + '会话', A.supportTab === 'WAITING' ? '用户在「帮助与反馈」发起人工客服后会出现在这里。' : '切换上方页签查看其他会话。', '', 'chat');

    var c = A.supportId ? S.sessionOf(A.supportId) : null;
    var main, info = '';
    if (!c) {
      main = '<div class="chat-main a-cs-main"><div class="a-empty-mid">' +
        UI.empty('选择一个会话', '从左侧列表选择会话，或等待新的用户求助。', '', 'chat') + '</div></div>';
    } else {
      var u = S.user(c.userId);
      var head = '<div class="chat-head">' + avatar(u) +
        '<div class="grow"><b style="font-size:14.5px">' + esc(u ? u.nickname : c.userId) + '</b>' +
        '<p class="hint">' + esc(c.userId) + ' · 会话创建于 ' + esc(UI.fmtStamp(c.createdAt)) + '</p></div>' +
        sessBadge(c) +
        (c.status === 'HANDLING' ? '<button class="btn sm ghost" type="button" data-action="a-close-session" data-id="' + c.id + '">' + icon('finish') + '结束会话</button>' : '') +
        '</div>';
      var strip, foot;
      if (c.status === 'WAITING') {
        strip = '<div class="cs-status waiting"><span class="cs-pulse"></span>等待接入 · 用户已发送 ' +
          c.messages.filter(function (m) { return m.from === 'user'; }).length + ' 条消息，接入后即可回复</div>';
        foot = '<div class="cs-input-row"><button class="btn primary block" type="button" data-action="a-cs-accept" data-id="' + c.id + '">' +
          icon('chat') + '接入会话，开始对话</button></div>';
      } else if (c.status === 'HANDLING') {
        strip = '<div class="cs-status handling">' + icon('chat') + '客服处理中 · 双向文字消息实时同步到用户端</div>';
        foot = '<div class="cs-input-row">' +
          '<input class="input" data-acs placeholder="以路觅客服身份回复…" aria-label="客服回复输入框" maxlength="500">' +
          '<button class="btn primary" type="button" data-action="a-cs-send" data-id="' + c.id + '">' + icon('send') + '发送</button></div>';
      } else {
        strip = '<div class="cs-status a-cs-status-closed">' + icon('finish') + '会话已结束 · 历史消息保留，双方不能继续发送</div>';
        foot = '<div class="cs-input-row"><span class="hint" style="margin:auto">CLOSED 会话只读。用户可随时发起新的客服请求。</span></div>';
      }
      main = '<div class="chat-main a-cs-main">' + head + strip +
        '<div class="chat-body" id="acs-body">' + csMessagesAgent(c) + '</div>' + foot + '</div>';

      var reps = S.reportsRelated(c.userId);
      info = '<section class="panel"><div class="a-cs-user">' + avatar(u, 'lg') +
        '<div><b>' + esc(u ? u.nickname : c.userId) + '</b><i>' + esc(c.userId) + '</i><div style="margin-top:5px">' + (u ? statusBadge(u) : '') + '</div></div></div>' +
        '<dl class="a-kv" style="margin-top:12px">' +
        '<div><dt>邮箱</dt><dd>' + esc(u && u.email || '—') + '</dd></div>' +
        '<div><dt>注册时间</dt><dd>' + esc(u ? UI.fmtStamp(u.joinedAt) : '—') + '</dd></div>' +
        '<div><dt>城市</dt><dd>' + esc(u && u.city || '—') + '</dd></div>' +
        '</dl>' + (u ? '<a class="btn ghost block" style="margin-top:12px" href="#/users/' + u.id + '">' + icon('users') + '查看用户详情</a>' : '') + '</section>' +
        '<section class="panel">' + panelTitle('flag', '相关举报', '<span class="hint">' + reps.length + ' 条</span>') +
        (reps.length ? '<div class="a-mini-rep">' + reps.slice(0, 6).map(function (r) {
          return '<a href="#/reports/' + r.id + '"><span class="top"><span class="no">' + esc(r.no) + '</span>' + repBadge(r) +
            '<span class="badge muted no-dot">' + (r.targetUserId === c.userId ? '被举报' : '举报人') + '</span></span>' +
            '<span class="reason">' + esc(r.reason) + '</span></a>';
        }).join('') + '</div>' : '<p class="hint">该用户没有相关举报记录。</p>') + '</section>' +
        '<section class="panel">' + panelTitle('info', '会话信息') +
        '<dl class="a-kv">' +
        '<div><dt>创建</dt><dd>' + esc(fullTime(c.createdAt)) + '</dd></div>' +
        (c.acceptedAt ? '<div><dt>接入</dt><dd>' + esc(fullTime(c.acceptedAt)) + '</dd></div>' : '') +
        (c.closedAt ? '<div><dt>结束</dt><dd>' + esc(fullTime(c.closedAt)) + '</dd></div>' : '') +
        '<div><dt>消息数</dt><dd>' + c.messages.length + ' 条</dd></div>' +
        '</dl></section>';
    }
    return '<div class="a-page-head"><div><h2>客户服务</h2><p>接入等待中的会话，与用户双向对话；右侧展示用户账号信息与其相关举报。</p></div></div>' +
      '<div class="a-support">' +
      '<div class="a-cs-list"><div class="a-cs-tabs">' + tabs + '</div><div class="a-cs-items">' + listHtml + '</div></div>' +
      main +
      '<div class="a-cs-info">' + (info || '<section class="panel">' + UI.empty('未选择会话', '选择会话后展示用户信息。', '', 'users') + '</section>') + '</div>' +
      '</div>';
  }

  /* ---------------- 弹层 ---------------- */
  function confirmUserStrip(u) {
    return '<div class="a-confirm-user">' + avatar(u) +
      '<span><b>' + esc(u.nickname) + '</b> <span class="a-mono">' + esc(u.id) + '</span>' +
      '<span class="hint">' + esc(u.email || '') + ' · 当前状态：' + S.ACCOUNT_STATUS[u.status].label + '</span></span></div>';
  }
  function reasonSelect(attr, val, placeholder) {
    return '<select class="select" data-am="' + attr + '">' +
      '<option value="">' + esc(placeholder) + '</option>' +
      S.BAN_REASONS.map(function (b) { return '<option value="' + esc(b) + '"' + (val === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') +
      '</select>';
  }
  function daysChips() {
    return '<div class="a-days">' + [1, 3, 7, 30].map(function (d) {
      return '<button class="a-day' + (A.m.days === d ? ' on' : '') + '" type="button" data-action="a-ban-days" data-days="' + d + '" data-apen="day-' + d + '">' + d + ' 天</button>';
    }).join('') + '</div>';
  }
  function untilField() {
    return '<label class="field"><span class="label">解封时间</span>' +
      '<input class="input" type="datetime-local" data-am="until" value="' + esc(A.m.until) + '" min="' + dtLocal(Date.now()) + '">' +
      '<span class="hint">到期后系统自动解封；也可随时在用户详情提前解封。</span>' + daysChips() + '</label>';
  }
  function errHtml() { return A.m.err ? '<div class="a-login-err" role="alert">' + icon('alert') + '<span>' + esc(A.m.err) + '</span></div>' : ''; }
  function modalShell(title, body, foot, wide) {
    return '<div class="modal' + (wide ? ' a-modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<div class="modal-head"><h2 class="modal-title">' + esc(title) + '</h2>' +
      '<button class="icon-btn" type="button" data-action="close-overlay" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + body + '</div>' +
      '<div class="modal-foot">' + foot + '</div></div>';
  }
  function overlayHtml() {
    var o = A.overlay, u, r, c;
    if (o.kind === 'suspend') {
      u = S.user(o.id);
      return modalShell('暂停账号 · 二次确认',
        confirmUserStrip(u) +
        '<p class="hint" style="margin-bottom:12px">暂停后该用户不能发布行程、申请同行、发送聊天消息或分享旅行体验；已有内容全部保留。</p>' +
        '<div class="stack">' +
        '<label class="field"><span class="label">暂停原因（必填）</span>' + reasonSelect('reason', A.m.reason, '请选择暂停原因') + '</label>' +
        '<label class="field"><span class="label">处理备注（可选）</span><textarea class="textarea" data-am="note" placeholder="补充说明，将展示在用户资料页…">' + esc(A.m.note) + '</textarea></label>' +
        errHtml() + '</div>',
        '<button class="btn ghost" type="button" data-action="close-overlay">再想想</button>' +
        '<button class="btn danger" type="button" data-action="a-do-suspend" data-id="' + o.id + '">' + icon('clock') + '确认暂停</button>');
    }
    if (o.kind === 'ban') {
      u = S.user(o.id);
      return modalShell('封禁账号 · 二次确认',
        confirmUserStrip(u) +
        '<p class="hint" style="margin-bottom:12px">封禁后用户端展示封禁门，无法继续使用平台；解封时间到期自动解封。行程、体验、聊天与举报记录全部保留。</p>' +
        '<div class="stack">' +
        '<label class="field"><span class="label">封禁理由（必选）</span>' + reasonSelect('banReason', A.m.banReason, '请选择封禁理由') + '</label>' +
        untilField() +
        '<label class="field"><span class="label">处理说明（可选）</span><textarea class="textarea" data-am="note" placeholder="将同步展示在用户个人信息页…">' + esc(A.m.note) + '</textarea></label>' +
        errHtml() + '</div>',
        '<button class="btn ghost" type="button" data-action="close-overlay">再想想</button>' +
        '<button class="btn danger" type="button" data-action="a-do-ban" data-id="' + o.id + '">' + icon('shield') + '确认封禁</button>');
    }
    if (o.kind === 'restore' || o.kind === 'unban') {
      u = S.user(o.id);
      var isUnban = o.kind === 'unban';
      return modalShell(isUnban ? '提前解封 · 二次确认' : '恢复账号 · 二次确认',
        confirmUserStrip(u) +
        '<p class="hint" style="margin-bottom:12px">' + (isUnban ? '解封后账号立即恢复正常，封禁记录保留在处罚记录中。' : '恢复后账号立即解除全部限制，暂停记录保留在处罚记录中。') + '</p>' +
        '<label class="field"><span class="label">备注（可选）</span><textarea class="textarea" data-am="note" placeholder="例如：申诉核实通过…">' + esc(A.m.note) + '</textarea></label>' + errHtml(),
        '<button class="btn ghost" type="button" data-action="close-overlay">再想想</button>' +
        '<button class="btn sea" type="button" data-action="' + (isUnban ? 'a-do-unban' : 'a-do-restore') + '" data-id="' + o.id + '">' + icon('check') + (isUnban ? '确认解封' : '确认恢复') + '</button>');
    }
    if (o.kind === 'resolve') {
      r = S.reportOf(o.id);
      var tu = r.targetUserId ? S.user(r.targetUserId) : null;
      var opts = [];
      if (tu && tu.status === 'ACTIVE') opts.push(['suspend', '暂停账号', '限制发布行程、申请同行、发消息与分享体验，可随时恢复。']);
      if (tu && tu.status !== 'BANNED') opts.push(['ban', '封禁账号', '需选择封禁理由与解封时间，用户端同步展示封禁门。']);
      if (r.targetType === 'trip' || r.targetType === 'exp') opts.push(['takedown', '下架内容', r.targetType === 'trip' ? '行程标记为已取消并保留记录，待处理申请一并取消。' : '体验从用户端列表隐藏，记录保留。']);
      opts.push(['none', '不处罚', '仅记录处理结论，例如警告或已线下沟通。']);
      if (!opts.some(function (x) { return x[0] === A.m.penalty; })) A.m.penalty = opts[0][0];
      var cond = '';
      if (A.m.penalty === 'suspend') cond = '<label class="field"><span class="label">暂停原因（必填）</span>' + reasonSelect('reason', A.m.reason, '请选择暂停原因') + '</label>';
      if (A.m.penalty === 'ban') cond = '<label class="field"><span class="label">封禁理由（必选）</span>' + reasonSelect('banReason', A.m.banReason, '请选择封禁理由') + '</label>' + untilField();
      return modalShell('举报成立 · 处理 ' + r.no,
        '<p class="hint" style="margin-bottom:12px">被举报用户：' + (tu ? esc(tu.nickname) + '（' + S.ACCOUNT_STATUS[tu.status].label + '）' : '—') + ' · 对象：' + esc(S.REPORT_TARGET[r.targetType]) + '。处理完成后状态变为「已处理」，举报人可见结论。</p>' +
        '<div class="stack">' +
        '<div class="a-penalty-opts">' + opts.map(function (p) {
          return '<button class="a-penalty-opt' + (A.m.penalty === p[0] ? ' on' : '') + '" type="button" data-action="a-penalty" data-v="' + p[0] + '" data-apen="pen-' + p[0] + '">' +
            '<span class="radio"></span><span><b>' + p[1] + '</b><span>' + p[2] + '</span></span></button>';
        }).join('') + '</div>' + cond +
        '<label class="field"><span class="label">处理结果 / 备注（必填）</span><textarea class="textarea" data-am="note" placeholder="写明核实结论与采取的措施，将展示给举报人…">' + esc(A.m.note) + '</textarea></label>' +
        errHtml() + '</div>',
        '<button class="btn ghost" type="button" data-action="close-overlay">取消</button>' +
        '<button class="btn primary" type="button" data-action="a-do-resolve" data-id="' + o.id + '">' + icon('check') + '确认处理</button>', true);
    }
    if (o.kind === 'reject') {
      r = S.reportOf(o.id);
      return modalShell('举报不成立 · ' + r.no,
        '<p class="hint" style="margin-bottom:12px">标记后状态变为「举报不成立」，记录保留，举报人可在用户端看到结论与理由。</p>' +
        '<label class="field"><span class="label">不成立理由 / 备注（必填）</span><textarea class="textarea" data-am="note" placeholder="例如：核阅内容未发现违规…">' + esc(A.m.note) + '</textarea></label>' + errHtml(),
        '<button class="btn ghost" type="button" data-action="close-overlay">取消</button>' +
        '<button class="btn primary" type="button" data-action="a-do-reject" data-id="' + o.id + '">' + icon('x') + '标记不成立</button>');
    }
    if (o.kind === 'closeSession') {
      c = S.sessionOf(o.id);
      var cu = S.user(c.userId);
      return modalShell('结束客服会话 · 二次确认',
        confirmUserStrip(cu) +
        '<p class="hint">结束后会话变为 CLOSED，历史消息保留，双方不能继续发送；用户可再次发起新的客服请求。</p>',
        '<button class="btn ghost" type="button" data-action="close-overlay">再想想</button>' +
        '<button class="btn primary" type="button" data-action="a-do-close-session" data-id="' + o.id + '">' + icon('finish') + '确认结束</button>');
    }
    if (o.kind === 'trip') {
      var t = S.trip(o.id);
      if (!t) return modalShell('行程预览', UI.empty('行程不存在', '', '', 'route'), '<button class="btn ghost" type="button" data-action="close-overlay">关闭</button>');
      var creator = S.user(t.creatorId);
      return modalShell('旅行计划预览',
        '<div class="a-item-title" style="font-size:16px">' + esc(t.title) + UI.tripBadge(t) + '</div>' +
        '<dl class="a-preview-meta">' +
        '<div><dt>日期</dt><dd>' + esc(UI.fmtRange(t.startDate, t.endDate)) + '</dd></div>' +
        '<div><dt>目的地</dt><dd>' + esc(t.destination) + '</dd></div>' +
        '<div><dt>预算</dt><dd>' + esc(UI.budgetText(t)) + '</dd></div>' +
        '<div><dt>人数上限</dt><dd>' + esc(t.capacity) + ' 人</dd></div>' +
        '<div><dt>发起人</dt><dd>' + esc(creator ? creator.nickname : t.creatorId) + '</dd></div>' +
        '<div><dt>集合区域</dt><dd>' + esc(t.meetingArea || '—') + '</dd></div>' +
        '</dl>' +
        '<div class="row">' + UI.tags(t.tags) + '</div>' +
        '<div class="a-stops">' + t.stops.map(function (s, i) { return '<div class="a-stop"><span class="a-stop-n">' + (i + 1) + '</span><span>' + esc(s) + '</span></div>'; }).join('') + '</div>' +
        (t.note ? '<p class="a-item-text" style="margin-top:10px">' + esc(t.note) + '</p>' : '') +
        (t.adminNote ? '<p class="a-item-text" style="color:var(--t-danger)">下架说明：' + esc(t.adminNote) + '</p>' : ''),
        '<a class="btn ghost" href="prototype.html#/trip/' + t.id + '" target="_blank" rel="noopener">' + icon('exit') + '用户端打开</a>' +
        '<button class="btn primary" type="button" data-action="close-overlay">关闭</button>', true);
    }
    if (o.kind === 'exp') {
      var e = null;
      S.state.experiences.forEach(function (x) { if (x.id === o.id) e = x; });
      if (!e) return modalShell('体验预览', UI.empty('体验不存在', '', '', 'spark'), '<button class="btn ghost" type="button" data-action="close-overlay">关闭</button>');
      var et = S.trip(e.tripId), au = S.user(e.authorId), it = D.INTENSITY[e.intensity] || { label: e.intensity };
      return modalShell('旅行体验预览',
        '<div class="a-item-title" style="font-size:16px">' + esc(et ? et.title : '行程') + ' 的旅行体验' +
        (e.hidden ? '<span class="badge danger no-dot">已下架</span>' : '') + '</div>' +
        '<dl class="a-preview-meta">' +
        '<div><dt>作者</dt><dd>' + esc(au ? au.nickname : e.authorId) + '</dd></div>' +
        '<div><dt>路线强度</dt><dd>' + esc(it.label) + '</dd></div>' +
        '<div><dt>发布时间</dt><dd>' + esc(fullTime(e.createdAt)) + '</dd></div>' +
        '<div><dt>所属行程</dt><dd>' + esc(et ? et.destination : '—') + '</dd></div>' +
        '</dl>' +
        '<p class="a-item-text" style="font-size:13.5px">' + esc(e.content) + '</p>' +
        (e.advice ? '<p class="a-item-text"><b>给后来者：</b>' + esc(e.advice) + '</p>' : '') +
        (e.adminNote ? '<p class="a-item-text" style="color:var(--t-danger)">下架说明：' + esc(e.adminNote) + '</p>' : ''),
        '<button class="btn primary" type="button" data-action="close-overlay">关闭</button>', true);
    }
    return '';
  }

  var ovKey = '';
  function renderOverlay() {
    var o = A.overlay;
    var key = o ? o.kind + '|' + (o.id || '') : '';
    var changed = key !== ovKey;
    ovKey = key;
    if (!o) { modalRoot.innerHTML = ''; document.body.style.overflow = ''; return; }
    document.body.style.overflow = 'hidden';
    modalRoot.innerHTML = '<div class="scrim" data-action="close-overlay"></div><div class="modal-wrap">' + overlayHtml() + '</div>';
    if (changed) {
      var panel = modalRoot.querySelector('.modal');
      var target = panel && (panel.querySelector('select, textarea, input') || panel.querySelector('.modal-foot .btn'));
      if (target) { try { target.focus(); } catch (e) { } }
    }
  }
  function openOverlay(kind, id) {
    A.overlay = { kind: kind, id: id };
    A.m = blankM();
    if (kind === 'ban' || kind === 'resolve') { A.m.until = dtLocal(Date.now() + 7 * DAY); A.m.days = 7; }
    render();
  }
  function finishOverlay(msg, kind) {
    A.overlay = null; A.m = blankM();
    render();
    if (msg) toast(msg, kind || 'ok');
  }

  /* ---------------- 焦点保持 ---------------- */
  var FOCUS_ATTRS = ['data-aq', 'data-am', 'data-acs', 'data-apen'];
  function snapshotFocus() {
    var el = document.activeElement;
    if (!el || el === document.body) return null;
    for (var i = 0; i < FOCUS_ATTRS.length; i++) {
      var a = FOCUS_ATTRS[i];
      if (el.hasAttribute && el.hasAttribute(a)) {
        return { sel: '[' + a + '="' + el.getAttribute(a) + '"]', start: el.selectionStart, end: el.selectionEnd };
      }
    }
    return null;
  }
  function restoreFocus(s) {
    if (!s) return;
    var el = document.querySelector(s.sel);
    if (!el) return;
    try { el.focus(); if (s.start != null && el.setSelectionRange) el.setSelectionRange(s.start, s.end); } catch (e) { }
  }

  /* ---------------- 渲染 ---------------- */
  function viewHtml() {
    var r = A.route;
    if (r.name === 'users') return r.id ? userDetailView(r.id) : usersView();
    if (r.name === 'reports') return r.id ? reportDetailView(r.id) : reportsView();
    if (r.name === 'support') return supportView();
    return overviewView();
  }
  function render() {
    var f = snapshotFocus();
    if (!A.session) {
      gateEl.hidden = false; consoleEl.hidden = true;
      gateEl.innerHTML = loginView();
      modalRoot.innerHTML = ''; document.body.style.overflow = '';
      return;
    }
    gateEl.hidden = true; consoleEl.hidden = false;
    renderNav(); renderTopbar();
    viewEl.innerHTML = viewHtml();
    renderOverlay();
    restoreFocus(f);
    var body = $('#acs-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  /* ---------------- 动作分发 ---------------- */
  function csSend(id) {
    var input = $('[data-acs]');
    var text = input ? input.value : '';
    var res = S.supportSend(id, 'agent', text);
    if (!res.ok) { toast(res.reason, 'bad'); return; }
    render();
    var again = $('[data-acs]'); if (again) again.focus();
  }
  function acceptSession(id) {
    var res = S.supportAccept(id, S.AGENT_NAME);
    if (!res.ok) { toast(res.reason, 'bad'); return; }
    A.supportTab = 'HANDLING'; A.supportId = id;
    if (A.route.name !== 'support') go('#/support'); else render();
    toast('已接入会话，可以开始回复');
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-action]') : null;
    if (!el) return;
    var act = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');
    var v = el.getAttribute('data-v');
    switch (act) {
      case 'toggle-theme':
        theme = theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { }
        applyTheme(theme);
        break;
      case 'a-logout':
        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { }
        A.session = false; A.overlay = null; A.loginPass = ''; A.loginErr = '';
        render();
        break;
      case 'a-nav':
        ev.preventDefault();
        go(el.getAttribute('data-href'));
        break;
      case 'a-go-users': A.usersStatus = v || 'ALL'; go('#/users'); break;
      case 'a-go-reports': A.reportsStatus = v || 'ALL'; go('#/reports'); break;
      case 'a-go-support': A.supportTab = v || 'WAITING'; A.supportId = null; go('#/support'); break;
      case 'a-users-status': A.usersStatus = v; render(); break;
      case 'a-users-clear': A.usersQ = ''; A.usersStatus = 'ALL'; render(); break;
      case 'a-reports-status': A.reportsStatus = v; render(); break;
      case 'a-reports-clear': A.reportsQ = ''; A.reportsStatus = 'ALL'; render(); break;
      case 'a-user-tab': A.userTab = v; render(); break;
      case 'a-user-support': {
        var sess = S.sessionsOf(id)[0];
        if (!sess) { toast('该用户暂无客服会话', 'warn'); break; }
        A.supportTab = sess.status; A.supportId = sess.id;
        go('#/support');
        break;
      }
      case 'a-suspend': case 'a-ban': case 'a-restore': case 'a-unban':
      case 'a-resolve': case 'a-reject':
        openOverlay(act.slice(2), id);
        break;
      case 'a-close-session': openOverlay('closeSession', id); break;
      case 'a-preview-trip': openOverlay('trip', id); break;
      case 'a-preview-exp': openOverlay('exp', id); break;
      case 'close-overlay': A.overlay = null; A.m = blankM(); render(); break;
      case 'a-penalty': A.m.penalty = v; A.m.err = ''; render(); break;
      case 'a-ban-days': {
        var d = parseInt(el.getAttribute('data-days'), 10);
        A.m.days = d; A.m.until = dtLocal(Date.now() + d * DAY); A.m.err = '';
        render();
        break;
      }
      case 'a-report-start': {
        var rs = S.reportStart(id, S.ADMIN_DEMO.name);
        if (!rs.ok) { toast(rs.reason, 'bad'); break; }
        toast('已受理 ' + rs.report.no + '，状态变为处理中');
        break;
      }
      case 'a-do-suspend': {
        var sr = S.adminSetStatus(id, 'SUSPENDED', { reason: A.m.reason, note: A.m.note });
        if (!sr.ok) { A.m.err = sr.reason; render(); break; }
        finishOverlay('已暂停 ' + sr.user.nickname + ' 的账号，相关功能立即受限');
        break;
      }
      case 'a-do-ban': {
        var until = parseDt(A.m.until);
        if (!until) { A.m.err = '请选择有效的解封时间'; render(); break; }
        var br = S.adminSetStatus(id, 'BANNED', { reason: A.m.banReason, until: until, note: A.m.note });
        if (!br.ok) { A.m.err = br.reason; render(); break; }
        finishOverlay('已封禁 ' + br.user.nickname + '，用户端个人信息页同步展示封禁内容');
        break;
      }
      case 'a-do-restore': {
        var rr = S.adminSetStatus(id, 'ACTIVE', { note: A.m.note });
        if (!rr.ok) { A.m.err = rr.reason; render(); break; }
        finishOverlay('已恢复 ' + rr.user.nickname + ' 为正常账号');
        break;
      }
      case 'a-do-unban': {
        var ur = S.adminSetStatus(id, 'ACTIVE', { note: A.m.note });
        if (!ur.ok) { A.m.err = ur.reason; render(); break; }
        finishOverlay('已提前解封 ' + ur.user.nickname);
        break;
      }
      case 'a-do-resolve': {
        var p = { penalty: A.m.penalty, note: A.m.note, reason: A.m.reason, banReason: A.m.banReason, banUntil: parseDt(A.m.until) };
        var rv = S.reportResolve(id, p);
        if (!rv.ok) { A.m.err = rv.reason; render(); break; }
        finishOverlay('举报 ' + rv.report.no + ' 处理完成（' + S.penaltyLabel(A.m.penalty) + '），举报人可见结论');
        break;
      }
      case 'a-do-reject': {
        var rj = S.reportReject(id, A.m.note, S.ADMIN_DEMO.name);
        if (!rj.ok) { A.m.err = rj.reason; render(); break; }
        finishOverlay('举报 ' + rj.report.no + ' 已标记为不成立，记录保留');
        break;
      }
      case 'a-do-close-session': {
        var cr = S.supportClose(id, S.AGENT_NAME);
        if (!cr.ok) { toast(cr.reason, 'bad'); break; }
        A.supportTab = 'CLOSED'; A.supportId = id;
        finishOverlay('会话已结束，历史消息保留');
        break;
      }
      case 'a-cs-tab': A.supportTab = v; A.supportId = null; render(); break;
      case 'a-cs-open':
        ev.preventDefault();
        A.supportId = id;
        if (A.route.name !== 'support') go('#/support'); else render();
        break;
      case 'a-cs-accept': acceptSession(id); break;
      case 'a-cs-send': csSend(id); break;
    }
  });

  /* ---------------- 表单输入 ---------------- */
  var searchTimer = null;
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'a-user') { A.loginUser = t.value; return; }
    if (t.id === 'a-pass') { A.loginPass = t.value; return; }
    var aq = t.getAttribute && t.getAttribute('data-aq');
    if (aq) {
      A[aq] = t.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 220);
      return;
    }
    var am = t.getAttribute && t.getAttribute('data-am');
    if (am) { A.m[am] = t.value; if (am === 'until') A.m.days = 0; }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.hasAttribute && t.hasAttribute('data-asort')) { A.usersSort = t.value; render(); return; }
    var am = t.getAttribute && t.getAttribute('data-am');
    if (am) { A.m[am] = t.value; if (am === 'until') A.m.days = 0; }
  });
  document.addEventListener('submit', function (ev) {
    if (ev.target.id === 'a-login-form') { ev.preventDefault(); doLogin(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && A.overlay) { A.overlay = null; A.m = blankM(); render(); return; }
    if (ev.key !== 'Enter') return;
    var t = ev.target;
    if (t.hasAttribute && t.hasAttribute('data-acs')) {
      ev.preventDefault();
      var c = A.supportId ? S.sessionOf(A.supportId) : null;
      if (c && c.status === 'HANDLING') csSend(c.id);
      return;
    }
    if (t.tagName === 'TR' && t.hasAttribute('data-href')) { ev.preventDefault(); go(t.getAttribute('data-href')); }
  });

  /* ---------------- 跨标签同步 ---------------- */
  var lastRaw = null;
  try { lastRaw = localStorage.getItem(KEY); } catch (e) { }
  S.subscribe(function () {
    try { lastRaw = localStorage.getItem(KEY); } catch (e) { }
    render();
  });
  global.addEventListener('storage', function (ev) {
    if (ev.key === KEY) S.reload();
    if (ev.key === THEME_KEY) { theme = ev.newValue || 'light'; applyTheme(theme); }
  });
  setInterval(function () {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { }
    if (raw !== lastRaw) S.reload();
  }, 2000);

  global.addEventListener('hashchange', function () {
    A.route = parseHash();
    A.overlay = null; A.m = blankM();
    render();
    global.scrollTo(0, 0);
  });

  /* ---------------- 启动 ---------------- */
  try { A.session = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { }
  A.route = parseHash();
  render();
})(window);