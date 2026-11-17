/* RouteMe 路觅 · 视图层：全部为真实数据驱动的渲染，无占位内容 */
(function (global) {
  'use strict';

  var D = global.RMData;
  var S = global.Store;
  var uid = 0;

  /* ---------------- 基础工具 ---------------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  var WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  function dObj(iso) { return new Date(iso + 'T00:00:00'); }
  function fmtDate(iso) { var d = dObj(iso); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function fmtWeek(iso) { return WD[dObj(iso).getDay()]; }
  function fmtRange(a, b) {
    if (a === b) return fmtDate(a) + ' · ' + fmtWeek(a);
    return fmtDate(a) + ' – ' + fmtDate(b);
  }
  function dayLabel(iso) {
    var n = S.dayDiff(iso, D.iso(new Date()));
    if (n === 0) return '今天出发';
    if (n === 1) return '明天出发';
    if (n === 2) return '后天出发';
    if (n === -1) return '昨天';
    if (n > 0) return n + ' 天后出发';
    return (-n) + ' 天前';
  }
  function fmtClock(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtStamp(ts) {
    var d = new Date(ts), now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return '今天 ' + fmtClock(ts);
    var diff = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
    if (diff === 1) return '昨天 ' + fmtClock(ts);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + fmtClock(ts);
  }
  /* 集合时间是本地日期时间（yyyy-MM-ddTHH:mm），展示沿用消息时间口径。 */
  function fmtMeeting(value) {
    if (!value) return '待确认';
    var d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return fmtStamp(d.getTime());
  }
  function relTime(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return '刚刚';
    if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
    if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
    var d = Math.floor(s / 86400);
    return d < 30 ? d + ' 天前' : Math.floor(d / 30) + ' 个月前';
  }
  function budgetText(t) {
    if (!t.budgetMin && !t.budgetMax) return '未填写';
    if (t.budgetMin && t.budgetMax) return '¥' + t.budgetMin + '–' + t.budgetMax;
    return '¥' + (t.budgetMin || t.budgetMax) + ' 起';
  }

  /* ---------------- 图标 ---------------- */
  var P = {
    compass: '<circle cx="10" cy="10" r="8"/><path d="m13.2 6.8-2 4.4-4.4 2 2-4.4z"/>',
    plus: '<path d="M10 4v12M4 10h12"/>',
    route: '<circle cx="5" cy="5" r="2.4"/><circle cx="15" cy="15" r="2.4"/><path d="M5 7.4v3.2a3 3 0 0 0 3 3h4.6"/>',
    chat: '<path d="M17 11.4a2 2 0 0 1-2 2H7l-3.4 2.6V5a2 2 0 0 1 2-2h9.4a2 2 0 0 1 2 2z"/>',
    search: '<circle cx="9" cy="9" r="5.4"/><path d="m13 13 4 4"/>',
    calendar: '<rect x="3" y="4.6" width="14" height="12.4" rx="2.2"/><path d="M3 8.4h14M7 2.8v3.2M13 2.8v3.2"/>',
    pin: '<path d="M10 17.6s5.4-4.9 5.4-8.8a5.4 5.4 0 1 0-10.8 0c0 3.9 5.4 8.8 5.4 8.8Z"/><circle cx="10" cy="8.6" r="2"/>',
    users: '<circle cx="7.4" cy="7" r="2.8"/><path d="M2.4 16.4a5 5 0 0 1 10 0"/><path d="M13.4 4.6a2.8 2.8 0 0 1 0 5.4M14.6 12.2a5 5 0 0 1 3 4.2"/>',
    left: '<path d="M12.4 4.6 7 10l5.4 5.4"/>',
    right: '<path d="M7.6 4.6 13 10l-5.4 5.4"/>',
    down: '<path d="M4.6 7.6 10 13l5.4-5.4"/>',
    check: '<path d="m4.4 10.4 3.6 3.6 7.6-8"/>',
    x: '<path d="M5 5l10 10M15 5 5 15"/>',
    shield: '<path d="M10 2.6 3.8 5.2v4.4c0 3.6 2.6 6.6 6.2 7.8 3.6-1.2 6.2-4.2 6.2-7.8V5.2z"/><path d="m7.4 9.8 1.9 1.9 3.5-3.6"/>',
    flag: '<path d="M4.6 17.4V3.2M4.6 4.2h9.6l-1.6 3.2 1.6 3.2H4.6"/>',
    edit: '<path d="M13.4 3.6a2 2 0 0 1 2.8 2.8L7.4 15.2l-3.8 1 1-3.8z"/>',
    trash: '<path d="M3.8 5.6h12.4M8 5.6V3.8h4v1.8M5.6 5.6l.8 10.2h7.2l.8-10.2"/>',
    play: '<path d="M6.4 4.2 15 10l-8.6 5.8z"/>',
    refresh: '<path d="M16.4 10a6.4 6.4 0 1 1-2-4.6"/><path d="M16.6 3.4v3.8h-3.8"/>',
    send: '<path d="M17.2 2.8 8.4 11.6M17.2 2.8l-5.6 14.4-3.2-5.6-5.6-3.2z"/>',
    spark: '<path d="M10 2.4 11.7 7l4.6 1.7-4.6 1.7L10 15l-1.7-4.6L3.7 8.7 8.3 7z"/><path d="M15.6 13.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>',
    wave: '<path d="M2 12.4c2-2 3.4-2 5.4 0s3.4 2 5.4 0 3.4-2 5.2 0"/><path d="M2 16c2-2 3.4-2 5.4 0s3.4 2 5.4 0 3.4-2 5.2 0"/><circle cx="14.4" cy="5.4" r="2.4"/>',
    mountain: '<path d="M2 16.4 7.4 6l3.4 6 2-3.2 5.2 7.6z"/><circle cx="14.6" cy="4.8" r="1.8"/>',
    city: '<path d="M2.6 17V8.4l4.4-2.6v3l4.6-3v4.2l5.8-2.4V17z"/><path d="M5.4 11.6v1.6M9 12v1.6M13.6 12.4V14"/>',
    grip: '<circle cx="7.4" cy="5" r="1.1"/><circle cx="12.6" cy="5" r="1.1"/><circle cx="7.4" cy="10" r="1.1"/><circle cx="12.6" cy="10" r="1.1"/><circle cx="7.4" cy="15" r="1.1"/><circle cx="12.6" cy="15" r="1.1"/>',
    clock: '<circle cx="10" cy="10" r="7.4"/><path d="M10 5.6V10l3 1.8"/>',
    info: '<circle cx="10" cy="10" r="7.4"/><path d="M10 9.2v4.4M10 6.6v.1"/>',
    alert: '<path d="M10 3 2.6 16.4h14.8z"/><path d="M10 8v3.4M10 13.8v.1"/>',
    copy: '<rect x="6.6" y="6.6" width="10" height="10" rx="2"/><path d="M13.4 6.6v-1a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"/>',
    swap: '<path d="M3.6 6.6h11l-2.6-2.8M16.4 13.4h-11l2.6 2.8"/>',
    exit: '<path d="M12.4 3.6h3a1.6 1.6 0 0 1 1.6 1.6v9.6a1.6 1.6 0 0 1-1.6 1.6h-3"/><path d="M8 13.4 4.6 10 8 6.6M4.6 10h8"/>',
    bookmark: '<path d="M5 3.6h10v13.2l-5-3.4-5 3.4z"/>',
    star: '<path d="m10 2.8 2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1L2.5 8.3l5.2-.8z"/>',
    eye: '<path d="M1.8 10S4.8 4.6 10 4.6 18.2 10 18.2 10 15.2 15.4 10 15.4 1.8 10 1.8 10Z"/><circle cx="10" cy="10" r="2.4"/>',
    inbox: '<path d="M2.8 11.4 5 4.2h10l2.2 7.2v3.2a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M2.8 11.4h4l.8 1.8h4.8l.8-1.8h4"/>',
    finish: '<circle cx="10" cy="10" r="7.4"/><path d="m6.6 10.2 2.4 2.4 4.4-4.8"/>',
    camera: '<rect x="2.6" y="6" width="14.8" height="10.4" rx="2"/><path d="M7 6l1.4-2.4h3.2L13 6"/><circle cx="10" cy="11.2" r="3.2"/>'
  };
  function icon(name, cls) {
    var body = P[name] || P.info;
    var filled = name === 'play' || name === 'bookmark' || name === 'star' || name === 'spark';
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 20 20" aria-hidden="true" fill="' + (filled ? 'currentColor' : 'none') +
      '" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  /* ---------------- 头像 / 徽标 ---------------- */
  /* 头像底色按相对亮度归一，而不是固定 HSL 明度：同一明度下黄绿比蓝紫亮得多，
     固定明度会让白色首字母在暖色头像上读不清。锁住亮度后，每个色相仍保留
     自己的高饱和识别度，而白字在任意用户头像上都稳定 ≥4.9:1。 */
  function hslInk(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    var v = [r, g, b].map(function (n) { return Math.round((n + m) * 255); });
    var lin = v.map(function (n) { var t = n / 255; return t <= 0.03928 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4); });
    return [0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2],
      '#' + v.map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('')];
  }
  var inkCache = {};
  function hueInk(hue, sat, lum) {
    var key = hue + '|' + sat + '|' + lum;
    if (inkCache[key]) return inkCache[key];
    var lo = 0, hi = 1;
    for (var i = 0; i < 20; i++) {
      var mid = (lo + hi) / 2;
      if (hslInk(hue, sat, mid)[0] < lum) lo = mid; else hi = mid;
    }
    inkCache[key] = hslInk(hue, sat, lo)[1];
    return inkCache[key];
  }
  function avatar(u, size) {
    if (!u) return '';
    var a1 = hueInk(u.hue, 0.7, 0.163), a2 = hueInk(u.hue + 42, 0.66, 0.092);
    return '<span class="avatar ' + (size || '') + '" style="--hue:' + u.hue +
      ';--a1:' + a1 + ';--a2:' + a2 + '" aria-hidden="true">' + esc(u.initial) + '</span>';
  }
  function tripBadge(t) {
    var m = D.TRIP_STATUS[t.status];
    return '<span class="badge ' + m.tone + '">' + m.label + '</span>';
  }
  function appBadge(a) {
    var m = D.APP_STATUS[a.status];
    return '<span class="badge ' + m.tone + '">' + m.label + '</span>';
  }
  function tags(list, hits) {
    return (list || []).map(function (t) {
      var hit = hits && hits.indexOf(t) > -1;
      return '<span class="tag' + (hit ? ' hit' : '') + '">' + esc(t) + '</span>';
    }).join('');
  }

  /* ---------------- 图片占位（边框 + 图标，无外部资源 / 无插画） ---------------- */
  function cover(terrain, key) {
    var t = D.TERRAIN[terrain] || D.TERRAIN.city;
    var ic = terrain === 'mountain' ? 'mountain' : terrain === 'city' ? 'city' : 'wave';
    return '<span class="ph-img" role="img" aria-label="' + esc(t.label) + '图片占位">' +
      icon(ic) + '<span class="ph-tag">' + esc(t.label) + '</span></span>';
  }

  /* ---------------- 匹配块 ---------------- */
  function matchBlock(m) {
    var C = 94.25;
    var off = C * (1 - m.score / 100);
    return '<div class="tc-match">' +
      '<span class="match-ring"><svg viewBox="0 0 34 34">' +
      '<circle class="ring-bg" cx="17" cy="17" r="15" fill="none" stroke-width="3"/>' +
      '<circle class="ring-fg" cx="17" cy="17" r="15" fill="none" stroke-width="3" stroke-dasharray="' + C + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><b>' + m.score + '</b></span>' +
      '<span class="match-reason">' + esc(m.reasons.join('，')) + '</span></div>';
  }

  /* ---------------- 行程卡片 ---------------- */
  function tripCard(t, f, i) {
    var host = S.user(t.creatorId);
    var n = S.count(t.id);
    var m = S.matchOf(t, f);
    var pct = Math.min(100, Math.round(n / t.capacity * 100));
    var mine = t.creatorId === S.state.currentUserId;
    return '<article class="trip-card" data-action="open-trip" data-id="' + t.id + '" role="link" tabindex="0" ' +
      'aria-label="' + esc(t.title) + '" style="animation-delay:' + Math.min(i * 45, 360) + 'ms">' +
      '<div class="tc-cover">' + cover(t.terrain, t.id) +
      '<div class="tc-cover-top"><span class="tc-dest">' + icon('pin') + esc(t.destination) + '</span>' + tripBadge(t) + '</div></div>' +
      '<div class="tc-body">' +
      '<h3 class="tc-title">' + esc(t.title) + (mine ? ' <span class="badge dusk no-dot">我发布</span>' : '') + '</h3>' +
      '<div class="tc-meta"><span>' + icon('calendar') + esc(fmtRange(t.startDate, t.endDate)) + '</span>' +
      '<span>' + icon('clock') + esc(dayLabel(t.startDate)) + '</span></div>' +
      '<p class="tc-route"><b>路线</b> ' + esc(t.stops.join(' → ')) + '</p>' +
      '<div class="tc-tags">' + tags(t.tags, m.shared) + '</div>' +
      matchBlock(m) +
      '<div class="tc-foot"><span class="tc-host">' + avatar(host, 'sm') +
      '<span class="tc-host-name">' + esc(host.nickname) + '</span></span>' +
      '<span class="tc-cap"><span class="tc-cap-num">' + n + ' / ' + t.capacity + ' 人</span>' +
      '<span class="meter' + (n >= t.capacity ? ' full' : '') + '"><i style="width:' + pct + '%"></i></span></span>' +
      '</div></div></article>';
  }

  /* ---------------- 体验卡片 ---------------- */
  function expCard(e, i) {
    var t = S.trip(e.tripId);
    var a = S.user(e.authorId);
    var it = D.INTENSITY[e.intensity];
    return '<article class="exp-card" style="animation-delay:' + Math.min(i * 45, 360) + 'ms">' +
      '<div class="row">' + avatar(a, 'sm') +
      '<span><b style="font-size:13px">' + esc(a.nickname) + '</b>' +
      '<span class="muted" style="font-size:11px;display:block;line-height:1.2">' + esc(relTime(e.createdAt)) + '</span></span>' +
      '<span class="badge ' + it.tone + '" style="margin-left:auto">强度 · ' + it.label + '</span></div>' +
      '<p class="exp-quote">' + esc(e.content) + '</p>' +
      '<div class="exp-advice"><b>给后来者</b>' + esc(e.advice) + '</div>' +
      '<div class="exp-foot"><span class="exp-origin">' + icon('route') + '来自 <b>' + esc(t.title) + '</b> · ' + esc(t.destination) + '</span>' +
      '<button class="btn sm ghost" data-action="open-trip" data-id="' + t.id + '" type="button">看原行程</button>' +
      '<button class="btn sm primary" data-action="copy-trip" data-id="' + t.id + '" type="button">' + icon('copy') + '参考发布</button>' +
      '</div></article>';
  }

  /* ---------------- 体验照片网格 ---------------- */
  function photoGrid(photos) {
    if (!photos || !photos.length) {
      return '<div class="photo-empty">' + icon('camera') + '<span>还没有照片。没有图也能发布，文字本身就是有用的信息。</span></div>';
    }
    return '<div class="photo-grid">' + photos.map(function (src, i) {
      return '<figure class="photo-tile' + (i === 0 ? ' is-cover' : '') + '">' +
        '<img src="' + esc(src) + '" alt="体验照片 ' + (i + 1) + '">' +
        '<div class="photo-actions">' +
        (i > 0 ? '<button data-action="photo-up" data-index="' + i + '" type="button" aria-label="上移">' + icon('left') + '</button>' : '') +
        (i < photos.length - 1 ? '<button data-action="photo-down" data-index="' + i + '" type="button" aria-label="下移">' + icon('right') + '</button>' : '') +
        '<button data-action="photo-remove" data-index="' + i + '" type="button" aria-label="移除">' + icon('x') + '</button>' +
        '</div></figure>';
    }).join('') + '</div>';
  }

  /* ---------------- 空状态 ---------------- */
  function empty(title, text, actionHtml, ic) {
    return '<div class="empty"><span class="empty-icon">' + icon(ic || 'compass') + '</span>' +
      '<p class="empty-title">' + esc(title) + '</p><p class="empty-text">' + esc(text) + '</p>' +
      (actionHtml || '') + '</div>';
  }

  /* ---------------- S01 身份选择 ---------------- */
  function gate() {
    var cards = S.state.users.map(function (u) {
      var st = S.stats(u.id);
      return '<button class="gate-card" data-action="pick-user" data-id="' + u.id + '" type="button">' +
        avatar(u, 'xl') +
        '<span><span class="gate-name">' + esc(u.nickname) + '</span>' +
        '<span class="gate-school" style="display:block">' + esc(u.school) + '</span></span>' +
        '<span class="gate-bio">' + esc(u.bio) + '</span>' +
        '<span class="gate-tags">' + tags(u.interests) + '</span>' +
        '<span class="gate-stats"><span><b>' + st.published + '</b> 发布</span><span><b>' + st.joined + '</b> 同行</span><span><b>' + st.shared + '</b> 分享</span></span>' +
        '<span class="btn sea block" style="margin-top:2px">以 ' + esc(u.nickname) + ' 的身份进入' + icon('right') + '</span>' +
        '</button>';
    }).join('');
    return '<div class="gate-inner">' +
      '<div class="gate-brand"><span class="brand-mark"><svg viewBox="0 0 32 32"><path d="M5 24c5-13 17-13 22 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="10" r="3.4" fill="currentColor"/></svg></span>' +
      '<span class="brand-text"><b style="font-size:19px">RouteMe</b><i>路觅</i></span></div>' +
      '<h1 class="gate-title">先有一条想走的路，<br>再遇到<em>同路的人</em>。</h1>' +
      '<p class="gate-sub">RouteMe 不是交友软件，也不是攻略平台。这里以真实旅行计划为媒介：看到别人的路线获得灵感，发布自己的行程，按目的地、日期和兴趣找到同行者，双方同意后才开始沟通，旅行结束再把体验留给下一个人。</p>' +
      '<div class="gate-loop"><span>旅行灵感</span><span>发布行程</span><span>发现同行者</span><span>建立连接</span><span>一起旅行</span><span>分享体验</span></div>' +
      '<div class="gate-cards">' + cards + '</div>' +
      '<div class="gate-foot">' + icon('shield') + '<span>演示环境：三个预设账号，无注册与验证码。所有数据保存在本机浏览器，可随时重置。</span>' +
      '<button class="btn sm ghost" data-action="reset-data" type="button">重置演示数据</button></div>' +
      '</div>';
  }

  /* ---------------- 导航 ---------------- */
  var NAV = [
    { key: 'discover', href: '#/discover', label: '旅行灵感', ic: 'compass' },
    { key: 'create', href: '#/create', label: '发布行程', ic: 'plus' },
    { key: 'mine', href: '#/mine', label: '我的旅行', ic: 'route' },
    { key: 'chat', href: '#/chat', label: '同行消息', ic: 'chat' }
  ];
  function nav(active) {
    var pend = S.hostPendingCount();
    var rail = NAV.map(function (n) {
      var badge = (n.key === 'mine' && pend) ? '<span class="rail-badge">' + pend + '</span>' : '';
      return '<a class="rail-link' + (active === n.key ? ' active' : '') + '" href="' + n.href + '">' + icon(n.ic) + '<span>' + n.label + '</span>' + badge + '</a>';
    }).join('');
    var tabs = NAV.map(function (n) {
      var badge = (n.key === 'mine' && pend) ? '<span class="tab-badge">' + pend + '</span>' : '';
      return '<a class="tab-link' + (active === n.key ? ' active' : '') + '" href="' + n.href + '">' + icon(n.ic) + '<span>' + n.label + '</span>' + badge + '</a>';
    }).join('');
    return { rail: rail, tabs: tabs };
  }
  function userChip(u) {
    return avatar(u, 'sm') + '<span style="text-align:left"><span class="uc-name">' + esc(u.nickname) + '</span>' +
      '<span class="uc-hint">切换身份</span></span>' + icon('swap');
  }

  /* ---------------- S03 / S04 / S07 发现页 ---------------- */
  function discover(f) {
    var u = S.me();
    var hour = new Date().getHours();
    var hello = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    var trips = S.queryTrips(f);
    var exps = S.queryExperiences(f);
    var open = S.visibleTrips().filter(function (t) { return t.status === 'RECRUITING'; }).length;
    var matched = S.chatPartners().length;
    var ref = S.referenceTrip();
    var basis = ref ? '匹配对照你发布的《' + ref.title + '》' : '匹配对照你的旅行兴趣：' + u.interests.join('、');

    var hero = '<section class="disc-hero">' +
      '<h1 class="greet">' + hello + '，<em>' + esc(u.nickname) + '</em>。<br>今天想走哪条路？</h1>' +
      '<p class="greet-sub">这里是其他同学公开的真实行程与游后体验。看到合适的路线，可以直接申请同行，也可以参考它发布自己的计划。</p>' +
      '<div class="hero-stats">' +
      '<span class="hero-stat"><b>' + open + '</b><span>招募中的行程</span></span>' +
      '<span class="hero-stat"><b>' + S.state.experiences.length + '</b><span>真实游后体验</span></span>' +
      '<span class="hero-stat"><b>' + matched + '</b><span>已建立的同路</span></span>' +
      '<span class="hero-stat"><b>' + S.hostPendingCount() + '</b><span>待我处理申请</span></span>' +
      '</div>' +
      '<p class="hero-basis">' + icon('spark') + esc(basis) + '</p>' +
      '</section>';

    var seg = '<div class="seg" role="tablist">' +
      '<button class="seg-btn' + (f.tab === 'trips' ? ' on' : '') + '" data-action="set-tab" data-tab="trips" role="tab" type="button">' +
      icon('compass') + '招募中的行程<span class="seg-count">' + trips.length + '</span></button>' +
      '<button class="seg-btn' + (f.tab === 'exps' ? ' on' : '') + '" data-action="set-tab" data-tab="exps" role="tab" type="button">' +
      icon('spark') + '旅行体验<span class="seg-count">' + exps.length + '</span></button>' +
      '</div>';

    var destOpts = ['<option value="">全部目的地</option>'].concat(D.DESTINATIONS.map(function (d) {
      return '<option value="' + d + '"' + (f.destination === d ? ' selected' : '') + '>' + d + '</option>';
    })).join('');
    var sortOpts = [['match', '按匹配度'], ['date', '按出发日期'], ['new', '按最新发布']].map(function (o) {
      return '<option value="' + o[0] + '"' + (f.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');

    var tagChips = D.TAGS.map(function (t) {
      return '<button class="chip' + (f.tags.indexOf(t) > -1 ? ' on' : '') + '" data-action="toggle-tag" data-tag="' + t + '" type="button">' + t + '</button>';
    }).join('');

    var views = S.state.savedViews.map(function (v) {
      return '<span class="view-chip"><button data-action="apply-view" data-id="' + v.id + '" type="button" style="all:unset;cursor:pointer">' +
        icon('bookmark') + ' ' + esc(v.name) + '</button>' +
        '<button data-action="del-view" data-id="' + v.id + '" type="button" aria-label="删除筛选">' + icon('x') + '</button></span>';
    }).join('');

    var activeBits = [];
    if (f.q) activeBits.push('关键词「' + esc(f.q) + '」');
    if (f.destination) activeBits.push('目的地 <b>' + esc(f.destination) + '</b>');
    if (f.from) activeBits.push('起 <b>' + esc(fmtDate(f.from)) + '</b>');
    if (f.to) activeBits.push('止 <b>' + esc(fmtDate(f.to)) + '</b>');
    if (f.tags.length) activeBits.push('兴趣 <b>' + esc(f.tags.join(' / ')) + '</b>');
    var summary = activeBits.length
      ? '<p class="active-summary">' + icon('info') + '已应用：' + activeBits.join(' · ') + '</p>'
      : '<p class="active-summary">' + icon('info') + '未设置筛选，展示全部公开内容</p>';

    var filters = '<section class="filters">' +
      '<div class="filter-row">' +
      '<label class="field search"><span class="label">搜索</span>' + icon('search') +
      '<input class="input" type="search" data-filter="q" value="' + esc(f.q) + '" placeholder="路线、地点或发布者昵称"></label>' +
      '<label class="field"><span class="label">目的地</span><select class="select" data-filter="destination">' + destOpts + '</select></label>' +
      '<label class="field"><span class="label">出发不早于</span><input class="input" type="date" data-filter="from" value="' + esc(f.from) + '"></label>' +
      '<label class="field"><span class="label">出发不晚于</span><input class="input" type="date" data-filter="to" value="' + esc(f.to) + '"></label>' +
      '<label class="field"><span class="label">排序</span><select class="select" data-filter="sort">' + sortOpts + '</select></label>' +
      '</div>' +
      '<div class="filter-tags"><span class="filter-tags-label">兴趣</span>' + tagChips + '</div>' +
      '<div class="filter-actions">' +
      '<button class="btn sm ghost" data-action="clear-filters" type="button">' + icon('refresh') + '清除全部条件</button>' +
      '<button class="btn sm ghost" data-action="save-view" type="button">' + icon('bookmark') + '保存为常用筛选</button>' +
      '<span class="grow"></span>' +
      (views ? '<span class="views-row">' + views + '</span>' : '<span class="hint">保存筛选后，下次一键回到同一组条件</span>') +
      '</div>' + summary + '</section>';

    var loop = '';
    if (f.tab === 'trips' && exps.length) {
      loop = '<section class="loop-band">' +
        '<div class="loop-head"><span class="loop-mark">' + icon('spark') + '</span>' +
        '<div class="loop-copy"><h2 class="loop-title">走过的人，把灵感留了下来</h2>' +
        '<p class="loop-sub">这些文字来自已结束的真实行程。读一条，就能参考它的路线发布你自己的计划 —— 闭环在这里接上。</p></div>' +
        '<button class="btn sm ghost loop-more" data-action="set-tab" data-tab="exps" type="button">全部 ' + exps.length + ' 条体验' + icon('right') + '</button></div>' +
        '<div class="loop-grid">' + exps.slice(0, 3).map(function (e, i) { return expCard(e, i); }).join('') + '</div>' +
        '</section>';
    }

    var body;
    if (f.tab === 'trips') {
      body = (trips.length
        ? '<div class="grid">' + trips.map(function (t, i) { return tripCard(t, f, i); }).join('') + '</div>'
        : empty('没有符合条件的行程', '换个目的地或放宽日期试试。也可以直接发布你自己的计划，让别人来找你。',
          '<div class="row" style="margin-top:6px"><button class="btn ghost" data-action="clear-filters" type="button">清除筛选</button>' +
          '<a class="btn primary" href="#/create">' + icon('plus') + '发布我的行程</a></div>', 'search')) + loop;
    } else {
      body = exps.length
        ? '<div class="grid">' + exps.map(function (e, i) { return expCard(e, i); }).join('') + '</div>'
        : empty('还没有匹配的旅行体验', '体验来自已结束的真实行程。放宽筛选条件，或先去完成一次旅行再回来分享。',
          '<button class="btn ghost" data-action="clear-filters" type="button">清除筛选</button>', 'spark');
    }
    return hero + seg + filters + body;
  }

  /* ---------------- S05 / S02 / S08 / S14 行程详情 ---------------- */
  function safetyPanel(t) {
    return '<section class="panel safety"><h3 class="panel-title">' + icon('shield') + '同行安全</h3>' +
      '<ul class="safety-list">' +
      '<li>' + icon('pin') + '<span>首次见面请选公共场所。本行程集合区域：' + esc(t.meetingArea || '尚未填写，出发前请在聊天中确认') + '</span></li>' +
      '<li>' + icon('users') + '<span>把目的地、日期和同行人昵称告知亲友，并约定报平安的时间。</span></li>' +
      '<li>' + icon('shield') + '<span>平台不公开电话、证件与精确住址。任何转账、借贷或索要证件的请求都应拒绝。</span></li>' +
      '</ul>' +
      '<button class="btn sm danger block" style="margin-top:13px" data-action="report" data-type="trip" data-id="' + t.id + '" data-label="' + esc(t.title) + '" type="button">' + icon('flag') + '举报这条行程</button>' +
      '</section>';
  }

  function actionBox(t) {
    var id = t.id;
    var mine = S.isCreator(id);
    var myA = S.myApp(id);
    var g = S.canApply(t);
    var pend = S.pendingApps(id).length;
    var html = '<section class="panel"><h3 class="panel-title">' + icon('spark') + '下一步</h3><div class="action-box">';

    if (mine) {
      if (t.status === 'COMPLETED') {
        html += '<p class="action-note">行程已结束。把真实体验留下来，它会回到灵感首页，成为下一位同学的参考。</p>';
        if (S.canShare(id)) html += '<a class="btn primary block" href="#/share/' + id + '">' + icon('spark') + (S.myExperience(id) ? '修改我的体验' : '发表游后体验') + '</a>';
        html += '<button class="btn sm danger block" data-action="delete-trip" data-id="' + id + '" type="button">' + icon('trash') + '删除这条行程</button>';
      } else {
        html += '<button class="btn sea block" data-action="open-apps" data-id="' + id + '" type="button">' + icon('inbox') + '处理同行申请' + (pend ? '（' + pend + ' 待处理）' : '') + '</button>';
        html += '<a class="btn ghost block" href="#/edit/' + id + '">' + icon('edit') + '编辑行程</a>';
        html += '<button class="btn primary block" data-action="complete-trip" data-id="' + id + '" type="button">' + icon('finish') + '标记为已结束</button>';
        html += '<p class="action-note warn">结束后不再接受新申请，参加者可以发表体验。演示时用它模拟旅行完成，不必真的等到日期。</p>';
        html += '<div class="action-danger-row">' +
          '<button class="btn sm danger" data-action="cancel-trip" data-id="' + id + '" type="button">' + icon('x') + '取消行程</button>' +
          '<button class="btn sm danger" data-action="delete-trip" data-id="' + id + '" type="button">' + icon('trash') + '删除行程</button>' +
          '</div>';
      }
    } else if (myA && myA.status === 'ACCEPTED') {
      html += '<p class="action-note">' + icon('check') + ' 你已在同行名单中，可以和发起人确认集合与安排。</p>';
      html += '<a class="btn sea block" href="#/chat/' + id + '/' + t.creatorId + '">' + icon('chat') + '与 ' + esc(S.user(t.creatorId).nickname) + ' 沟通</a>';
      if (t.status === 'COMPLETED' && S.canShare(id)) {
        html += '<a class="btn primary block" href="#/share/' + id + '">' + icon('spark') + (S.myExperience(id) ? '修改我的体验' : '发表游后体验') + '</a>';
      }
      if (t.status !== 'COMPLETED') html += '<button class="btn sm danger block" data-action="leave-trip" data-id="' + id + '" type="button">' + icon('exit') + '退出同行</button>';
    } else if (myA && myA.status === 'PENDING') {
      html += '<p class="action-note warn">' + icon('clock') + ' 申请已提交，等待 ' + esc(S.user(t.creatorId).nickname) + ' 回应。处理前你可以随时撤回。</p>';
      html += '<button class="btn ghost block" data-action="cancel-app" data-id="' + myA.id + '" type="button">' + icon('x') + '撤回申请</button>';
    } else if (g.ok) {
      html += '<div class="apply-form"><label class="field"><span class="label">一句申请说明<span class="opt">让对方知道你为什么合适</span></span>' +
        '<textarea class="textarea" data-apply-msg rows="3" maxlength="120" placeholder="例如：这条线我走过一半，想补上日落那段，可以帮忙背装备。"></textarea></label>' +
        '<button class="btn primary block" data-action="submit-apply" data-id="' + id + '" type="button">' + icon('send') + '提交同行申请</button>' +
        '<p class="hint">提交后对方接受才会开放聊天，不会变成无条件私聊。</p></div>';
    } else {
      html += '<p class="action-note warn">' + icon('info') + ' ' + esc(g.reason) + '</p>';
    }

    if (!mine && t.status === 'COMPLETED') {
      html += '<button class="btn ghost block" data-action="copy-trip" data-id="' + id + '" type="button">' + icon('copy') + '参考此行程发布</button>';
    }
    return html + '</div></section>';
  }

  function detail(id) {
    var t = S.trip(id);
    if (!t) return empty('找不到这条行程', '它可能已被发布者删除或取消。回到灵感首页看看其他路线。', '<a class="btn primary" href="#/discover">回到灵感首页</a>', 'search');
    var host = S.user(t.creatorId);
    var parts = S.participants(id);
    var n = parts.length;
    var m = S.matchOf(t, {});
    var exps = S.experiencesOf(id);
    var meId = S.state.currentUserId;

    var hero = '<section class="dt-hero"><div class="dt-hero-bg">' + cover(t.terrain, id) + '</div>' +
      '<div class="dt-hero-inner">' +
      '<div class="dt-eyebrow">' + icon('pin') + esc(t.destination) + ' · ' + esc(D.TERRAIN[t.terrain].label) + tripBadge(t) + '</div>' +
      '<h1 class="dt-title">' + esc(t.title) + '</h1>' +
      '<div class="dt-meta">' +
      '<div><span>日期</span><b>' + esc(fmtRange(t.startDate, t.endDate)) + '</b></div>' +
      '<div><span>时间</span><b>' + esc(dayLabel(t.startDate)) + '</b></div>' +
      '<div><span>人数</span><b>' + n + ' / ' + t.capacity + ' 人</b></div>' +
      '<div><span>预算</span><b>' + esc(budgetText(t)) + '</b></div>' +
      '</div></div></section>';

    var route = '<section class="panel"><h3 class="panel-title">' + icon('route') + '路线安排</h3><div class="route-line">' +
      t.stops.map(function (s, i) {
        var role = i === 0 ? '集合点' : (i === t.stops.length - 1 ? '收尾' : '途经');
        return '<div class="route-stop" style="animation-delay:' + (i * 60) + 'ms"><span class="stop-dot">' + (i + 1) + '</span>' +
          '<span class="stop-text">' + esc(s) + '<small>' + role + '</small></span></div>';
      }).join('') + '</div>';
    if (t.note) route += '<hr class="divider"><p style="font-size:13.5px;line-height:1.7;color:var(--ink-2)">' + esc(t.note) + '</p>';
    route += '</section>';

    var facts = '<section class="panel"><h3 class="panel-title">' + icon('info') + '出发信息</h3><div class="fact-grid">' +
      '<div class="fact"><span>集合区域</span><b>' + esc(t.meetingArea || '待确认') + '</b></div>' +
      '<div class="fact"><span>集合时间</span><b>' + esc(fmtMeeting(t.meetingTime)) + '</b></div>' +
      '<div class="fact"><span>预算区间</span><b>' + esc(budgetText(t)) + '</b></div>' +
      '<div class="fact"><span>行程天数</span><b>' + (S.dayDiff(t.endDate, t.startDate) + 1) + ' 天</b></div>' +
      '<div class="fact"><span>剩余名额</span><b>' + Math.max(0, t.capacity - n) + ' 人</b></div>' +
      '</div>' +
      (t.meetingArea && t.meetingTime ? '' : '<p class="hint" style="margin-top:12px">集合信息未填完，出发前请在聊天中确认。</p>') +
      '<div class="tc-tags" style="margin-top:14px">' + tags(t.tags, m.shared) + '</div>' +
      (t.creatorId === S.state.currentUserId && t.status !== 'COMPLETED'
        ? '<div style="margin-top:14px"><button class="btn sm ghost" data-action="edit-meeting" data-id="' + id + '" type="button">' + icon('pin') + '编辑集合信息</button></div>'
        : '') +
      (t.sourceTripId && S.trip(t.sourceTripId) ? '<p class="hint" style="margin-top:12px">' + icon('copy') + ' 参考自《' + esc(S.trip(t.sourceTripId).title) + '》</p>' : '') +
      '</section>';

    var expBlock = '';
    if (exps.length) {
      expBlock = '<section class="panel"><h3 class="panel-title">' + icon('spark') + '游后真实体验</h3><div class="exp-block">' +
        exps.map(function (e) {
          var a = S.user(e.authorId), it = D.INTENSITY[e.intensity];
          return '<article class="exp-item"><div class="exp-item-head">' + avatar(a, 'sm') +
            '<b style="font-size:13.5px">' + esc(a.nickname) + '</b>' +
            '<span class="badge ' + it.tone + '">强度 · ' + it.label + '</span>' +
            '<span class="muted" style="font-size:11px;margin-left:auto">' + esc(relTime(e.createdAt)) + '</span></div>' +
            '<p class="exp-item-body">' + esc(e.content) + '</p>' +
            '<div class="exp-advice" style="margin-top:11px"><b>给后来者</b>' + esc(e.advice) + '</div>' +
            (e.photos && e.photos.length
              ? '<div class="experience-photos"><img src="' + esc(e.photos[0]) + '" alt="体验首图">' +
                (e.photos.length > 1 ? '<button class="btn sm ghost experience-photos-more" data-action="photo-view" data-id="' + id + '" data-index="' + exps.indexOf(e) + '" type="button">' + icon('eye') + '查看全部 ' + e.photos.length + ' 张</button>' : '') +
                '</div>'
              : '') + '</article>';
        }).join('') + '</div></section>';
    } else if (t.status === 'COMPLETED') {
      expBlock = '<section class="panel">' + empty('还没有人留下体验', '参加过这次旅行的同学可以在这里写下真实感受与建议。', '', 'spark') + '</section>';
    }

    var hostPanel = '<section class="panel"><h3 class="panel-title">' + icon('users') + '发起人</h3>' +
      '<button class="host-card" data-action="profile" data-id="' + host.id + '" type="button">' + avatar(host, 'lg') +
      '<span class="host-info"><span class="host-name">' + esc(host.nickname) +
      (host.id === meId ? '<span class="badge dusk no-dot">这是你</span>' : '') + '</span>' +
      '<span class="host-school">' + esc(host.school) + '</span>' +
      '<span class="host-bio">' + esc(host.bio) + '</span>' +
      '<span class="host-tags">' + tags(host.interests, m.shared) + '</span></span></button>' +
      '<p class="hint" style="margin-top:10px">点击查看完整资料。平台不展示电话、证件与精确住址。</p></section>';

    var compPanel = '<section class="panel"><h3 class="panel-title">' + icon('users') + '当前同行者 ' + n + '/' + t.capacity + '</h3>' +
      '<span class="meter' + (n >= t.capacity ? ' full' : '') + '" style="margin-bottom:12px"><i style="width:' + Math.min(100, n / t.capacity * 100) + '%"></i></span>' +
      '<div class="companions">' + parts.map(function (p) {
        var isHost = p.id === t.creatorId;
        var chatBtn = (p.id !== meId && S.canChat(id, p.id))
          ? '<a class="btn sm ghost" href="#/chat/' + id + '/' + p.id + '">' + icon('chat') + '聊天</a>' : '';
        return '<div class="companion">' + avatar(p, 'sm') +
          '<span><span class="companion-name">' + esc(p.nickname) + (p.id === meId ? ' · 你' : '') + '</span>' +
          '<span class="companion-role" style="display:block">' + (isHost ? '发起人' : '同行者') + '</span></span>' + chatBtn + '</div>';
      }).join('') + '</div>' +
      (n < t.capacity && t.status === 'RECRUITING' ? '<p class="hint" style="margin-top:10px">还有 ' + (t.capacity - n) + ' 个名额，招满后自动停止接受申请。</p>' : '') +
      '</section>';

    var matchPanel = '<section class="panel"><h3 class="panel-title">' + icon('spark') + '为什么推荐给你</h3>' +
      matchBlock(m) + '<p class="hint" style="margin-top:10px">' + esc(m.basis) + '。规则可解释：目的地相同 50 分，日期相同 30 分、相差一天 20 分，每个共同兴趣 10 分（最多 20 分）。</p></section>';

    return '<a class="back-link" href="#/discover">' + icon('left') + '回到旅行灵感</a>' + hero +
      '<div class="dt-grid"><div class="dt-main stack">' + route + facts + expBlock + '</div>' +
      '<aside class="dt-aside">' + actionBox(t) + hostPanel + compPanel + matchPanel + safetyPanel(t) + '</aside></div>';
  }

  /* ---------------- S06 / S17 发布与编辑 ---------------- */
  function previewCard(d) {
    var stops = (d.stops || []).filter(function (s) { return s && s.trim(); });
    var host = S.me();
    return '<article class="trip-card" style="animation:none">' +
      '<div class="tc-cover">' + cover(d.terrain || 'city', 'pv') +
      '<div class="tc-cover-top"><span class="tc-dest">' + icon('pin') + esc(d.destination || '目的地') + '</span>' +
      '<span class="badge surf">招募中</span></div></div>' +
      '<div class="tc-body"><h3 class="tc-title">' + esc(d.title || '你的行程标题') + '</h3>' +
      '<div class="tc-meta"><span>' + icon('calendar') + esc(d.startDate ? fmtRange(d.startDate, d.endDate || d.startDate) : '待选择日期') + '</span></div>' +
      '<p class="tc-route"><b>路线</b> ' + esc(stops.length ? stops.join(' → ') : '至少写出两个途经点') + '</p>' +
      '<div class="tc-tags">' + (d.tags && d.tags.length ? tags(d.tags) : '<span class="hint">未选择兴趣标签</span>') + '</div>' +
      '<div class="tc-foot"><span class="tc-host">' + avatar(host, 'sm') + '<span class="tc-host-name">' + esc(host.nickname) + '</span></span>' +
      '<span class="tc-cap"><span class="tc-cap-num">1 / ' + esc(d.capacity || 2) + ' 人</span>' +
      '<span class="meter"><i style="width:' + Math.round(100 / (d.capacity || 2)) + '%"></i></span></span></div></div></article>';
  }

  function fieldErr(errors, key) {
    return errors && errors[key] ? '<span class="err">' + icon('alert') + esc(errors[key]) + '</span>' : '';
  }
  function bad(errors, key) { return errors && errors[key] ? ' bad' : ''; }

  function tripForm(d, errors, source, isEdit) {
    errors = errors || {};
    var destOpts = ['<option value="">选择目的地</option>'].concat(D.DESTINATIONS.map(function (x) {
      return '<option value="' + x + '"' + (d.destination === x ? ' selected' : '') + '>' + x + '</option>';
    })).join('');
    var terrainOpts = Object.keys(D.TERRAIN).map(function (k) {
      var ic = k === 'coast' ? 'wave' : k === 'mountain' ? 'mountain' : 'city';
      return '<button class="terrain-opt' + (d.terrain === k ? ' on' : '') + '" data-action="set-terrain" data-terrain="' + k + '" type="button">' +
        icon(ic) + '<span>' + D.TERRAIN[k].label + '</span></button>';
    }).join('');
    var stopRows = d.stops.map(function (s, i) {
      return '<div class="stop-row" draggable="true" data-stop="' + i + '">' +
        '<span class="stop-handle" title="拖动调整顺序">' + icon('grip') + '</span>' +
        '<span class="stop-index">' + (i + 1) + '</span>' +
        '<input class="input" data-stop-input="' + i + '" value="' + esc(s) + '" maxlength="30" placeholder="例如：情侣路骑行段">' +
        '<button class="stop-del" data-action="del-stop" data-index="' + i + '" type="button" aria-label="删除这个途经点">' + icon('trash') + '</button></div>';
    }).join('');
    var tagBtns = D.TAGS.map(function (x) {
      return '<button class="chip' + (d.tags.indexOf(x) > -1 ? ' on' : '') + '" data-action="form-tag" data-tag="' + x + '" type="button">' + x + '</button>';
    }).join('');

    var banner = source
      ? '<div class="prefill-banner">' + icon('copy') + '<span><b>已参考《' + esc(source.title) + '》预填</b>' +
      '<p>目的地、路线与兴趣标签已带入。日期、人数和集合地点需要你重新填写 —— 这是你自己的行程。</p></span></div>'
      : '';

    var head = '<div class="page-head"><div><h1 class="page-title">' + (isEdit ? '编辑行程' : '发布一条想走的路') + '</h1>' +
      '<p class="page-sub">' + (isEdit ? '修改后同行者看到的内容会同步更新。' : '写清楚目的地、日期和路线，别人才知道能不能和你同路。') + '</p></div>' +
      '<a class="btn ghost" href="' + (isEdit ? '#/trip/' + d.id : '#/discover') + '">' + icon('left') + '返回</a></div>';

    var main = '<div class="form-main">' +
      '<section class="panel"><h3 class="panel-title">' + icon('spark') + '基本信息</h3><div class="stack">' +
      '<label class="field' + bad(errors, 'title') + '"><span class="label">行程标题<span class="req">*</span><span class="counter">' + (d.title || '').length + '/40</span></span>' +
      '<input class="input" data-form="title" maxlength="40" value="' + esc(d.title) + '" placeholder="例如：珠海情侣路日落机位二刷">' + fieldErr(errors, 'title') + '</label>' +
      '<div class="form-row">' +
      '<label class="field' + bad(errors, 'destination') + '"><span class="label">目的地<span class="req">*</span></span>' +
      '<select class="select" data-form="destination">' + destOpts + '</select>' + fieldErr(errors, 'destination') + '</label>' +
      '<div class="field"><span class="label">路线类型</span><div class="terrain-picker">' + terrainOpts + '</div></div>' +
      '</div>' +
      '<div class="form-row">' +
      '<label class="field' + bad(errors, 'startDate') + '"><span class="label">出发日期<span class="req">*</span></span>' +
      '<input class="input" type="date" data-form="startDate" value="' + esc(d.startDate) + '">' + fieldErr(errors, 'startDate') + '</label>' +
      '<label class="field' + bad(errors, 'endDate') + '"><span class="label">结束日期<span class="req">*</span></span>' +
      '<input class="input" type="date" data-form="endDate" value="' + esc(d.endDate) + '">' + fieldErr(errors, 'endDate') + '</label>' +
      '</div></div></section>' +

      '<section class="panel"><h3 class="panel-title">' + icon('route') + '简单路线<span style="font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink-3);font-size:11px">拖动左侧手柄可以调整顺序</span></h3>' +
      '<div class="field' + bad(errors, 'stops') + '"><div class="stop-list" id="stop-list">' + stopRows + '</div>' +
      '<button class="btn sm ghost stop-add" data-action="add-stop" type="button">' + icon('plus') + '添加途经点</button>' +
      fieldErr(errors, 'stops') + '<span class="hint">第一个点默认作为集合点，最后一个点作为收尾。不需要精确到分钟。</span></div></section>' +

      '<section class="panel"><h3 class="panel-title">' + icon('users') + '同行与预算</h3><div class="stack">' +
      '<div class="form-row">' +
      '<div class="field' + bad(errors, 'capacity') + '"><span class="label">计划人数<span class="req">*</span><span class="opt">含你自己</span></span>' +
      '<span class="stepper"><button class="stepper-btn" data-action="cap-step" data-delta="-1" type="button" aria-label="减少人数">−</button>' +
      '<span class="stepper-val">' + esc(d.capacity) + '</span>' +
      '<button class="stepper-btn" data-action="cap-step" data-delta="1" type="button" aria-label="增加人数">+</button></span>' +
      fieldErr(errors, 'capacity') + '<span class="hint">招满后系统自动停止接受新申请。</span></div>' +
      '<label class="field"><span class="label">集合区域<span class="opt">选填</span></span>' +
      '<input class="input" data-form="meetingArea" maxlength="100" value="' + esc(d.meetingArea) + '" placeholder="例如：香洲港公交站">' +
      '<span class="hint">只写公共区域，不要写宿舍或家庭住址。</span></label>' +
      '<label class="field"><span class="label">集合时间<span class="opt">选填</span></span>' +
      '<input class="input" type="datetime-local" data-form="meetingTime" value="' + esc(d.meetingTime || '') + '">' +
      '<span class="hint">不晚于结束日期；出发前也可以在聊天里再确认。</span></label>' +
      '</div>' +
      '<div class="form-row">' +
      '<label class="field"><span class="label">预算下限<span class="opt">选填 · 元</span></span>' +
      '<input class="input" type="number" min="0" step="10" data-form="budgetMin" value="' + esc(d.budgetMin) + '" placeholder="100"></label>' +
      '<label class="field' + bad(errors, 'budget') + '"><span class="label">预算上限<span class="opt">选填 · 元</span></span>' +
      '<input class="input" type="number" min="0" step="10" data-form="budgetMax" value="' + esc(d.budgetMax) + '" placeholder="200">' + fieldErr(errors, 'budget') + '</label>' +
      '</div></div></section>' +

      '<section class="panel"><h3 class="panel-title">' + icon('star') + '兴趣标签<span style="font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink-3);font-size:11px">最多 5 个，用于匹配同路的人</span></h3>' +
      '<div class="tag-picker">' + tagBtns + '</div>' +
      '<label class="field" style="margin-top:15px"><span class="label">补充说明<span class="opt">选填</span></span>' +
      '<textarea class="textarea" data-form="note" maxlength="200" placeholder="强度、装备要求、节奏偏好，或者你希望同行者知道的事。">' + esc(d.note) + '</textarea></label>' +
      '<div class="form-actions" style="margin-top:16px">' +
      '<button class="btn primary" data-action="submit-trip" type="button">' + icon(isEdit ? 'check' : 'send') + (isEdit ? '保存修改' : '发布行程') + '</button>' +
      '<a class="btn ghost" href="' + (isEdit ? '#/trip/' + d.id : '#/discover') + '">取消</a>' +
      (errors._ ? '<span class="err">' + icon('alert') + esc(errors._) + '</span>' : '') +
      '</div>' +
      (isEdit ? '<div class="danger-zone"><span class="dz-copy"><b>删除这条行程</b>' +
        '<p>行程、相关申请、聊天记录与游后体验会一并删除。删除后可以在提示条里撤销一次。</p></span>' +
        '<button class="btn sm danger" data-action="delete-trip" data-id="' + d.id + '" type="button">' + icon('trash') + '删除行程</button></div>' : '') +
      '</section></div>';

    var side = '<aside class="form-side"><div><span class="preview-label">实时预览 · 别人看到的样子</span>' + previewCard(d) + '</div>' +
      '<section class="panel safety"><h3 class="panel-title">' + icon('shield') + '发布前提醒</h3><ul class="safety-list">' +
      '<li>' + icon('check') + '<span>只填写公共集合区域，不要公开电话、证件号码或精确住址。</span></li>' +
      '<li>' + icon('check') + '<span>把强度和要求写清楚，比事后劝退更省事。</span></li>' +
      '<li>' + icon('check') + '<span>接受申请前先看对方资料，你有完全的拒绝权。</span></li>' +
      '</ul></section></aside>';

    return head + banner + '<div class="form-grid">' + main + side + '</div>';
  }

  /* ---------------- S10 / S11 / S13 / S15 我的旅行 ---------------- */
  function mineRow(t, actions, note, i) {
    var n = S.count(t.id);
    return '<article class="mine-row" style="animation-delay:' + Math.min(i * 45, 320) + 'ms">' +
      '<span class="mr-cover">' + cover(t.terrain, t.id) + '</span>' +
      '<div class="mr-main"><h3 class="mr-title"><a href="#/trip/' + t.id + '">' + esc(t.title) + '</a>' + tripBadge(t) + '</h3>' +
      '<div class="mr-meta"><span>' + esc(t.destination) + '</span><span>' + esc(fmtRange(t.startDate, t.endDate)) + '</span>' +
      '<span>' + n + ' / ' + t.capacity + ' 人</span><span>' + esc(dayLabel(t.startDate)) + '</span></div>' +
      (note ? '<p class="mr-note">' + note + '</p>' : '') + '</div>' +
      '<div class="mr-actions">' + actions + '</div></article>';
  }

  function mine(tab) {
    var meId = S.state.currentUserId;
    var published = S.state.trips.filter(function (t) { return t.creatorId === meId; });
    var applied = S.state.applications.filter(function (a) { return a.applicantId === meId; })
      .sort(function (a, b) { return b.createdAt - a.createdAt; });
    var matched = S.state.trips.filter(function (t) {
      return t.creatorId !== meId && S.isParticipant(t.id, meId) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
    });
    var completed = S.state.trips.filter(function (t) { return S.isParticipant(t.id, meId) && t.status === 'COMPLETED'; });
    var pend = S.hostPendingCount();

    var tabsDef = [
      ['published', '我发布的', published.length],
      ['applied', '我申请的', applied.length],
      ['matched', '已匹配同行', matched.length],
      ['completed', '已完成旅行', completed.length]
    ];
    var seg = '<div class="seg" role="tablist">' + tabsDef.map(function (x) {
      return '<button class="seg-btn' + (tab === x[0] ? ' on' : '') + '" data-action="mine-tab" data-tab="' + x[0] + '" role="tab" type="button">' +
        x[1] + '<span class="seg-count">' + x[2] + '</span></button>';
    }).join('') + '</div>';

    var head = '<div class="page-head"><div><h1 class="page-title">我的旅行</h1>' +
      '<p class="page-sub">发布、申请、同行与已完成的行程都在这里。' +
      (pend ? '<b style="color:var(--t-coral)">你有 ' + pend + ' 条申请等待处理。</b>' : '目前没有待处理的申请。') + '</p></div>' +
      '<a class="btn primary" href="#/create">' + icon('plus') + '发布新行程</a></div>';

    var body = '';
    if (tab === 'published') {
      body = published.length ? '<div class="mine-list">' + published.map(function (t, i) {
        var p = S.pendingApps(t.id).length;
        var acts = '<a class="btn sm ghost" href="#/trip/' + t.id + '">' + icon('eye') + '查看</a>';
        var note = '';
        if (t.status === 'COMPLETED') {
          acts += '<a class="btn sm primary" href="#/share/' + t.id + '">' + icon('spark') + (S.myExperience(t.id) ? '修改体验' : '发表体验') + '</a>';
          acts += '<button class="btn sm danger" data-action="delete-trip" data-id="' + t.id + '" type="button">' + icon('trash') + '删除</button>';
          note = S.myExperience(t.id) ? '你已留下游后体验，它会出现在灵感首页。' : '行程已结束，还没有写下你的体验。';
        } else if (t.status === 'CANCELLED') {
          acts += '<button class="btn sm danger" data-action="delete-trip" data-id="' + t.id + '" type="button">' + icon('trash') + '删除</button>';
          note = '行程已取消，不再展示在灵感首页。';
        } else {
          acts += '<button class="btn sm ' + (p ? 'primary' : 'ghost') + '" data-action="open-apps" data-id="' + t.id + '" type="button">' + icon('inbox') + '申请' + (p ? ' · ' + p : '') + '</button>';
          acts += '<a class="btn sm ghost" href="#/edit/' + t.id + '">' + icon('edit') + '编辑</a>';
          acts += '<button class="btn sm sea" data-action="complete-trip" data-id="' + t.id + '" type="button">' + icon('finish') + '结束</button>';
        }
        return mineRow(t, acts, note, i);
      }).join('') + '</div>'
        : empty('你还没有发布行程', '把心里那条路线写出来，它既是行程，也是一封给同路人的邀请。', '<a class="btn primary" href="#/create">' + icon('plus') + '发布第一条行程</a>', 'route');
    } else if (tab === 'applied') {
      var rows = applied.map(function (a, i) {
        var t = S.trip(a.tripId);
        if (!t) return '';
        var acts = '<a class="btn sm ghost" href="#/trip/' + t.id + '">' + icon('eye') + '查看</a>';
        if (a.status === 'PENDING') acts += '<button class="btn sm danger" data-action="cancel-app" data-id="' + a.id + '" type="button">' + icon('x') + '撤回</button>';
        if (a.status === 'ACCEPTED' && t.status !== 'COMPLETED') acts += '<a class="btn sm sea" href="#/chat/' + t.id + '/' + t.creatorId + '">' + icon('chat') + '聊天</a>';
        if (a.status === 'ACCEPTED' && t.status === 'COMPLETED') acts += '<a class="btn sm primary" href="#/share/' + t.id + '">' + icon('spark') + '写体验</a>';
        var note = appBadge(a) + ' <span style="margin-left:6">' + esc(a.message || '未填写申请说明') + '</span>';
        return mineRow(t, acts, note, i);
      }).join('');
      body = applied.length ? '<div class="mine-list">' + rows + '</div>'
        : empty('你还没有申请过行程', '在灵感首页找到目的地和日期相近的计划，留一句话就可以申请同行。', '<a class="btn primary" href="#/discover">' + icon('compass') + '去看看行程</a>', 'inbox');
    } else if (tab === 'matched') {
      body = matched.length ? '<div class="mine-list">' + matched.map(function (t, i) {
        var acts = '<a class="btn sm sea" href="#/chat/' + t.id + '/' + t.creatorId + '">' + icon('chat') + '与发起人沟通</a>' +
          '<a class="btn sm ghost" href="#/trip/' + t.id + '">' + icon('eye') + '行程</a>' +
          '<button class="btn sm danger" data-action="leave-trip" data-id="' + t.id + '" type="button">' + icon('exit') + '退出</button>';
        var note = '集合：' + esc(t.meetingArea || '待确认') + ' · ' + esc(fmtMeeting(t.meetingTime)) + ' · 同行 ' + S.count(t.id) + ' 人';
        return mineRow(t, acts, note, i);
      }).join('') + '</div>'
        : empty('还没有已匹配的同行', '申请被接受后，行程会出现在这里，并开放与发起人的文字沟通。', '<a class="btn primary" href="#/discover">' + icon('compass') + '发现同行者</a>', 'users');
    } else {
      body = completed.length ? '<div class="mine-list">' + completed.map(function (t, i) {
        var has = S.myExperience(t.id);
        var acts = '<a class="btn sm ' + (has ? 'ghost' : 'primary') + '" href="#/share/' + t.id + '">' + icon('spark') + (has ? '修改我的体验' : '发表游后体验') + '</a>' +
          '<button class="btn sm ghost" data-action="copy-trip" data-id="' + t.id + '" type="button">' + icon('copy') + '参考发布</button>' +
          '<a class="btn sm ghost" href="#/trip/' + t.id + '">' + icon('eye') + '查看</a>';
        var note = has ? '你的体验已回到灵感首页，正在为下一位同学提供参考。' : '写下真实强度和一条建议，闭环才算真正闭合。';
        return mineRow(t, acts, note, i);
      }).join('') + '</div>'
        : empty('还没有完成的旅行', '发起人把行程标记为已结束后，参加者就可以在这里分享真实体验。', '', 'finish');
    }
    return head + seg + body;
  }

  /* ---------------- S12 同行聊天 ---------------- */
  function chat(tripId, otherId) {
    var partners = S.chatPartners();
    var head = '<div class="page-head"><div><h1 class="page-title">同行消息</h1>' +
      '<p class="page-sub">只有申请被接受、双方成为同行者后才能进入聊天。切换演示身份即可用对方账号回复。</p></div>' +
      '<button class="btn ghost" data-action="refresh" type="button">' + icon('refresh') + '刷新消息</button></div>';

    if (!partners.length) {
      return head + empty('还没有可以聊天的同行者', '先申请一条行程并等待发起人接受。未匹配的用户无法进入聊天，这是有意的边界。',
        '<a class="btn primary" href="#/discover">' + icon('compass') + '去找同路的人</a>', 'chat');
    }

    var active = null;
    for (var i = 0; i < partners.length; i++) {
      if (partners[i].trip.id === tripId && partners[i].other.id === otherId) { active = partners[i]; break; }
    }
    if (!active) active = partners[0];

    var list = partners.map(function (p) {
      var on = p.trip.id === active.trip.id && p.other.id === active.other.id;
      return '<a class="chat-item' + (on ? ' on' : '') + '" href="#/chat/' + p.trip.id + '/' + p.other.id + '">' +
        avatar(p.other) + '<span style="min-width:0"><span class="ci-name">' + esc(p.other.nickname) + '</span>' +
        '<span class="ci-trip">' + esc(p.trip.title) + '</span>' +
        '<span class="ci-last">' + esc(p.last ? p.last.content : '还没有消息，先确认集合时间吧') + '</span></span></a>';
    }).join('');

    var t = active.trip, other = active.other;
    var msgs = S.thread(t.id, other.id);
    var meId = S.state.currentUserId;
    var closed = t.status === 'COMPLETED' || t.status === 'CANCELLED';

    var bubbles = msgs.length ? msgs.map(function (m, idx) {
      var mineMsg = m.senderId === meId;
      return '<div class="msg' + (mineMsg ? ' me' : '') + '" style="animation-delay:' + Math.min(idx * 35, 300) + 'ms">' +
        avatar(S.user(m.senderId), 'sm') + '<span class="msg-col"><span class="bubble">' + esc(m.content) + '</span>' +
        '<span class="msg-time">' + esc(fmtStamp(m.sentAt)) + '</span></span></div>';
    }).join('') : '<div class="empty" style="margin:auto"><span class="empty-icon">' + icon('chat') + '</span>' +
      '<p class="empty-title">开始第一次对话</p><p class="empty-text">建议先确认集合时间与地点，再讨论装备和节奏。首次见面请选择公共场所。</p></div>';

    var composer = closed
      ? '<div class="composer-closed">' + icon('info') + ' 行程已' + (t.status === 'COMPLETED' ? '结束' : '取消') + '，聊天记录保留但不再发送新消息。</div>'
      : '<div class="composer"><textarea class="textarea grow" data-chat-input rows="1" maxlength="500" placeholder="输入消息，Enter 发送，Shift + Enter 换行"></textarea>' +
      '<button class="btn sea" data-action="send-msg" data-trip="' + t.id + '" data-to="' + other.id + '" type="button">' + icon('send') + '发送</button></div>';

    var main = '<section class="chat-main">' +
      '<div class="chat-head">' + avatar(other) +
      '<span class="chat-head-info"><span class="chat-head-name">' + esc(other.nickname) + '</span>' +
      '<span class="chat-head-trip">' + esc(t.title) + ' · ' + esc(fmtRange(t.startDate, t.endDate)) + '</span></span>' +
      '<span class="chat-head-actions">' +
      '<button class="btn sm ghost" data-action="profile" data-id="' + other.id + '" type="button">' + icon('users') + '资料</button>' +
      '<a class="btn sm ghost" href="#/trip/' + t.id + '">' + icon('route') + '行程</a>' +
      '<button class="btn sm danger" data-action="report" data-type="user" data-id="' + other.id + '" data-label="' + esc(other.nickname) + '" type="button">' + icon('flag') + '举报</button>' +
      (t.creatorId !== meId && !closed ? '<button class="btn sm danger" data-action="leave-trip" data-id="' + t.id + '" type="button">' + icon('exit') + '退出同行</button>' : '') +
      '</span></div>' +
      '<div class="chat-safety">' + icon('shield') + '<span>首次见面请选择公共场所 · 集合区域：' + esc(t.meetingArea || '待确认') + ' · 集合时间：' + esc(fmtMeeting(t.meetingTime)) + ' · 不要转账或提供证件信息</span></div>' +
      '<div class="chat-body" id="chat-body">' + bubbles + '</div>' + composer + '</section>';

    return head + '<div class="chat-layout"><div class="chat-list-pane">' + list + '</div>' + main + '</div>';
  }

  /* ---------------- S16 游后分享 ---------------- */
  function share(tripId, d, errors) {
    errors = errors || {};
    var t = S.trip(tripId);
    if (!t) return empty('找不到这条行程', '它可能已被删除。', '<a class="btn primary" href="#/mine">回到我的旅行</a>', 'search');
    if (!S.canShare(tripId)) {
      return empty('还不能分享这次旅行', '只有已结束、并且你实际参加过的行程才能发表体验。这是为了保证首页上的内容都是真实发生过的。',
        '<a class="btn primary" href="#/trip/' + tripId + '">看看这条行程</a>', 'shield');
    }
    var existing = S.myExperience(tripId);
    var ints = Object.keys(D.INTENSITY).map(function (k) {
      var it = D.INTENSITY[k];
      return '<button class="int-card ' + it.tone + (d.intensity === k ? ' on' : '') + '" data-action="set-intensity" data-value="' + k + '" type="button">' +
        '<b>' + it.label + '</b><span>' + it.desc + '</span></button>';
    }).join('');

    return '<a class="back-link" href="#/trip/' + tripId + '">' + icon('left') + '回到行程详情</a>' +
      '<div class="page-head"><div><h1 class="page-title">' + (existing ? '修改我的游后体验' : '把这次旅行留给下一个人') + '</h1>' +
      '<p class="page-sub">真实的强度和建议，比美图更能帮到下一位同学。发布后会出现在原行程与灵感首页。</p></div></div>' +
      '<div class="share-hero"><span class="share-hero-cover">' + cover(t.terrain, tripId) + '</span>' +
      '<span><b style="font-size:15.5px">' + esc(t.title) + '</b>' +
      '<span class="muted" style="display:block;font-size:12.5px">' + esc(t.destination) + ' · ' + esc(fmtRange(t.startDate, t.endDate)) + ' · ' + S.count(t.id) + ' 人同行</span></span>' +
      tripBadge(t) + '</div>' +
      '<div class="form-grid"><div class="form-main">' +
      '<section class="panel"><h3 class="panel-title">' + icon('spark') + '真实感受</h3>' +
      '<label class="field' + bad(errors, 'content') + '"><span class="label">这次路线实际走下来怎么样<span class="req">*</span><span class="counter">' + (d.content || '').length + '/400</span></span>' +
      '<textarea class="textarea" data-share="content" rows="6" maxlength="400" placeholder="路况、强度、时间点、意料之外的情况……写具体的事，比“很好玩”有用得多。">' + esc(d.content) + '</textarea>' +
      fieldErr(errors, 'content') + '</label></section>' +
      '<section class="panel"><h3 class="panel-title">' + icon('camera') + '照片（选填）</h3>' +
      '<div class="share-photos">' +
      photoGrid(d.photos) +
      '<div class="photo-note"><span>最多 6 张，单张不超过 5MB，支持 JPG / PNG / WebP。首图为封面缩略图。</span>' +
      '<span' + ((d.photos || []).length >= 6 ? ' class="over"' : '') + '>' + (d.photos || []).length + '/6</span></div>' +
      (errors.photos ? '<span class="photo-error">' + esc(errors.photos) + '</span>' : '') +
      '<div><button class="btn ghost sm" data-action="pick-photos" type="button">' + icon('plus') + '添加照片</button>' +
      '<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-share-photos hidden></div>' +
      '</div></section>' +
      '<section class="panel"><h3 class="panel-title">' + icon('route') + '路线强度</h3>' +
      '<div class="field' + bad(errors, 'intensity') + '"><div class="intensity-picker">' + ints + '</div>' + fieldErr(errors, 'intensity') +
      '<span class="hint">按你真实的体感选，不要按“应该很轻松”选。</span></div></section>' +
      '<section class="panel"><h3 class="panel-title">' + icon('info') + '给后来者的一条建议</h3>' +
      '<label class="field' + bad(errors, 'advice') + '"><span class="label">如果只能提醒一件事<span class="req">*</span></span>' +
      '<input class="input" data-share="advice" maxlength="120" value="' + esc(d.advice) + '" placeholder="例如：鞑子一定要抓地，普通跑鞋会滑。">' +
      fieldErr(errors, 'advice') + '</label>' +
      '<div class="form-actions" style="margin-top:18px">' +
      '<button class="btn primary" data-action="submit-share" data-id="' + tripId + '" type="button">' + icon('send') + (existing ? '保存修改' : '发布体验') + '</button>' +
      '<a class="btn ghost" href="#/trip/' + tripId + '">取消</a></div></section>' +
      '</div><aside class="form-side">' +
      '<section class="panel"><h3 class="panel-title">' + icon('compass') + '你的体验会去哪里</h3>' +
      '<ul class="safety-list">' +
      '<li>' + icon('route') + '<span>出现在《' + esc(t.title) + '》的详情页，和原路线放在一起。</span></li>' +
      '<li>' + icon('compass') + '<span>进入灵感首页的“旅行体验”列表，被还没决定去哪里的同学看到。</span></li>' +
      '<li>' + icon('copy') + '<span>别人可以点“参考此行程发布”，把它变成自己的新计划。</span></li>' +
      '</ul></section>' +
      '<section class="panel safety"><h3 class="panel-title">' + icon('shield') + '分享边界</h3>' +
      '<ul class="safety-list"><li>' + icon('check') + '<span>不要写入同行者的电话、学校班级或住宿地址。</span></li>' +
      '<li>' + icon('check') + '<span>只写你真实走过的部分，没走到的可以注明。</span></li></ul></section>' +
      '</aside></div>';
  }

  /* ---------------- S02 资料弹窗 ---------------- */
  function profileModal(userId) {
    var u = S.user(userId);
    if (!u) return '';
    var st = S.stats(userId);
    var isMe = userId === S.state.currentUserId;
    var shared = S.me().interests.filter(function (x) { return u.interests.indexOf(x) > -1; });
    return '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(u.nickname) + '的资料">' +
      '<div class="modal-head"><h2 class="modal-title">旅行者资料</h2>' +
      '<button class="icon-btn" data-action="close-overlay" type="button" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="modal-body"><div class="profile-top">' + avatar(u, 'xl') +
      '<span><span class="profile-name">' + esc(u.nickname) + (isMe ? ' <span class="badge dusk no-dot">这是你</span>' : '') + '</span>' +
      '<span class="profile-school" style="display:block">' + esc(u.school) + '</span>' +
      '<span class="muted" style="font-size:11.5px">加入于 ' + esc(relTime(u.joinedAt)) + '</span></span></div>' +
      '<p class="profile-bio">' + esc(u.bio) + '</p>' +
      '<div class="tc-tags" style="margin-top:14px">' + tags(u.interests, shared) + '</div>' +
      (shared.length && !isMe ? '<p class="hint" style="margin-top:8px">你们的共同兴趣：' + esc(shared.join('、')) + '</p>' : '') +
      '<div class="profile-stats">' +
      '<span class="profile-stat"><b>' + st.published + '</b><span>发布行程</span></span>' +
      '<span class="profile-stat"><b>' + st.completed + '</b><span>已完成</span></span>' +
      '<span class="profile-stat"><b>' + st.joined + '</b><span>参与同行</span></span>' +
      '<span class="profile-stat"><b>' + st.shared + '</b><span>游后分享</span></span>' +
      '</div>' +
      '<p class="privacy-note">' + icon('shield') + ' 平台只展示昵称、简介与旅行兴趣。电话、证件、精确住址和实时位置不会向任何人公开，包括已匹配的同行者。</p>' +
      '</div><div class="modal-foot">' +
      (isMe ? '' : '<button class="btn danger" data-action="report" data-type="user" data-id="' + u.id + '" data-label="' + esc(u.nickname) + '" type="button">' + icon('flag') + '举报这位用户</button>') +
      '<button class="btn ghost" data-action="close-overlay" type="button">关闭</button></div></div>';
  }

  /* ---------------- S09 申请处理抽屉 ---------------- */
  function appsDrawer(tripId, picked) {
    var t = S.trip(tripId);
    if (!t) return '';
    var apps = S.appsOf(tripId).slice().sort(function (a, b) {
      var rank = { PENDING: 0, ACCEPTED: 1, REJECTED: 2, CANCELLED: 3 };
      return rank[a.status] - rank[b.status] || b.createdAt - a.createdAt;
    });
    var pend = apps.filter(function (a) { return a.status === 'PENDING'; });
    var n = S.count(tripId);
    var left = Math.max(0, t.capacity - n);

    var bulk = pend.length ? '<div class="bulk-bar">' +
      '<button class="app-check' + (picked.length === pend.length && pend.length ? ' on' : '') + '" data-action="pick-all" type="button" aria-label="全选待处理申请">' + icon('check') + '</button>' +
      '<span>' + (picked.length ? '已选 ' + picked.length + ' 条' : '共 ' + pend.length + ' 条待处理') + '</span>' +
      '<button class="btn sm sea" data-action="bulk-accept" type="button"' + (picked.length ? '' : ' disabled') + '>' + icon('check') + '批量接受</button>' +
      '<button class="btn sm danger" data-action="bulk-reject" type="button"' + (picked.length ? '' : ' disabled') + '>' + icon('x') + '批量拒绝</button>' +
      '</div>' : '';

    var rows = apps.length ? apps.map(function (a) {
      var u = S.user(a.applicantId);
      var st = S.stats(u.id);
      var isPend = a.status === 'PENDING';
      var shared = t.tags.filter(function (x) { return u.interests.indexOf(x) > -1; });
      return '<article class="app-row' + (picked.indexOf(a.id) > -1 ? ' picked' : '') + '">' +
        (isPend ? '<button class="app-check' + (picked.indexOf(a.id) > -1 ? ' on' : '') + '" data-action="pick-app" data-id="' + a.id + '" type="button" aria-label="选择这条申请">' + icon('check') + '</button>' : '<span></span>') +
        '<div><div class="app-head">' + avatar(u, 'sm') +
        '<button class="app-name" data-action="profile" data-id="' + u.id + '" type="button" style="text-decoration:underline;text-decoration-color:var(--line-2);text-underline-offset:3px">' + esc(u.nickname) + '</button>' +
        appBadge(a) + '<span class="app-time">' + esc(relTime(a.createdAt)) + '</span></div>' +
        '<p class="app-msg">' + esc(a.message || '对方没有填写申请说明。') + '</p>' +
        '<div class="app-tags">' + tags(u.interests, shared) + '</div>' +
        '<p class="hint" style="margin-top:8px">' + esc(u.school) + ' · 发布 ' + st.published + ' · 完成 ' + st.completed + ' · 分享 ' + st.shared +
        (shared.length ? ' · 共同兴趣 ' + esc(shared.join('、')) : '') + '</p>' +
        (isPend ? '<div class="app-actions">' +
          '<button class="btn sm sea" data-action="accept-app" data-id="' + a.id + '" type="button"' + (left > 0 ? '' : ' disabled') + '>' + icon('check') + '接受同行</button>' +
          '<button class="btn sm danger" data-action="reject-app" data-id="' + a.id + '" type="button">' + icon('x') + '拒绝</button>' +
          '</div>' : (a.status === 'ACCEPTED' ? '<div class="app-actions"><a class="btn sm ghost" href="#/chat/' + tripId + '/' + u.id + '">' + icon('chat') + '进入聊天</a></div>' : '')) +
        '</div></article>';
    }).join('') : empty('还没有收到申请', '行程发布后会出现在灵感首页。把路线和日期写清楚，更容易被合适的人看到。', '', 'inbox');

    return '<aside class="drawer" role="dialog" aria-modal="true" aria-label="处理同行申请">' +
      '<div class="drawer-head"><div style="flex:1"><h2 class="drawer-title">同行申请</h2>' +
      '<p class="drawer-sub">' + esc(t.title) + '</p></div>' +
      '<button class="icon-btn" data-action="close-overlay" type="button" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="drawer-body">' +
      '<div class="fact-grid" style="margin-bottom:16px">' +
      '<div class="fact"><span>当前人数</span><b>' + n + ' / ' + t.capacity + '</b></div>' +
      '<div class="fact"><span>剩余名额</span><b>' + left + ' 人</b></div>' +
      '<div class="fact"><span>行程状态</span><b>' + D.TRIP_STATUS[t.status].label + '</b></div>' +
      '</div>' +
      (left === 0 && t.status !== 'COMPLETED' ? '<p class="action-note warn" style="margin-bottom:14px">' + icon('info') + ' 人数已满，系统已自动停止接受新申请。如需再招人，请先提高人数上限或等待有人退出。</p>' : '') +
      bulk + rows + '</div>' +
      '<div class="drawer-foot"><span class="hint grow">只有你可以处理这条行程的申请。接受后双方立即获得聊天权限。</span>' +
      '<button class="btn ghost" data-action="close-overlay" type="button">完成</button></div></aside>';
  }

  /* ---------------- 切换身份 ---------------- */
  function switchUserModal() {
    var cur = S.state.currentUserId;
    var rows = S.state.users.map(function (u) {
      var st = S.stats(u.id);
      var pend = S.hostPendingCount(u.id);
      return '<button class="companion" data-action="pick-user" data-id="' + u.id + '" type="button" style="width:100%;text-align:left;padding:12px">' +
        avatar(u, 'lg') + '<span style="flex:1;min-width:0"><span class="companion-name" style="font-size:14.5px">' + esc(u.nickname) +
        (u.id === cur ? ' <span class="badge dusk no-dot">当前</span>' : '') + '</span>' +
        '<span class="companion-role" style="display:block">' + esc(u.school) + ' · 发布 ' + st.published + ' · 同行 ' + st.joined + '</span></span>' +
        (pend ? '<span class="badge coral">' + pend + ' 待处理</span>' : '') + icon('right') + '</button>';
    }).join('');
    return '<div class="modal" role="dialog" aria-modal="true" aria-label="切换演示身份">' +
      '<div class="modal-head"><h2 class="modal-title">切换演示身份</h2>' +
      '<button class="icon-btn" data-action="close-overlay" type="button" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="modal-body"><p class="hint" style="margin-bottom:14px">三个预设账号共享同一套数据。用 A 发布、用 B 申请、再切回 A 接受，就能演示完整闭环。</p>' +
      '<div class="companions">' + rows + '</div></div>' +
      '<div class="modal-foot"><button class="btn danger" data-action="reset-data" type="button">' + icon('refresh') + '重置演示数据</button>' +
      '<button class="btn ghost" data-action="logout" type="button">' + icon('exit') + '回到身份选择页</button></div></div>';
  }

  /* ---------------- S14 举报 ---------------- */
  /* ---------------- 集合信息编辑 ---------------- */
  function meetingModal(tripId) {
    var t = S.trip(tripId);
    if (!t) return '';
    return '<div class="modal" role="dialog" aria-modal="true" aria-label="编辑集合信息">' +
      '<div class="modal-head"><h2 class="modal-title">编辑集合信息</h2>' +
      '<button class="icon-btn" data-action="close-overlay" type="button" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="modal-body"><label class="field"><span class="label">集合区域<span class="opt">选填</span></span>' +
      '<input class="input" data-meeting-area maxlength="100" value="' + esc(t.meetingArea || '') + '" placeholder="例如：香洲港公交站"></label>' +
      '<label class="field" style="margin-top:14px"><span class="label">集合时间<span class="opt">选填</span></span>' +
      '<input class="input" type="datetime-local" data-meeting-time value="' + esc(t.meetingTime || '') + '"></label>' +
      '<p class="hint" style="margin-top:14px">只改集合区域与集合时间；不晚于结束日期（' + esc(fmtDate(t.endDate)) + '）。</p>' +
      '</div><div class="modal-foot"><button class="btn ghost" data-action="close-overlay" type="button">取消</button>' +
      '<button class="btn primary" data-action="submit-meeting" data-id="' + t.id + '" type="button">' + icon('check') + '保存</button></div></div>';
  }

  function reportModal(type, id, label) {
    var reasons = type === 'user'
      ? ['骚扰或不当言论', '索要钱财或疑似诈骗', '资料不真实', '危险行为或挑战', '其他']
      : ['行程信息不真实', '存在安全风险', '广告或商业推广', '内容与旅行无关', '其他'];
    var opts = reasons.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join('');
    return '<div class="modal" role="dialog" aria-modal="true" aria-label="举报">' +
      '<div class="modal-head"><h2 class="modal-title">举报' + (type === 'user' ? '这位用户' : '这条行程') + '</h2>' +
      '<button class="icon-btn" data-action="close-overlay" type="button" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="modal-body"><p class="hint" style="margin-bottom:14px">举报对象：<b style="color:var(--ink)">' + esc(label) + '</b>。我们不会向对方透露你的身份。</p>' +
      '<label class="field"><span class="label">原因</span><select class="select" data-report-reason>' + opts + '</select></label>' +
      '<label class="field" style="margin-top:14px"><span class="label">补充说明<span class="opt">选填</span></span>' +
      '<textarea class="textarea" data-report-note rows="3" maxlength="200" placeholder="发生了什么？如果有时间、地点或原话会更有帮助。"></textarea></label>' +
      '<p class="privacy-note">' + icon('shield') + ' 如果你正处于危险中，请先联系当地警方或学校保卫处。平台举报不能替代紧急求助。</p>' +
      '</div><div class="modal-foot"><button class="btn ghost" data-action="close-overlay" type="button">取消</button>' +
      '<button class="btn danger" data-action="submit-report" data-type="' + type + '" data-id="' + id + '" type="button">' + icon('flag') + '提交举报</button></div></div>';
  }

  /* ---------------- 确认框 ---------------- */
  function confirmModal(cfg) {
    return '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(cfg.title) + '" style="max-width:440px">' +
      '<div class="modal-head"><h2 class="modal-title">' + esc(cfg.title) + '</h2></div>' +
      '<div class="modal-body"><p style="font-size:13.5px;line-height:1.7;color:var(--ink-2)">' + cfg.body + '</p></div>' +
      '<div class="modal-foot"><button class="btn ghost" data-action="close-overlay" type="button">再想想</button>' +
      '<button class="btn ' + (cfg.danger ? 'danger' : 'primary') + '" data-action="confirm-yes" type="button">' + esc(cfg.ok || '确定') + '</button></div></div>';
  }

  /* ---------------- 保存筛选 ---------------- */
  function saveViewModal(f) {
    var bits = [];
    if (f.destination) bits.push(f.destination);
    if (f.tags.length) bits.push(f.tags.join('/'));
    if (f.from || f.to) bits.push('日期区间');
    if (f.q) bits.push('“' + f.q + '”');
    var suggest = bits.length ? bits.join(' · ') : '全部行程';
    return '<div class="modal" role="dialog" aria-modal="true" aria-label="保存筛选" style="max-width:440px">' +
      '<div class="modal-head"><h2 class="modal-title">保存为常用筛选</h2>' +
      '<button class="icon-btn" data-action="close-overlay" type="button" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="modal-body"><p class="hint" style="margin-bottom:14px">当前的目的地、日期、兴趣与排序会一起保存，下次一键回到这组条件。</p>' +
      '<label class="field"><span class="label">名称</span><input class="input" data-view-name maxlength="20" value="' + esc(suggest) + '"></label>' +
      '</div><div class="modal-foot"><button class="btn ghost" data-action="close-overlay" type="button">取消</button>' +
      '<button class="btn primary" data-action="confirm-save-view" type="button">' + icon('bookmark') + '保存</button></div></div>';
  }

  /* ---------------- 演示脚本 ---------------- */
  var SCRIPT = [
    ['林见夏', '在灵感首页切到「旅行体验」，读到《珠海情侣路摄影一日游》的真实体验。', '#/discover'],
    ['林见夏', '点「参考此行程发布」，目的地与路线自动预填。', '#/discover'],
    ['林见夏', '重新选择日期与人数，发布自己的新计划。', '#/create'],
    ['陈屿', '切换身份，按「珠海 + 周末」筛选，看到共同兴趣是摄影。', '#/discover'],
    ['陈屿', '打开行程详情，查看匹配原因与发起人资料。', '#/mine'],
    ['陈屿', '填一句说明，提交同行申请。', '#/discover'],
    ['林见夏', '切回身份，在「我的旅行」里打开申请抽屉并接受。', '#/mine'],
    ['双方', '进入聊天，确认集合区域与时间。', '#/chat'],
    ['林见夏', '点「标记为已结束」模拟旅行完成，再由参加者发布体验。', '#/mine'],
    ['任何人', '回到灵感首页，新体验已出现在列表里，闭环成立。', '#/discover']
  ];
  function scriptDrawer() {
    var steps = SCRIPT.map(function (s, i) {
      return '<div class="script-step"><span class="script-no">' + (i + 1) + '</span>' +
        '<p class="script-text"><span class="who">' + esc(s[0]) + '</span>' + esc(s[1]) +
        ' <a href="' + s[2] + '" data-action="close-overlay" style="color:var(--t-lagoon);font-weight:650;white-space:nowrap">前往 →</a></p></div>';
    }).join('');
    return '<aside class="drawer" role="dialog" aria-modal="true" aria-label="演示脚本">' +
      '<div class="drawer-head"><div style="flex:1"><h2 class="drawer-title">完整闭环演示脚本</h2>' +
      '<p class="drawer-sub">10 步走完「灵感 → 发布 → 连接 → 同行 → 分享 → 新灵感」</p></div>' +
      '<button class="icon-btn" data-action="close-overlay" type="button" aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="drawer-body">' + steps +
      '<p class="privacy-note" style="margin-top:18px">' + icon('info') + ' 旅行结束用「标记为已结束」模拟，不需要真的等到日期。所有数据保存在本机浏览器，可随时重置重来。</p>' +
      '</div><div class="drawer-foot"><button class="btn ghost grow" data-action="close-overlay" type="button">开始演示</button></div></aside>';
  }

  global.UI = {
    esc: esc, fmtDate: fmtDate, fmtWeek: fmtWeek, fmtRange: fmtRange, dayLabel: dayLabel,
    fmtClock: fmtClock, fmtStamp: fmtStamp, relTime: relTime, budgetText: budgetText,
    icon: icon, avatar: avatar, tripBadge: tripBadge, appBadge: appBadge, tags: tags,
    cover: cover, matchBlock: matchBlock, tripCard: tripCard, expCard: expCard, empty: empty,
    gate: gate, nav: nav, userChip: userChip, discover: discover,
    detail: detail, tripForm: tripForm, previewCard: previewCard, safetyPanel: safetyPanel,
    mine: mine, chat: chat, share: share, profileModal: profileModal, appsDrawer: appsDrawer,
    meetingModal: meetingModal,
    switchUserModal: switchUserModal, reportModal: reportModal, confirmModal: confirmModal,
    saveViewModal: saveViewModal, scriptDrawer: scriptDrawer
  };
})(window);
