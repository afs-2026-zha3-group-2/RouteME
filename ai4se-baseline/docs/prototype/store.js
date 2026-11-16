/* RouteMe 路觅 · 状态与业务规则
   所有写操作即时落库 + 乐观更新；破坏性操作保留一步撤销快照。 */
(function (global) {
  'use strict';

  var KEY = 'routeme.mvp.v1';
  var listeners = [];
  var undoEntry = null;
  var state = null;

  /* ---------------- 持久化 ---------------- */
  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && Array.isArray(parsed.trips)) return migrate(parsed);
      }
    } catch (e) { /* 隐私模式或损坏数据：回落到种子 */ }
    return global.RMData.buildSeed();
  }
  /* 旧版本地数据补齐账号与资料字段，不丢弃用户已产生的行程与申请。 */
  function migrate(parsed) {
    var D = global.RMData;
    if (!Array.isArray(parsed.accounts)) {
      parsed.accounts = D.SEED_ACCOUNTS.map(function (a) {
        return { userId: a.userId, username: a.username, passHash: D.demoHash(a.password) };
      });
    }
    if (typeof parsed.session !== 'boolean') parsed.session = false;
    (parsed.users || []).forEach(function (u) {
      ['birthday', 'gender', 'city', 'major', 'job', 'mbti', 'travelStyle', 'avatarUrl'].forEach(function (k) {
        if (u[k] == null) u[k] = '';
      });
      if (!u.username) {
        for (var i = 0; i < parsed.accounts.length; i++) {
          if (parsed.accounts[i].userId === u.id) { u.username = parsed.accounts[i].username; break; }
        }
      }
    });
    return parsed;
  }
  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 忽略写入失败 */ }
  }
  function emit() { for (var i = 0; i < listeners.length; i++) listeners[i](state); }
  function commit() { save(); emit(); }
  function nextId(prefix) { state.seq += 1; return prefix + '_' + state.seq.toString(36) + Date.now().toString(36).slice(-3); }

  function snapshot(label) {
    undoEntry = { label: label, data: JSON.stringify(state) };
  }

  /* ---------------- 查询 ---------------- */
  function me() { return byId(state.users, state.currentUserId); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function user(id) { return byId(state.users, id); }
  function trip(id) { return byId(state.trips, id); }

  function appsOf(tripId) {
    return state.applications.filter(function (a) { return a.tripId === tripId; });
  }
  function acceptedApps(tripId) {
    return appsOf(tripId).filter(function (a) { return a.status === 'ACCEPTED'; });
  }
  function pendingApps(tripId) {
    return appsOf(tripId).filter(function (a) { return a.status === 'PENDING'; });
  }
  function participants(tripId) {
    var t = trip(tripId);
    if (!t) return [];
    var list = [user(t.creatorId)];
    acceptedApps(tripId).forEach(function (a) {
      var u = user(a.applicantId);
      if (u && list.indexOf(u) === -1) list.push(u);
    });
    return list.filter(Boolean);
  }
  function count(tripId) { return participants(tripId).length; }
  function isCreator(tripId, userId) { var t = trip(tripId); return !!t && t.creatorId === (userId || state.currentUserId); }
  function isParticipant(tripId, userId) {
    var id = userId || state.currentUserId;
    return participants(tripId).some(function (u) { return u.id === id; });
  }
  function myApp(tripId, userId) {
    var id = userId || state.currentUserId;
    var list = appsOf(tripId).filter(function (a) { return a.applicantId === id && a.status !== 'CANCELLED'; });
    return list.length ? list[list.length - 1] : null;
  }
  function hostPendingCount(userId) {
    var id = userId || state.currentUserId;
    return state.applications.filter(function (a) {
      var t = trip(a.tripId);
      return a.status === 'PENDING' && t && t.creatorId === id && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
    }).length;
  }
  function experiencesOf(tripId) {
    return state.experiences.filter(function (e) { return e.tripId === tripId; });
  }
  function myExperience(tripId, userId) {
    var id = userId || state.currentUserId;
    var list = experiencesOf(tripId).filter(function (e) { return e.authorId === id; });
    return list.length ? list[0] : null;
  }

  /* ---------------- 规则 ---------------- */
  function canApply(t, userId) {
    var id = userId || state.currentUserId;
    if (!t) return { ok: false, reason: '行程不存在' };
    if (t.creatorId === id) return { ok: false, reason: '这是你发布的行程' };
    if (t.status === 'COMPLETED') return { ok: false, reason: '行程已结束' };
    if (t.status === 'CANCELLED') return { ok: false, reason: '行程已取消' };
    if (t.status === 'FULL' || count(t.id) >= t.capacity) return { ok: false, reason: '人数已满' };
    var a = myApp(t.id, id);
    if (a && a.status === 'PENDING') return { ok: false, reason: '已申请，等待回应' };
    if (a && a.status === 'ACCEPTED') return { ok: false, reason: '你已在同行名单中' };
    return { ok: true, reason: '' };
  }
  function canChat(tripId, otherId, userId) {
    var id = userId || state.currentUserId;
    if (!isParticipant(tripId, id) || !isParticipant(tripId, otherId)) return false;
    return id !== otherId;
  }
  function canShare(tripId, userId) {
    var t = trip(tripId);
    return !!t && t.status === 'COMPLETED' && isParticipant(tripId, userId || state.currentUserId);
  }

  function dayDiff(a, b) {
    return Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);
  }

  /* 参照物：我最近一条未结束的行程；没有则用当前筛选条件 + 我的兴趣 */
  function referenceTrip() {
    var mine = state.trips.filter(function (t) {
      return t.creatorId === state.currentUserId && t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
    });
    mine.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return mine.length ? mine[0] : null;
  }

  function matchOf(t, ctx) {
    var u = me();
    if (!u) return { score: 0, reasons: [], shared: [], basis: '' };
    var D = global.RMData;
    var ref = referenceTrip();
    var destCode = ctx && ctx.destinationCode ? ctx.destinationCode : '';
    var dest = ctx && ctx.destination ? ctx.destination : (ref ? ref.destination : '');
    var date = ctx && ctx.from ? ctx.from : (ref ? ref.startDate : '');
    var reasons = [];
    var score = 0;

    var destHit = false;
    if (destCode) {
      var cityName = D.gazetteerCityForCode(destCode) || D.cityLabel(destCode);
      destHit = t.destinationCode ? t.destinationCode === destCode : t.destination === cityName;
    } else if (dest) {
      destHit = t.destination === dest;
    }
    if (destHit) { score += 50; reasons.push('目的地相同'); }
    if (date) {
      var d = Math.abs(dayDiff(t.startDate, date));
      if (d === 0) { score += 30; reasons.push('出发日期相同'); }
      else if (d === 1) { score += 20; reasons.push('出发日期相差一天'); }
    }
    var shared = t.tags.filter(function (tag) { return u.interests.indexOf(tag) > -1; });
    if (shared.length) {
      score += Math.min(shared.length * 10, 20);
      reasons.push('都喜欢' + shared.join('、'));
    }
    if (!reasons.length) reasons.push('暂无重合，可作为新方向的灵感');
    return {
      score: Math.min(score, 100),
      reasons: reasons,
      shared: shared,
      basis: ref ? '对照你发布的《' + ref.title + '》' : '对照你的旅行兴趣'
    };
  }

  function syncStatus(t) {
    if (!t || t.status === 'COMPLETED' || t.status === 'CANCELLED') return;
    t.status = count(t.id) >= t.capacity ? 'FULL' : 'RECRUITING';
  }

  /* ---------------- 写操作 ---------------- */
  /* 演示身份切换：结束任何登录会话（与前端「切换到演示身份会结束当前登录」一致）。 */
  function setUser(id) { state.currentUserId = id; state.session = false; commit(); }
  function isAuthed() { return !!state.session && !!state.currentUserId; }

  function accountByUsername(username) {
    var key = String(username || '').trim().toLowerCase();
    for (var i = 0; i < state.accounts.length; i++) {
      if (state.accounts[i].username.toLowerCase() === key) return state.accounts[i];
    }
    return null;
  }
  function login(username, password) {
    var acc = accountByUsername(username);
    if (!acc || acc.passHash !== global.RMData.demoHash(password || '') || !user(acc.userId)) {
      return { ok: false, reason: '用户名或密码不正确' };
    }
    state.currentUserId = acc.userId;
    state.session = true;
    commit();
    return { ok: true, user: user(acc.userId) };
  }
  var NEW_HUES = [186, 22, 268, 152, 206, 44];
  function register(username, password, nickname) {
    var name = String(username || '').trim();
    var nick = String(nickname || '').trim();
    var errors = {};
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) errors.username = '用户名需为 3–20 位字母、数字或下划线';
    if (!password || password.length < 8 || password.length > 64) errors.password = '密码需为 8–64 位';
    if (!nick || nick.length > 20) errors.nickname = '昵称需为 1–20 个字';
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    if (accountByUsername(name)) return { ok: false, errors: { username: '这个用户名已经被占用了，换一个试试' } };
    var id = nextId('u');
    var u = {
      id: id, nickname: nick, initial: nick.charAt(0), hue: NEW_HUES[state.seq % NEW_HUES.length],
      school: '', bio: '', interests: [], joinedAt: Date.now(),
      username: name, birthday: '', gender: '', city: '', major: '', job: '', mbti: '', travelStyle: '', avatarUrl: ''
    };
    state.users.push(u);
    state.accounts.push({ userId: id, username: name, passHash: global.RMData.demoHash(password) });
    state.currentUserId = id;
    state.session = true;
    commit();
    return { ok: true, user: u };
  }

  /* ---------------- 个人资料 ---------------- */
  function profileComplete(u) {
    return !!(u && u.nickname && u.birthday && u.gender && u.city &&
      (u.interests || []).length >= 3 && u.travelStyle);
  }
  function validBirthday(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) return false;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var parsed = new Date(Date.UTC(y, mo - 1, d));
    if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== mo - 1 || parsed.getUTCDate() !== d) return false;
    return value >= global.RMData.PROFILE_LIMITS.minBirthday && value <= global.RMData.iso(new Date());
  }
  function validateProfile(v) {
    var L = global.RMData.PROFILE_LIMITS;
    var D = global.RMData;
    var e = {};
    var nick = (v.nickname || '').trim();
    if (!nick || nick.length > L.maxNickname) e.nickname = '请填写昵称（20 字以内）';
    if (!validBirthday((v.birthday || '').trim())) e.birthday = '请选择合法生日（1900-01-01 至今天）';
    if (!v.gender) e.gender = '请选择性别';
    else if (D.GENDERS.indexOf(v.gender) === -1) e.gender = '请选择有效的选项';
    var city = (v.city || '').trim();
    if (!city || city.length > L.maxCity) e.city = '请填写所在城市（40 字以内）';
    var ints = (v.interests || []).map(function (x) { return String(x).trim(); });
    if (ints.length < L.minInterests || ints.length > L.maxInterests || ints.some(function (x) { return !x; })) {
      e.interests = '至少选择 3 个、最多 5 个兴趣标签';
    } else if (ints.some(function (x) { return x.length > L.maxInterestLength; })) {
      e.interests = '每个兴趣标签最多 12 个字';
    } else if (ints.filter(function (x, i) { return ints.indexOf(x) === i; }).length !== ints.length) {
      e.interests = '兴趣标签不能重复';
    }
    if (!v.travelStyle) e.travelStyle = '请选择一种旅行方式';
    else if (D.TRAVEL_STYLES.indexOf(v.travelStyle) === -1) e.travelStyle = '请选择有效的选项';
    if ((v.school || '').trim().length > L.maxSchool) e.school = '学校最多 80 字';
    if ((v.major || '').trim().length > L.maxSchool) e.major = '专业最多 80 字';
    if ((v.bio || '').trim().length > L.maxBio) e.bio = '简介最多 500 个字';
    if ((v.job || '').trim().length > L.maxJob) e.job = '职业最多 20 字';
    if (v.mbti && D.MBTI_TYPES.indexOf(v.mbti) === -1) e.mbti = '请选择有效的选项';
    return e;
  }
  function saveProfile(v) {
    if (!isAuthed()) return { ok: false, reason: '演示身份不能保存资料' };
    var errors = validateProfile(v);
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var u = me();
    u.nickname = v.nickname.trim();
    u.initial = u.nickname.charAt(0);
    u.birthday = v.birthday.trim();
    u.gender = v.gender;
    u.city = v.city.trim();
    u.school = (v.school || '').trim();
    u.major = (v.major || '').trim();
    u.job = (v.job || '').trim();
    u.mbti = v.mbti || '';
    u.interests = v.interests.map(function (x) { return x.trim(); });
    u.travelStyle = v.travelStyle;
    u.bio = (v.bio || '').trim();
    if (v.avatarUrl != null) u.avatarUrl = v.avatarUrl;
    commit();
    return { ok: true, user: u };
  }

  /* 路线类型不再手选：由途经点名称推导，封面占位随之变化。 */
  function terrainOf(stops) {
    var text = (stops || []).join(' ');
    if (/岛|湾|港|海|泳场|情侣路/.test(text)) return 'coast';
    if (/山|峡|岭|峰|林|营地/.test(text)) return 'mountain';
    return 'city';
  }

  function validateTrip(p) {
    var e = {};
    if (!p.title || !p.title.trim()) e.title = '给这条路线起个名字';
    else if (p.title.trim().length > 40) e.title = '标题控制在 40 字以内';
    if (!p.destinationCode || !global.RMData.findCity(p.destinationCode)) e.destination = '请选择目的地（必须选到城市）';
    if (!p.startDate) e.startDate = '请选择出发日期';
    if (!p.endDate) e.endDate = '请选择结束日期';
    if (p.startDate && p.endDate && dayDiff(p.endDate, p.startDate) < 0) e.endDate = '结束日期不能早于出发日期';
    var stops = (p.stops || []).filter(function (s) { return s && s.trim(); });
    if (stops.length < 2) e.stops = '至少写出两个途经点，别人才看得懂路线';
    var cap = parseInt(p.capacity, 10);
    if (!cap || cap < 2) e.capacity = '含你在内至少 2 人';
    else if (cap > 12) e.capacity = '首版单团不超过 12 人';
    if (p.budgetMin && p.budgetMax && Number(p.budgetMin) > Number(p.budgetMax)) e.budget = '预算下限不能高于上限';
    return e;
  }

  function createTrip(p) {
    var errors = validateTrip(p);
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var t = {
      id: nextId('t'), creatorId: state.currentUserId,
      title: p.title.trim(), destination: global.RMData.cityLabel(p.destinationCode),
      destinationCode: p.destinationCode, terrain: terrainOf(p.stops),
      startDate: p.startDate, endDate: p.endDate,
      stops: p.stops.filter(function (s) { return s && s.trim(); }).map(function (s) { return s.trim(); }),
      meetingArea: (p.meetingArea || '').trim(),
      budgetMin: p.budgetMin ? Number(p.budgetMin) : null,
      budgetMax: p.budgetMax ? Number(p.budgetMax) : null,
      tags: (p.tags || []).slice(0, 5),
      capacity: parseInt(p.capacity, 10),
      status: 'RECRUITING',
      note: (p.note || '').trim(),
      createdAt: Date.now(),
      sourceTripId: p.sourceTripId || null
    };
    state.trips.unshift(t);
    commit();
    return { ok: true, trip: t };
  }

  function updateTrip(id, p) {
    var t = trip(id);
    if (!t || t.creatorId !== state.currentUserId) return { ok: false, errors: { _: '只有发布者可以编辑' } };
    var errors = validateTrip(p);
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var cap = parseInt(p.capacity, 10);
    if (cap < count(id)) return { ok: false, errors: { capacity: '已有 ' + count(id) + ' 人，不能降到更少' } };
    t.title = p.title.trim(); t.destination = global.RMData.cityLabel(p.destinationCode);
    t.destinationCode = p.destinationCode; t.terrain = terrainOf(p.stops);
    t.startDate = p.startDate; t.endDate = p.endDate;
    t.stops = p.stops.filter(function (s) { return s && s.trim(); }).map(function (s) { return s.trim(); });
    t.meetingArea = (p.meetingArea || '').trim();
    t.budgetMin = p.budgetMin ? Number(p.budgetMin) : null;
    t.budgetMax = p.budgetMax ? Number(p.budgetMax) : null;
    t.tags = (p.tags || []).slice(0, 5);
    t.capacity = cap;
    t.note = (p.note || '').trim();
    syncStatus(t);
    commit();
    return { ok: true, trip: t };
  }

  function cancelTrip(id) {
    var t = trip(id);
    if (!t || t.creatorId !== state.currentUserId) return false;
    snapshot('取消行程《' + t.title + '》');
    t.status = 'CANCELLED';
    appsOf(id).forEach(function (a) { if (a.status === 'PENDING') a.status = 'CANCELLED'; });
    commit();
    return true;
  }

  function deleteTrip(id) {
    var t = trip(id);
    if (!t || t.creatorId !== state.currentUserId) return false;
    snapshot('删除行程《' + t.title + '》');
    state.trips = state.trips.filter(function (x) { return x.id !== id; });
    state.applications = state.applications.filter(function (a) { return a.tripId !== id; });
    state.messages = state.messages.filter(function (m) { return m.tripId !== id; });
    state.experiences = state.experiences.filter(function (e) { return e.tripId !== id; });
    commit();
    return true;
  }

  function completeTrip(id) {
    var t = trip(id);
    if (!t || t.creatorId !== state.currentUserId) return false;
    snapshot('结束行程《' + t.title + '》');
    t.status = 'COMPLETED';
    appsOf(id).forEach(function (a) { if (a.status === 'PENDING') a.status = 'REJECTED'; });
    commit();
    return true;
  }

  function apply(tripId, message) {
    var t = trip(tripId);
    var gate = canApply(t);
    if (!gate.ok) return { ok: false, reason: gate.reason };
    var a = {
      id: nextId('a'), tripId: tripId, applicantId: state.currentUserId,
      message: (message || '').trim(), status: 'PENDING', createdAt: Date.now()
    };
    state.applications.push(a);
    commit();
    return { ok: true, application: a };
  }

  function cancelApplication(appId) {
    var a = byId(state.applications, appId);
    if (!a || a.status !== 'PENDING' || a.applicantId !== state.currentUserId) return false;
    snapshot('撤回同行申请');
    a.status = 'CANCELLED';
    syncStatus(trip(a.tripId));
    commit();
    return true;
  }

  function decide(appId, status) {
    var a = byId(state.applications, appId);
    if (!a || a.status !== 'PENDING') return { ok: false, reason: '该申请已被处理' };
    var t = trip(a.tripId);
    if (!t || t.creatorId !== state.currentUserId) return { ok: false, reason: '只有发布者可以处理申请' };
    if (status === 'ACCEPTED' && count(t.id) >= t.capacity) return { ok: false, reason: '人数已满，无法再接受' };
    snapshot(status === 'ACCEPTED' ? '接受 ' + user(a.applicantId).nickname + ' 的申请' : '拒绝 ' + user(a.applicantId).nickname + ' 的申请');
    a.status = status;
    a.decidedAt = Date.now();
    syncStatus(t);
    commit();
    return { ok: true };
  }

  function bulkDecide(ids, status) {
    var done = 0, blocked = 0;
    if (!ids.length) return { done: 0, blocked: 0 };
    snapshot((status === 'ACCEPTED' ? '批量接受 ' : '批量拒绝 ') + ids.length + ' 条申请');
    ids.forEach(function (id) {
      var a = byId(state.applications, id);
      if (!a || a.status !== 'PENDING') return;
      var t = trip(a.tripId);
      if (!t || t.creatorId !== state.currentUserId) return;
      if (status === 'ACCEPTED' && count(t.id) >= t.capacity) { blocked++; return; }
      a.status = status; a.decidedAt = Date.now(); done++;
      syncStatus(t);
    });
    commit();
    return { done: done, blocked: blocked };
  }

  function leaveTrip(tripId) {
    var t = trip(tripId);
    if (!t) return false;
    if (t.creatorId === state.currentUserId) return false;
    var a = acceptedApps(tripId).filter(function (x) { return x.applicantId === state.currentUserId; })[0];
    if (!a) return false;
    snapshot('退出《' + t.title + '》的同行');
    a.status = 'CANCELLED';
    syncStatus(t);
    commit();
    return true;
  }

  function sendMessage(tripId, receiverId, content) {
    var text = (content || '').trim();
    if (!text) return { ok: false, reason: '消息不能为空' };
    if (!canChat(tripId, receiverId)) return { ok: false, reason: '只有已匹配的同行者可以聊天' };
    var m = { id: nextId('m'), tripId: tripId, senderId: state.currentUserId, receiverId: receiverId, content: text.slice(0, 500), sentAt: Date.now() };
    state.messages.push(m);
    commit();
    return { ok: true, message: m };
  }
  function thread(tripId, otherId, userId) {
    var id = userId || state.currentUserId;
    return state.messages.filter(function (m) {
      return m.tripId === tripId &&
        ((m.senderId === id && m.receiverId === otherId) || (m.senderId === otherId && m.receiverId === id));
    }).sort(function (a, b) { return a.sentAt - b.sentAt; });
  }
  function chatPartners(userId) {
    var id = userId || state.currentUserId;
    var out = [];
    state.trips.forEach(function (t) {
      if (!isParticipant(t.id, id)) return;
      participants(t.id).forEach(function (u) {
        if (u.id === id) return;
        var msgs = thread(t.id, u.id, id);
        out.push({ trip: t, other: u, last: msgs.length ? msgs[msgs.length - 1] : null, size: msgs.length });
      });
    });
    out.sort(function (a, b) {
      var ta = a.last ? a.last.sentAt : 0, tb = b.last ? b.last.sentAt : 0;
      return tb - ta;
    });
    return out;
  }

  function saveExperience(tripId, p) {
    if (!canShare(tripId)) return { ok: false, reason: '只能对已结束且你参加过的行程分享' };
    var errors = {};
    if (!p.content || p.content.trim().length < 10) errors.content = '至少写 10 个字，让后来的人有得参考';
    if (!p.intensity) errors.intensity = '选一个真实的路线强度';
    if (!p.advice || !p.advice.trim()) errors.advice = '给后来者留一条具体建议';
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var existing = myExperience(tripId);
    if (existing) {
      existing.content = p.content.trim();
      existing.intensity = p.intensity;
      existing.advice = p.advice.trim();
      existing.createdAt = Date.now();
      commit();
      return { ok: true, experience: existing, updated: true };
    }
    var e = {
      id: nextId('e'), tripId: tripId, authorId: state.currentUserId,
      content: p.content.trim(), intensity: p.intensity, advice: p.advice.trim(), createdAt: Date.now()
    };
    state.experiences.unshift(e);
    commit();
    return { ok: true, experience: e };
  }

  function addReport(targetType, targetId, reason, note) {
    state.reports.push({
      id: nextId('r'), targetType: targetType, targetId: targetId,
      reporterId: state.currentUserId, reason: reason, note: (note || '').trim(), createdAt: Date.now()
    });
    commit();
    return true;
  }

  function saveView(view) {
    var v = {
      id: nextId('v'), name: view.name || '未命名筛选',
      destination: view.destination || '', destinationCode: view.destinationCode || '',
      from: view.from || '', to: view.to || '',
      tags: (view.tags || []).slice(), sort: view.sort || 'match', q: view.q || ''
    };
    state.savedViews.push(v);
    commit();
    return v;
  }
  function deleteView(id) {
    state.savedViews = state.savedViews.filter(function (v) { return v.id !== id; });
    commit();
  }

  function undo() {
    if (!undoEntry) return null;
    var label = undoEntry.label;
    var keepUser = state.currentUserId;
    state = JSON.parse(undoEntry.data);
    state.currentUserId = keepUser;
    undoEntry = null;
    commit();
    return label;
  }
  function canUndo() { return !!undoEntry; }
  function undoLabel() { return undoEntry ? undoEntry.label : ''; }

  function reset() {
    var keepUser = state.currentUserId;
    state = global.RMData.buildSeed();
    state.currentUserId = keepUser;
    undoEntry = null;
    commit();
  }

  /* ---------------- 列表检索 ---------------- */
  function visibleTrips() {
    return state.trips.filter(function (t) { return t.status !== 'CANCELLED'; });
  }
  /* 区域码命中：新行程比码；旧行程（无码）按地名库城市名兼容。 */
  function destHit(t, f) {
    var D = global.RMData;
    if (f.destinationCode) {
      var cityName = D.gazetteerCityForCode(f.destinationCode) || D.cityLabel(f.destinationCode);
      return t.destinationCode ? t.destinationCode === f.destinationCode : t.destination === cityName;
    }
    if (f.destination) return t.destination === f.destination;
    return true;
  }
  function queryTrips(f) {
    var q = (f.q || '').trim().toLowerCase();
    var list = visibleTrips().filter(function (t) {
      if (t.status === 'COMPLETED') return false;
      if (!destHit(t, f)) return false;
      if (f.from && dayDiff(t.endDate, f.from) < 0) return false;
      if (f.to && dayDiff(t.startDate, f.to) > 0) return false;
      if (f.tags && f.tags.length) {
        var hit = f.tags.some(function (tag) { return t.tags.indexOf(tag) > -1; });
        if (!hit) return false;
      }
      if (q) {
        var hay = (t.title + ' ' + t.destination + ' ' + t.stops.join(' ') + ' ' + t.tags.join(' ') + ' ' + (user(t.creatorId) || {}).nickname).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var sort = f.sort || 'match';
    list.sort(function (a, b) {
      if (sort === 'match') return matchOf(b, f).score - matchOf(a, f).score || b.createdAt - a.createdAt;
      if (sort === 'date') return dayDiff(a.startDate, b.startDate) || b.createdAt - a.createdAt;
      return b.createdAt - a.createdAt;
    });
    return list;
  }
  function queryExperiences(f) {
    var q = (f.q || '').trim().toLowerCase();
    var list = state.experiences.filter(function (e) {
      var t = trip(e.tripId);
      if (!t || t.status === 'CANCELLED') return false;
      if (!destHit(t, f)) return false;
      /* 体验也按原行程日期过滤：与前端 a13416c 一致。 */
      if (f.from && dayDiff(t.endDate, f.from) < 0) return false;
      if (f.to && dayDiff(t.startDate, f.to) > 0) return false;
      if (f.tags && f.tags.length && !f.tags.some(function (tag) { return t.tags.indexOf(tag) > -1; })) return false;
      if (q) {
        var hay = (t.title + ' ' + t.destination + ' ' + e.content + ' ' + e.advice).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    list.sort(function (a, b) { return b.createdAt - a.createdAt; });
    return list;
  }

  function stats(userId) {
    var id = userId || state.currentUserId;
    var published = state.trips.filter(function (t) { return t.creatorId === id && t.status !== 'CANCELLED'; });
    return {
      published: published.length,
      completed: published.filter(function (t) { return t.status === 'COMPLETED'; }).length,
      joined: state.applications.filter(function (a) { return a.applicantId === id && a.status === 'ACCEPTED'; }).length,
      shared: state.experiences.filter(function (e) { return e.authorId === id; }).length
    };
  }

  state = load();

  global.Store = {
    get state() { return state; },
    subscribe: function (fn) { listeners.push(fn); },
    save: save,
    me: me, user: user, trip: trip,
    appsOf: appsOf, acceptedApps: acceptedApps, pendingApps: pendingApps,
    participants: participants, count: count,
    isCreator: isCreator, isParticipant: isParticipant, myApp: myApp,
    hostPendingCount: hostPendingCount, experiencesOf: experiencesOf, myExperience: myExperience,
    canApply: canApply, canChat: canChat, canShare: canShare,
    matchOf: matchOf, referenceTrip: referenceTrip, dayDiff: dayDiff,
    setUser: setUser, isAuthed: isAuthed, login: login, register: register,
    profileComplete: profileComplete, validateProfile: validateProfile, saveProfile: saveProfile, terrainOf: terrainOf,
    createTrip: createTrip, updateTrip: updateTrip,
    cancelTrip: cancelTrip, deleteTrip: deleteTrip, completeTrip: completeTrip,
    apply: apply, cancelApplication: cancelApplication, decide: decide, bulkDecide: bulkDecide,
    leaveTrip: leaveTrip, sendMessage: sendMessage, thread: thread, chatPartners: chatPartners,
    saveExperience: saveExperience, addReport: addReport,
    saveView: saveView, deleteView: deleteView,
    undo: undo, canUndo: canUndo, undoLabel: undoLabel, reset: reset,
    visibleTrips: visibleTrips, queryTrips: queryTrips, queryExperiences: queryExperiences, stats: stats
  };
})(window);
