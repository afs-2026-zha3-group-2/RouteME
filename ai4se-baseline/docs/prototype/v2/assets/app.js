/* ==========================================================================
   RouteMe 路觅 · 原型图 v2 — 屏内应用渲染
   六屏共用一套侧栏与令牌，每屏返回完整 HTML 字符串；board.js 负责缩放与放大层。
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.V2;

  /* ---------------------------------------------------------------- 图标 */
  var ICONS = {
    compass: '<circle cx="10" cy="10" r="7"/><path d="M12.9 7.1 11.4 11.4 7.1 12.9l1.5-4.3z"/>',
    map: '<path d="M10 2.6c2.8 0 5 2.2 5 5 0 3.6-5 9.8-5 9.8S5 11.2 5 7.6c0-2.8 2.2-5 5-5Z"/><circle cx="10" cy="7.6" r="1.9"/>',
    plus: '<path d="M10 4.6v10.8M4.6 10h10.8"/>',
    sparkle: '<path d="M9.2 3.2l1.4 3.8 3.8 1.4-3.8 1.4L9.2 13.6 7.8 9.8 4 8.4l3.8-1.4z"/><path d="M15.2 13.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>',
    bag: '<path d="M4.6 7.2h10.8v8.4H4.6z"/><path d="M7.4 7.2V5.8A2.6 2.6 0 0 1 10 3.2a2.6 2.6 0 0 1 2.6 2.6v1.4"/>',
    chat: '<path d="M3.4 6.2A2.8 2.8 0 0 1 6.2 3.4h7.6a2.8 2.8 0 0 1 2.8 2.8v5a2.8 2.8 0 0 1-2.8 2.8H8.6L4.8 17v-3.2"/><path d="M7 7.6h6M7 10.4h3.8"/>',
    heart: '<path d="M10 16.2S3.8 12.4 3.8 8.6A3.3 3.3 0 0 1 10 6.8a3.3 3.3 0 0 1 6.2 1.8c0 3.8-6.2 7.6-6.2 7.6Z"/>',
    help: '<circle cx="10" cy="10" r="7"/><path d="M8.1 8a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.7.6-.7 1.1v.3"/><circle cx="10" cy="14" r=".85" fill="currentColor" stroke="none"/>',
    search: '<circle cx="8.8" cy="8.8" r="5"/><path d="M12.6 12.6 16.4 16.4"/>',
    bell: '<path d="M6.2 8.6a3.8 3.8 0 0 1 7.6 0v2.8l1.4 2.2H4.8l1.4-2.2z"/><path d="M8.6 15.2a1.6 1.6 0 0 0 2.8 0"/>',
    moon: '<path d="M15.4 12.2A5.6 5.6 0 0 1 7.8 4.6a5.7 5.7 0 1 0 7.6 7.6Z"/>',
    cal: '<rect x="3.6" y="4.8" width="12.8" height="11.6" rx="2.2"/><path d="M3.6 8.4h12.8M7 3.4v2.6M13 3.4v2.6"/>',
    pin: '<path d="M10 17.2s5.2-5.6 5.2-9a5.2 5.2 0 0 0-10.4 0c0 3.4 5.2 9 5.2 9Z"/><circle cx="10" cy="8.2" r="1.8"/>',
    users: '<circle cx="7.6" cy="7.4" r="2.6"/><path d="M3.2 16.4c0-2.4 2-4.2 4.4-4.2s4.4 1.8 4.4 4.2"/><path d="M13.4 5.2a2.4 2.4 0 0 1 0 4.4M14.4 12.4c1.6.4 2.7 1.9 2.7 3.8"/>',
    chev: '<path d="M7.8 4.8 13 10l-5.2 5.2"/>',
    chevD: '<path d="M4.8 7.8 10 13l5.2-5.2"/>',
    more: '<circle cx="4.6" cy="10" r="1.15" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="1.15" fill="currentColor" stroke="none"/><circle cx="15.4" cy="10" r="1.15" fill="currentColor" stroke="none"/>',
    edit: '<path d="M4 16h3.2l8-8a2.26 2.26 0 0 0-3.2-3.2l-8 8z"/><path d="M11.2 5.6 14.4 8.8"/>',
    send: '<path d="M17 3.4 9.1 11.3M17 3.4l-4.7 13.4-3.2-5.5-5.5-3.2z"/>',
    smile: '<circle cx="10" cy="10" r="7"/><path d="M7.2 11.8a3.4 3.4 0 0 0 5.6 0"/><circle cx="7.8" cy="8.2" r=".8" fill="currentColor" stroke="none"/><circle cx="12.2" cy="8.2" r=".8" fill="currentColor" stroke="none"/>',
    image: '<rect x="3.6" y="4.8" width="12.8" height="10.4" rx="2.2"/><path d="M3.6 12.6 7.4 9l3 2.8 2.2-1.8 3.8 3.2"/><circle cx="12.6" cy="8" r="1"/>',
    mic: '<rect x="8" y="3.4" width="4" height="8.2" rx="2"/><path d="M5.4 9.6a4.6 4.6 0 0 0 9.2 0M10 14.2v2.4"/>',
    minus: '<path d="M4.6 10h10.8"/>',
    locate: '<circle cx="10" cy="10" r="3"/><path d="M10 2.4v2.6M10 15v2.6M2.4 10h2.6M15 10h2.6"/>',
    layers: '<path d="M10 3.4 16.6 7 10 10.6 3.4 7z"/><path d="M3.4 10.6 10 14.2l6.6-3.6"/><path d="M3.4 13.8 10 17.4l6.6-3.6"/>',
    check: '<path d="M4.4 10.4 8.2 14l7.4-8"/>',
    close: '<path d="M5.4 5.4 14.6 14.6M14.6 5.4 5.4 14.6"/>',
    arrow: '<path d="M4.6 10h10.4M11 5.8 15.2 10 11 14.2"/>',
    expand: '<path d="M7.6 3.6h-4v4M12.4 3.6h4v4M12.4 16.4h4v-4M7.6 16.4h-4v-4"/>',
    island: '<path d="M3.4 15.6c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2"/><path d="M10 12.6V6.4"/><path d="M10 6.4c2.4-1.6 5-1 5.6.8M10 8.4c-2.2-1.4-4.6-.8-5.2.8"/>',
    city: '<path d="M3.6 16.4V9.2h3.6v7.2M7.2 16.4V5.4h4.4v11M11.6 16.4v-5.2h4.8v5.2"/><path d="M3.2 16.4h13.6"/>',
    food: '<path d="M4.2 9.6h11.6a5.8 5.8 0 0 1-5.8 5.6 5.8 5.8 0 0 1-5.8-5.6Z"/><path d="M3.4 16.6h13.2M14.6 4.4l1.8-1.6"/>',
    hike: '<path d="M2.6 16.4 8 6.2l3.2 6 2-3.2 4.2 7.4z"/><path d="M8 6.2 9.4 5l1.6 1.2"/>',
    drive: '<path d="M4 12.6h12v3.2H4zM5.4 12.6 6.8 8h6.4l1.4 4.6"/><circle cx="6.4" cy="15.8" r="1.2"/><circle cx="13.6" cy="15.8" r="1.2"/>',
    culture: '<path d="M3.6 8.2 10 4l6.4 4.2"/><path d="M5.4 8.6v6.4M9 8.6v6.4M11 8.6v6.4M14.6 8.6v6.4M3.6 15.4h12.8"/>',
    family: '<circle cx="7" cy="6.6" r="2.2"/><circle cx="13.4" cy="7.4" r="1.8"/><path d="M2.8 16c0-2.4 1.9-4.2 4.2-4.2s4.2 1.8 4.2 4.2"/><path d="M12 11.8c1.9.1 3.4 1.7 3.4 4.2"/>',
    grid: '<circle cx="6.4" cy="6.4" r="1.5"/><circle cx="13.6" cy="6.4" r="1.5"/><circle cx="6.4" cy="13.6" r="1.5"/><circle cx="13.6" cy="13.6" r="1.5"/>',
    bow: '<path d="M3.6 5.2c3.6 2.4 9.2 2.4 12.8 0 0 6.4-3.6 9.6-6.4 9.6S3.6 11.6 3.6 5.2Z"/>'
  };

  function ic(name, cls) {
    var d = ICONS[name] || '';
    return '<svg class="icn' + (cls ? ' ' + cls : '') + '" viewBox="0 0 20 20" fill="none" stroke="currentColor"'
      + ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  /* ------------------------------------------------------------- 占位配图
     原型不联网：用分层渐变 + 少量几何形状捏出“照片感”的取景，
     换真实图片时只需把 .art 的 svg 替换成 <img>。 */
  var seq = 0;
  var ART = {
    bay: function (g) {
      return '<defs><linearGradient id="s' + g + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#c9e4f3"/><stop offset=".55" stop-color="#e9f2f0"/><stop offset="1" stop-color="#f7efdf"/></linearGradient>'
        + '<linearGradient id="w' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ed0d8"/><stop offset="1" stop-color="#4c97a4"/></linearGradient></defs>'
        + '<rect width="120" height="70" fill="url(#s' + g + ')"/>'
        + '<circle cx="92" cy="19" r="7" fill="#ffe9b8" opacity=".85"/>'
        + '<path d="M0 43 18 33 34 40 52 31 72 41 90 34 120 42V46H0Z" fill="#a9c6cf" opacity=".78"/>'
        + '<rect y="46" width="120" height="24" fill="url(#w' + g + ')"/>'
        + '<path d="M0 52h120M0 58h120M0 64h120" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>'
        + '<path d="M66 46V31l11 15z" fill="#fff" opacity=".88"/><path d="M62 46h19l-2.6 3.4H64.6z" fill="#33626d"/>'
        + '<circle cx="20" cy="56" r="7" fill="#3f8b7d" opacity=".5"/>';
    },
    dusk: function (g) {
      return '<defs><linearGradient id="s' + g + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#f6b98d"/><stop offset=".48" stop-color="#f9d9bb"/><stop offset="1" stop-color="#fdeade"/></linearGradient>'
        + '<linearGradient id="w' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8a887"/><stop offset=".5" stop-color="#b9799b"/><stop offset="1" stop-color="#6a5a86"/></linearGradient></defs>'
        + '<rect width="120" height="70" fill="url(#s' + g + ')"/>'
        + '<circle cx="76" cy="34" r="8" fill="#fff2c6" opacity=".95"/>'
        + '<path d="M0 40 22 32 40 38 62 28 84 38 104 31 120 38V43H0Z" fill="#b98d9b" opacity=".72"/>'
        + '<rect y="43" width="120" height="27" fill="url(#w' + g + ')"/>'
        + '<path d="M0 48h120M0 54h120M0 61h120" stroke="#fff" stroke-opacity=".18" stroke-width="1"/>'
        + '<path d="M58 43V28l11 15z" fill="#33324a" opacity=".8"/><path d="M54 43h18l-2.4 3H56.4z" fill="#2c2b40"/>'
        + '<path d="M0 70 120 47 120 51 0 70Z" fill="#43394f" opacity=".35"/>';
    },
    city: function (g) {
      return '<defs><linearGradient id="s' + g + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#8fb8dc"/><stop offset=".5" stop-color="#cfd9e6"/><stop offset="1" stop-color="#f3ddc9"/></linearGradient>'
        + '<linearGradient id="w' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9db7cb"/><stop offset="1" stop-color="#4f6b86"/></linearGradient></defs>'
        + '<rect width="120" height="70" fill="url(#s' + g + ')"/>'
        + '<circle cx="34" cy="26" r="9" fill="#fff0cf" opacity=".7"/>'
        + '<path d="M0 46V26h7v20M9 46V17h8v29M20 46V31h6v15M29 46V12h9v34M41 46V22h7v24M51 46V29h5v17M59 46V16h10v30M72 46V26h6v20M80 46V9h8v37M91 46V24h7v22M100 46V30h6v16M108 46V18h12v28Z" fill="#7d94ad" opacity=".55"/>'
        + '<rect y="46" width="120" height="24" fill="url(#w' + g + ')"/>'
        + '<path d="M0 51h120M0 57h120M0 63h120" stroke="#fff" stroke-opacity=".2" stroke-width="1"/>'
        + '<path d="M0 70V58h120v12Z" fill="#2f4459" opacity=".28"/>';
    },
    food: function (g) {
      return '<defs><linearGradient id="s' + g + '" x1="0" y1="0" x2="1" y2="1">'
        + '<stop offset="0" stop-color="#f9e7cf"/><stop offset="1" stop-color="#eccfa9"/></linearGradient></defs>'
        + '<rect width="120" height="70" fill="url(#s' + g + ')"/>'
        + '<circle cx="42" cy="34" r="17" fill="#fffdf8" opacity=".95"/><circle cx="42" cy="34" r="11" fill="#f2c98c"/>'
        + '<circle cx="39" cy="31" r="3.4" fill="#c9752f"/><circle cx="46" cy="37" r="2.8" fill="#8fa35a"/><circle cx="44" cy="28" r="2" fill="#d9a13f"/>'
        + '<circle cx="84" cy="42" r="12" fill="#fffdf8" opacity=".92"/><circle cx="84" cy="42" r="7.4" fill="#e6a86a"/>'
        + '<circle cx="84" cy="42" r="2.6" fill="#b3562c"/>'
        + '<path d="M14 16 34 52" stroke="#8a6b4a" stroke-width="1.6" opacity=".55"/><path d="M18 14 38 50" stroke="#8a6b4a" stroke-width="1.6" opacity=".55"/>'
        + '<path d="M100 14c4 6 4 10 0 16" stroke="#8fa35a" stroke-width="1.5" fill="none" opacity=".7"/>'
        + '<circle cx="26" cy="14" r="1.6" fill="#d99a5b" opacity=".8"/><circle cx="104" cy="52" r="2" fill="#cfa468" opacity=".8"/>';
    },
    mountain: function (g) {
      return '<defs><linearGradient id="s' + g + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#cfe3ea"/><stop offset="1" stop-color="#eaf1e8"/></linearGradient>'
        + '<linearGradient id="m' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fa47f"/><stop offset="1" stop-color="#2f6b4c"/></linearGradient></defs>'
        + '<rect width="120" height="70" fill="url(#s' + g + ')"/>'
        + '<path d="M0 44 26 20 44 36 60 24 82 44 100 32 120 46V70H0Z" fill="#bcd3c6" opacity=".8"/>'
        + '<path d="M0 70V52 40L22 26 40 44 62 32 84 50 102 40 120 52V70Z" fill="url(#m' + g + ')"/>'
        + '<path d="M0 56h120" stroke="#fff" stroke-opacity=".22" stroke-width="6"/>'
        + '<path d="M52 70c2-8 6-12 10-14" stroke="#f4f8f2" stroke-width="1.5" fill="none" opacity=".55"/>';
    },
    island: function (g) {
      return '<defs><linearGradient id="s' + g + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#bfe2f0"/><stop offset="1" stop-color="#e7f4f2"/></linearGradient>'
        + '<linearGradient id="w' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd0cf"/><stop offset="1" stop-color="#2b8fa3"/></linearGradient></defs>'
        + '<rect width="120" height="70" fill="url(#s' + g + ')"/>'
        + '<circle cx="26" cy="17" r="6.4" fill="#fff2cb" opacity=".85"/>'
        + '<rect y="42" width="120" height="28" fill="url(#w' + g + ')"/>'
        + '<path d="M62 42c6-10 14-14 22-16-2 8 2 12 6 16z" fill="#4e8b62"/>'
        + '<path d="M0 48h120M0 54h120M0 61h120" stroke="#fff" stroke-opacity=".24" stroke-width="1"/>'
        + '<path d="M30 56h14l-2.4 3.2H32.2z" fill="#fff" opacity=".85"/><path d="M37 56V47l4 9z" fill="#fff" opacity=".7"/>'
        + '<circle cx="96" cy="52" r="1.4" fill="#fff" opacity=".8"/><circle cx="88" cy="60" r="1.1" fill="#fff" opacity=".7"/>';
    },
    coast: function (g) {
      return '<defs><linearGradient id="s' + g + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="#b6dcee"/><stop offset="1" stop-color="#e6f2ee"/></linearGradient>'
        + '<linearGradient id="w' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc3c5"/><stop offset="1" stop-color="#1f7f8c"/></linearGradient></defs>'
        + '<rect width="120" height="70" fill="url(#s' + g + ')"/>'
        + '<path d="M0 40 30 26 58 38 86 24 120 40V46H0Z" fill="#a8c4cc" opacity=".7"/>'
        + '<rect y="42" width="120" height="28" fill="url(#w' + g + ')"/>'
        + '<path d="M0 48c14 4 26-4 40 0s26 4 40 0 26-4 40 0" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none"/>'
        + '<path d="M0 70V56l16-6 12 6 14-4v18z" fill="#3f4f5b" opacity=".7"/>'
        + '<path d="M74 70V60l10-4 12 5v9z" fill="#3f4f5b" opacity=".55"/>';
    }
  };

  function art(kind) {
    var id = 'g' + (++seq);
    var fn = ART[kind] || ART.bay;
    return '<svg class="art" viewBox="0 0 120 70" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      + fn(id) + '</svg>';
  }

  /* ------------------------------------------------------------- 侧栏 / 顶栏 */
  function navItem(key, label, icon, active, badge) {
    return '<a class="ap-navitem' + (key === active ? ' on' : '') + '" href="#" data-go="' + key + '"'
      + (key === active ? ' aria-current="page"' : '') + '>' + ic(icon) + '<span>' + label + '</span>'
      + (badge ? '<span class="ap-badge">' + badge + '</span>' : '') + '</a>';
  }

  function sidebar(active) {
    return '<aside class="ap-side">'
      + '<div class="ap-brand">'
      + '<span class="ap-mark">' + ic('bow') + '</span>'
      + '<span><b>RouteMe</b><i>路觅 · 遇见更大的世界</i></span>'
      + '</div>'
      + '<div class="ap-slabel">搜索</div>'
      + '<div class="ap-search">' + ic('search') + '<span>搜索行程、同行者</span></div>'
      + '<div class="ap-group">规划</div>'
      + '<nav class="ap-nav">'
      + navItem('discover', '旅行灵感', 'compass', active)
      + navItem('map', '旅行地图', 'map', active)
      + navItem('create', '发布行程', 'plus', active)
      + navItem('ai', 'AI 规划', 'sparkle', active)
      + '</nav>'
      + '<div class="ap-group">我的</div>'
      + '<nav class="ap-nav">'
      + navItem('mine', '我的旅行', 'bag', active)
      + navItem('chat', '同行消息', 'chat', active, 2)
      + navItem('fav', '收藏喜欢', 'heart', active)
      + navItem('help', '帮助与反馈', 'help', active)
      + '</nav>'
      + '<div class="ap-side-foot">'
      + '<div class="ap-user">'
      + avatar('lin', 'sm')
      + '<span><b>林见夏</b><span>去看更大的世界</span></span>'
      + '</div></div></aside>';
  }

  function avatar(key, size) {
    var u = D.USERS[key] || D.USERS.lin;
    return '<span class="av' + (size ? ' ' + size : '') + '" style="--a1:' + u.a1 + ';--a2:' + u.a2 + '" aria-hidden="true">' + u.ini + '</span>';
  }

  function topbar(withBell) {
    return '<div class="ap-top">'
      + '<button class="ico" type="button" title="深色模式">' + ic('moon') + '</button>'
      + (withBell ? '<button class="ico" type="button" title="通知">' + ic('bell') + '</button>' : '')
      + '<button class="ico" type="button" title="林见夏">' + avatar('lin', 'sm') + '</button>'
      + '</div>';
  }

  /* ------------------------------------------------------------- 行程卡 */
  function tripCard(t) {
    var u = D.USERS[t.host];
    return '<article class="tc">'
      + '<div class="tc-art">' + art(t.art)
      + '<span class="tc-people">' + ic('users') + t.people + '</span>'
      + '<button class="tc-like" type="button" data-like title="收藏">' + ic('heart') + '</button>'
      + '</div>'
      + '<div class="tc-b">'
      + '<h4>' + t.title + '</h4>'
      + '<span class="tc-meta">' + ic('cal') + t.dates + '</span>'
      + '<span class="tc-meta">' + ic('pin') + t.city + '</span>'
      + '<div class="tc-foot">' + avatar(t.host, 'sm') + '<b>' + u.name + '</b>'
      + '<span class="lk">' + ic('heart') + t.likes + '</span></div>'
      + '</div></article>';
  }

  /* ------------------------------------------------------------- S1 灵感 */
  function screenDiscover() {
    return '<div class="d-hero">'
      + '<div class="d-hero-art">' + art('city') + '</div>'
      + '<div class="d-hero-veil"></div>'
      + '<div class="d-hero-in">'
      + '<h2>出发吧，<br>去遇见更大的世界</h2>'
      + '<div class="d-hero-search">' + ic('search') + '<span>搜索目的地、景点或用户</span>'
      + '<span class="d-hero-go">' + ic('chev') + '</span></div>'
      + '</div></div>'
      + '<div class="d-cats">'
      + D.CATEGORIES.map(function (c) {
        return '<a class="d-cat" href="#" style="--c:' + c.c + ';--ci:' + c.ci + '"><i>' + ic(c.icon) + '</i>' + c.label + '</a>';
      }).join('')
      + '</div>'
      + '<div class="sec"><h3>为你推荐</h3><span class="sub">按你的偏好与同行记录</span>'
      + '<a class="more" href="#">查看更多' + ic('chev') + '</a></div>'
      + '<div class="d-grid">' + D.TRIPS.slice(0, 3).map(tripCard).join('') + '</div>'
      + '<div class="d-banner">'
      + '<div><b>让有趣的人，走进你的旅程</b><p>探索世界，也找到同行的伙伴</p></div>'
      + '<span class="go btn teal sm">发布一条行程' + ic('arrow') + '</span>'
      + '</div>'
      + '<div class="sec"><h3>热门城市</h3><span class="sub">周末两天就能出发</span></div>'
      + '<div class="d-city">'
      + [['珠海', 46], ['广州', 38], ['深圳', 52], ['佛山', 27], ['惠州', 19], ['肇庆', 12], ['江门', 9], ['中山', 8]]
        .map(function (c) { return '<span>' + c[0] + '<b class="n">' + c[1] + '</b></span>'; }).join('')
      + '</div>'
      + '<div class="sec"><h3>附近正在招募</h3><span class="sub">珠海市 · 本周</span>'
      + '<a class="more" href="#">全部' + ic('chev') + '</a></div>'
      + '<div class="d-grid">' + D.TRIPS.slice(3, 6).map(tripCard).join('') + '</div>'
      + '<div class="d-foot"><span>已经到底啦 · 换一批灵感</span>'
      + '<button class="btn sm ghost" type="button">换一批' + ic('arrow') + '</button></div>';
  }

  /* ------------------------------------------------------------- S2 地图 */
  const MAP_SVG = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
    + '<defs><linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#dcecef"/><stop offset="1" stop-color="#cbe4e6"/></linearGradient></defs>'
    + '<rect width="100" height="100" fill="url(#sea)"/>'
    + '<path d="M0 0h58c-2 8 4 12 2 19-3 9-12 12-10 22 2 9-6 15-4 24 1 7-4 12-2 20 1 5-2 9-5 15H0Z" fill="#eef4ec"/>'
    + '<path d="M58 0h42v34c-6 3-13 1-18 5-6 5-15 2-20 7-4 4-4-9-4-14Z" fill="#eaf3ea"/>'
    + '<path d="M76 66c8-4 16 1 24-2v36H62c2-9 8-14 8-20 0-6 3-11 6-14Z" fill="#e9f2ea"/>'
    + '<path d="M0 62c10-3 16 4 24 2s10 6 18 5" stroke="#fff" stroke-width="1.6" fill="none" opacity=".9"/>'
    + '<path d="M8 20c12 6 20 3 28 10s14 4 22 10" stroke="#fff" stroke-width="1.3" fill="none" opacity=".8"/>'
    + '<path d="M4 84c14-6 22 2 32-4s16 6 26 0 18-6 34-4" stroke="#fff" stroke-width="1.3" fill="none" opacity=".7"/>'
    + '<path d="M40 100c2-10 10-14 10-22" stroke="#f7d9a8" stroke-width="1.5" fill="none" opacity=".9"/>'
    + '<path d="M62 34 100 30" stroke="#8fb8c4" stroke-width="2.2" opacity=".85"/>'
    + '<circle cx="61" cy="34" r=".9" fill="#4d7c88"/><circle cx="72" cy="33" r=".9" fill="#4d7c88"/>'
    + '<circle cx="84" cy="31.6" r=".9" fill="#4d7c88"/>'
    + '<path d="M14 46c4-3 8 0 12-2" stroke="#cfd9cd" stroke-width=".7" fill="none"/>'
    + '<path d="M20 74c6-2 10 2 16 0" stroke="#cfd9cd" stroke-width=".7" fill="none"/>'
    + '</svg>';

  function screenMap() {
    var chips = ['全部', '美食', '景点', '徒步', '城市', '海岛', '自驾', '文化'];
    return '<div class="m-search">' + ic('search') + '<span>搜索目的地、景点或路线</span><kbd>/</kbd></div>'
      + '<div class="m-chips">' + chips.map(function (c, i) {
        return '<button class="chip' + (i === 0 ? ' on' : '') + '" type="button" data-chip>' + c + '</button>';
      }).join('') + '</div>'
      + '<div class="m-wrap">'
      + '<div class="m-canvas">' + MAP_SVG + '</div>'
      + '<span class="m-label" style="left:31%;top:14%">唐家湾</span>'
      + '<span class="m-label" style="left:47%;top:47%">香洲区</span>'
      + '<span class="m-label sm" style="left:58%;top:23%">淇澳岛</span>'
      + '<span class="m-label" style="left:66%;top:70%">珠海市</span>'
      + '<span class="m-label sm" style="left:86%;top:24%">澳门</span>'
      + '<span class="m-label sm" style="left:80%;top:44%">港珠澳大桥</span>'
      + '<span class="m-label sm" style="left:24%;top:88%">珠海金湾机场</span>'
      + D.MAP_POINTS.map(function (p, i) {
        return '<span class="m-pin ' + (i === 1 ? 'ripple ' : '') + p.kind + '" style="left:' + p.x + '%;top:' + p.y + '%">' + p.no + '</span>';
      }).join('')
      + '<div class="m-pop">'
      + '<div class="m-pop-art">' + art('bay') + '</div>'
      + '<div class="m-pop-b"><b>珠海日月贝</b><span>城市地标 · 情侣路</span>'
      + '<button class="btn sm ghost" type="button">查看详情' + ic('chev') + '</button></div>'
      + '</div>'
      + '<div class="m-ctrl">'
      + '<button type="button" title="放大">' + ic('plus') + '</button>'
      + '<button type="button" title="缩小">' + ic('minus') + '</button>'
      + '<button type="button" title="定位">' + ic('locate') + '</button>'
      + '<button type="button" title="图层">' + ic('layers') + '</button>'
      + '</div>'
      + '<div class="m-legend">'
      + '<span><i style="background:#1aa79b"></i>行程集合</span>'
      + '<span><i style="background:#ff6f4d"></i>热门点位</span>'
      + '<span><i style="background:#f0a020"></i>我的行程</span>'
      + '</div>'
      + '</div>'
      + '<div class="sec"><h3>附近的行程 · 珠海市</h3><span class="sub">3 条正在招募</span>'
      + '<a class="more" href="#">查看更多' + ic('chev') + '</a></div>'
      + '<div class="d-grid">' + [D.TRIPS[3], D.TRIPS[4], D.TRIPS[5]].map(tripCard).join('') + '</div>'
      + '<div class="d-grid" style="margin-top:12px">' + [D.TRIPS[0], D.TRIPS[1], D.TRIPS[2]].map(tripCard).join('') + '</div>';
  }

  /* ------------------------------------------------------------- S3 发布 */
  function screenCreate() {
    var field = function (label, req, inner) {
      return '<div class="c-field"><span class="c-label">' + label + (req ? '<i>*</i>' : '') + '</span>' + inner + '</div>';
    };
    return '<div class="c-head"><h2>发布一条想走的路</h2>'
      + '<p>写清目的地、日期和路线，找到愿意同路的人 <span class="tip">' + ic('sparkle') + '让旅行不再是一个人</span></p></div>'
      + '<section class="c-step">'
      + '<div class="c-step-h"><span class="c-num">1</span>'
      + '<span><b>基本信息</b><span>简单描述你的旅程，让更多志同道合的人看到</span></span></div>'
      + '<div class="c-field"><span class="c-label">标题<i>*</i><span class="count">14/40</span></span>'
      + '<div class="c-input"><input value="珠海海岸一日游 · 美食与日落" aria-label="行程标题"></div></div>'
      + '<div class="c-row">'
      + '<div class="c-field"><span class="c-label">目的地<i>*</i></span>'
      + '<div class="c-input">' + ic('pin') + '<span>珠海市</span><span class="caret">' + ic('chevD') + '</span></div></div>'
      + '<div class="c-field"><span class="c-label">出发日期<i>*</i></span>'
      + '<div class="c-input">' + ic('cal') + '<span>2026-11-19</span></div></div>'
      + '<div class="c-field"><span class="c-label">结束日期<i>*</i></span>'
      + '<div class="c-input">' + ic('cal') + '<span>2026-11-19</span></div></div>'
      + '</div></section>'
      + '<section class="c-step">'
      + '<div class="c-step-h"><span class="c-num">2</span>'
      + '<span><b>路线规划</b><span>最多添加两个途经点，或让 AI 帮你推荐一条</span></span>'
      + '<button class="c-ai spacer" type="button" data-ai-route>' + ic('sparkle') + 'AI 帮我规划路线</button></div>'
      + field('搜索地点名称，或在地图上直接选择', false,
        '<div class="c-input">' + ic('search') + '<span class="ph">搜索地点名称，例如「日月贝」</span></div>')
      + '<div class="c-stops">'
      + D.ROUTE_STOPS.map(function (s, i) {
        return '<span class="c-stop"><i class="n">' + (i + 1) + '</i>' + s + '<span class="x">' + ic('close') + '</span></span>';
      }).join('')
      + '<button class="c-stop add" type="button">' + ic('plus') + '添加途经点</button>'
      + '</div>'
      + '<div class="c-map">'
      + '<div class="m-canvas">' + MAP_SVG + '</div>'
      + '<span class="m-label sm" style="left:30%;top:12%">香洲区</span>'
      + '<span class="m-label sm" style="left:78%;top:18%">日月贝</span>'
      + '<span class="m-label sm" style="left:24%;top:78%">情侣路</span>'
      + '<span class="m-label sm" style="left:88%;top:78%">珠海渔女</span>'
      + '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">'
      + '<polyline points="18,88 40,66 58,44 70,20" fill="none" stroke="#1aa79b" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="3 2.2" opacity=".95"/>'
      + '</svg>'
      + '<div class="c-way" style="left:18%;top:88%"><span class="dot">1</span><span class="nm">太子庙广场</span></div>'
      + '<div class="c-way" style="left:40%;top:66%"><span class="dot">2</span><span class="nm">顺河路南 130 号</span></div>'
      + '<div class="c-way" style="left:58%;top:44%"><span class="dot">3</span><span class="nm">鹏泰产业园</span></div>'
      + '<div class="c-way end" style="left:70%;top:20%"><span class="dot">4</span><span class="nm">日月贝 · 终点</span></div>'
      + '<div class="m-ctrl">'
      + '<button type="button">' + ic('plus') + '</button><button type="button">' + ic('minus') + '</button>'
      + '<button type="button">' + ic('locate') + '</button>'
      + '</div></div></section>'
      + '<section class="c-step">'
      + '<div class="c-step-h"><span class="c-num">3</span>'
      + '<span><b>同行设置</b><span>决定谁可以加入，以及出发前的联系方式</span></span></div>'
      + '<div class="c-row">'
      + '<div class="c-field"><span class="c-label">同行人数<i>*</i></span>'
      + '<div class="c-input"><span>2 - 4 人</span><span class="caret">' + ic('chevD') + '</span></div></div>'
      + '<div class="c-field"><span class="c-label">强度</span>'
      + '<div class="c-input">' + ic('hike') + '<span>轻松 · 边走边拍</span><span class="caret">' + ic('chevD') + '</span></div></div>'
      + '<div class="c-field"><span class="c-label">费用方式</span>'
      + '<div class="c-input"><span>AA 制</span><span class="caret">' + ic('chevD') + '</span></div></div>'
      + '</div>'
      + '<div class="c-stops" style="margin-top:12px">'
      + ['日落', '拍照', '美食', 'citywalk'].map(function (t, i) {
        return '<button class="chip' + (i < 3 ? ' on' : '') + '" type="button" data-chip>' + t + '</button>';
      }).join('')
      + '</div></section>'
      + '<section class="c-step">'
      + '<div class="c-step-h"><span class="c-num">4</span>'
      + '<span><b>发布前提醒</b><span>同行者会看到这些约定，减少出发前反复确认</span></span></div>'
      + '<div class="c-checks">'
      + ['集合地点与时间会同步到同行者的行程卡',
        '取消行程需提前 24 小时，已接受的申请会被通知',
        '聊天内不公开手机号，首次见面建议选人多的公共场合'].map(function (t) {
        return '<span>' + ic('check') + t + '</span>';
      }).join('')
      + '</div>'
      + '<div class="c-foot">'
      + '<button class="btn ghost" type="button">保存草稿</button>'
      + '<button class="btn teal" type="button">' + ic('arrow') + '发布行程</button>'
      + '<span class="c-note">发布后仍可在「我的旅行」编辑</span>'
      + '</div></section>';
  }

  /* ------------------------------------------------------------- S4 AI 规划 */
  function screenAi() {
    var ai = D.AI;
    return '<div class="a-head"><h2>用 AI，规划你的专属旅程</h2>'
      + '<p>告诉我你的想法，生成路线、美食、景点和实用建议。</p></div>'
      + '<div class="a-tabs">'
      + ['智能规划', '灵感生成', '行程优化'].map(function (t, i) {
        return '<button class="a-tab' + (i === 0 ? ' on' : '') + '" type="button" data-tab>' + t + '</button>';
      }).join('') + '</div>'
      + '<div class="a-window">'
      + '<div class="a-scroll">'
      + '<div class="a-msg"><span class="a-ai-av">' + ic('sparkle') + '</span>'
      + '<div class="a-bubble"><p class="lead">' + ai.greet.lead + '</p>'
      + '<ul class="a-ask">' + ai.greet.asks.map(function (a) {
        return '<li><span class="bullet"></span><span><em>' + a[0] + '</em>' + a[1] + '</span></li>';
      }).join('') + '</ul>'
      + '<p style="margin-top:7px">或者直接说：<em style="font-style:normal;color:#12867c">“帮我规划一个珠海两天一夜的行程”</em></p>'
      + '</div></div>'
      + '<div class="a-msg me"><div class="a-bubble me">' + ai.ask + '</div></div>'
      + '<div class="a-msg"><span class="a-ai-av">' + ic('sparkle') + '</span>'
      + '<div class="a-plan">'
      + '<div class="a-plan-h">' + ic('sparkle') + '<b>' + ai.plan.title + '</b><span class="tag">' + ai.plan.tag + '</span></div>'
      + '<div class="a-plan-tabs">' + ai.plan.tabs.map(function (t, i) {
        return '<button class="a-plan-tab' + (i === 0 ? ' on' : '') + '" type="button" data-tab>' + t + '</button>';
      }).join('') + '</div>'
      + '<div class="a-plan-b">'
      + '<div class="a-hl"><b>行程亮点</b><ul>' + ai.plan.highlights.map(function (h) {
        return '<li><span class="ok">' + ic('check') + '</span>' + h + '</li>';
      }).join('') + '</ul></div>'
      + '<div class="a-shots"><span class="a-shot">' + art('bay') + '</span><span class="a-shot">' + art('food') + '</span>'
      + '<span class="a-shot">' + art('dusk') + '</span></div>'
      + '</div></div></div>'
      + '<div class="a-msg"><span class="a-ai-av">' + ic('sparkle') + '</span>'
      + '<div class="a-facts">'
      + '<div class="a-fact">' + ic('cal') + '<span><b>11/19 - 11/20</b><span>两天一夜</span></span></div>'
      + '<div class="a-fact">' + ic('map') + '<span><b>6 个点位</b><span>顺路不回头</span></span></div>'
      + '<div class="a-fact">' + ic('users') + '<span><b>人均 ¥480</b><span>含船票与早茶</span></span></div>'
      + '</div></div>'
      + '<div class="a-cta"><span>满意的话，我可以直接把这条行程变成招募</span>'
      + '<button class="btn teal" type="button" data-publish>' + ic('plus') + '生成招募行程</button></div>'
      + '<div class="a-msg"><span class="a-ai-av">' + ic('sparkle') + '</span>'
      + '<div class="a-bubble">小提示：11/19 是工作日，情侣路傍晚人流比周末少三成，'
      + '建议把夜景机位放在 18:20 前后；如果下雨，我可以换一套室内备选。</div></div>'
      + '<div class="a-quick">'
      + ['Day2 换成海岛', '预算控制在 400 以内', '加一段亲子友好路线'].map(function (t) {
        return '<button class="chip" type="button" data-chip>' + t + '</button>';
      }).join('')
      + '</div>'
      + '</div>'
      + '<div class="a-input">'
      + '<div class="field"><input placeholder="继续问我，或告诉我更多需求…" aria-label="继续提问">'
      + '<span class="tool"><button type="button" title="图片">' + ic('image') + '</button>'
      + '<button type="button" title="语音">' + ic('mic') + '</button></span></div>'
      + '<button class="a-send" type="button" data-send-ai title="发送">' + ic('send') + '</button>'
      + '</div></div>';
  }

  /* ------------------------------------------------------------- S5 我的旅行 */
  function screenMine() {
    var tabs = [['我发布的', 4], ['我参加的', 2], ['草稿', 1], ['收藏', 7]];
    return '<div class="t-head"><div><h2>我的旅行</h2><p>记录每一次出发，遇见更好的自己。</p></div>'
      + '<button class="btn teal" type="button">' + ic('plus') + '发布新行程</button></div>'
      + '<div class="t-tabs">' + tabs.map(function (t, i) {
        return '<button class="t-tab' + (i === 0 ? ' on' : '') + '" type="button" data-tab>' + t[0]
          + '<span class="ct">' + t[1] + '</span></button>';
      }).join('') + '</div>'
      + D.MY_TRIPS.map(function (t) {
        return '<article class="t-row">'
          + '<div class="t-thumb">' + art(t.art) + (t.status === '草稿' ? '<span class="draft">草稿</span>' : '') + '</div>'
          + '<div class="t-info"><h4>' + t.title + '</h4>'
          + '<div class="mm"><span>' + ic('cal') + t.dates + '</span><span>' + ic('pin') + t.city + '</span></div>'
          + '<div class="mm"><span class="stop">' + ic('users') + t.meta + '</span></div></div>'
          + '<div class="t-act"><span class="pill ' + t.tone + '">' + t.status + '</span>'
          + '<button class="btn sm ghost" type="button">' + (t.action === '编辑' || t.action === '继续编辑' ? ic('edit') : ic('chev')) + t.action + '</button>'
          + '<button class="more" type="button" title="更多">' + ic('more') + '</button></div>'
          + '</article>';
      }).join('');
  }

  /* ------------------------------------------------------------- S6 同行消息 */
  function screenChat() {
    var active = D.CONVOS[0];
    return '<div class="cx">'
      + '<div class="cx-left">'
      + '<div class="cx-head" style="position:relative"><h2>同行消息</h2>'
      + '<p>和有趣的人聊天，出发前就认识你的旅伴吧！</p>'
      + '<button class="dot3" type="button" title="更多">' + ic('more') + '</button></div>'
      + '<div class="cx-search">' + ic('search') + '<span>搜索聊天记录</span></div>'
      + '<div class="cx-tabs">' + ['全部', '招募中', '已达成'].map(function (t, i) {
        return '<button class="cx-tab' + (i === 0 ? ' on' : '') + '" type="button" data-tab>' + t + '</button>';
      }).join('') + '</div>'
      + '<div class="cx-list">' + D.CONVOS.map(function (c, i) {
        var u = D.USERS[c.user];
        return '<div class="cv' + (i === 0 ? ' on' : '') + '" data-conv="' + c.id + '">'
          + avatar(c.user)
          + '<div class="cv-b"><b>' + u.name + '</b><span>' + c.text + '</span></div>'
          + '<div class="cv-meta"><time>' + c.time + '</time>'
          + (c.unread ? '<span class="unread">' + c.unread + '</span>' : '') + '</div>'
          + '</div>';
      }).join('') + '</div>'
      + '</div>'
      + '<div class="cx-right">'
      + '<div class="cx-rhead">' + avatar('ajie', 'lg')
      + '<div><b>阿杰</b><span>' + active.trip + '</span></div>'
      + '<div class="dots"><button class="ico" type="button" title="行程">' + ic('map') + '</button>'
      + '<button class="ico" type="button" title="更多">' + ic('more') + '</button></div></div>'
      + '<div class="cx-body">'
      + D.CHAT.map(function (m) {
        if (m.kind === 'trip') {
          return '<div class="cx-trip"><div class="thumb">' + art('dusk') + '</div>'
            + '<div><b>珠海海岸一日游 · 美食与日落</b><span>11月19日 · 珠海市 · 3 个途经点</span></div>'
            + ic('chev') + '</div>';
        }
        if (m.kind === 'note') return '<span class="cx-note">' + m.text + '</span>';
        if (m.day) return '<span class="cx-day">' + m.day + '</span>'
          + (m.from === 'me' ? '<div class="msg me">' + m.text + '</div>' : '<div class="msg them">' + m.text + '</div>');
        return '<div class="msg ' + (m.from === 'me' ? 'me' : 'them') + '">' + m.text + '</div>';
      }).join('')
      + '</div>'
      + '<div class="cx-input">'
      + '<div class="field"><input placeholder="输入消息…" aria-label="输入消息">'
      + '<span class="tool"><button type="button" title="表情">' + ic('smile') + '</button>'
      + '<button type="button" title="图片">' + ic('image') + '</button></span></div>'
      + '<button class="send" type="button" data-send-msg title="发送">' + ic('send') + '</button>'
      + '</div></div></div>';
  }

  var SCREENS = {
    discover: screenDiscover,
    map: screenMap,
    create: screenCreate,
    ai: screenAi,
    mine: screenMine,
    chat: screenChat
  };

  /* 侧栏里点了还没有原型的项，回落到灵感页 */
  function render(key) {
    var view = SCREENS[key] || SCREENS.discover;
    return '<div class="app" data-screen="' + key + '">'
      + sidebar(SCREENS[key] ? key : 'discover')
      + '<div class="ap-main">' + topbar(key === 'discover')
      + view() + '</div></div>';
  }

  global.APP = { render: render, art: art, ic: ic, SCREENS: SCREENS, ICONS: ICONS };
})(window);