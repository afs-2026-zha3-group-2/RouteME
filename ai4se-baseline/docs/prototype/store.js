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
        if (parsed && parsed.version === 1 && Array.isArray(parsed.trips)) return parsed;
      }
    } catch (e) { /* 隐私模式或损坏数据：回落到种子 */ }
    return global.RMData.buildSeed();
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
  function canLike(experienceId, userId) {
    var e = byId(state.experiences, experienceId);
    var id = userId || state.currentUserId;
    return !!e && !!id && e.authorId !== id;
  }
  function toggleLike(experienceId, userId) {
    var e = byId(state.experiences, experienceId);
    var id = userId || state.currentUserId;
    if (!e || !id || e.authorId === id) return false;
    var list = e.likedBy || (e.likedBy = []);
    var i = list.indexOf(id);
    if (i > -1) {
      list.splice(i, 1);
      e.likeCount = Math.max(0, (e.likeCount || 0) - 1);
    } else {
      list.push(id);
      e.likeCount = (e.likeCount || 0) + 1;
    }
    commit();
    return true;
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
    var ref = referenceTrip();
    var dest = ctx && ctx.destination ? ctx.destination : (ref ? ref.destination : '');
    var date = ctx && ctx.from ? ctx.from : (ref ? ref.startDate : '');
    var reasons = [];
    var score = 0;

    if (dest && t.destination === dest) { score += 50; reasons.push('目的地相同'); }
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
  function setUser(id) { state.currentUserId = id; commit(); }

  function validateTrip(p) {
    var e = {};
    if (!p.title || !p.title.trim()) e.title = '给这条路线起个名字';
    else if (p.title.trim().length > 40) e.title = '标题控制在 40 字以内';
    if (!p.destination) e.destination = '请选择目的地';
    if (!p.startDate) e.startDate = '请选择出发日期';
    if (!p.endDate) e.endDate = '请选择结束日期';
    if (p.startDate && p.endDate && dayDiff(p.endDate, p.startDate) < 0) e.endDate = '结束日期不能早于出发日期';
    var stops = (p.stops || []).filter(function (s) { return s && s.trim(); });
    if (stops.length < 2) e.stops = '至少写出两个途经点，别人才看得懂路线';
    var cap = parseInt(p.capacity, 10);
    if (!cap || cap < 2) e.capacity = '含你在内至少 2 人';
    else if (cap > 12) e.capacity = '首版单团不超过 12 人';
    if (p.budgetMin && p.budgetMax && Number(p.budgetMin) > Number(p.budgetMax)) e.budget = '预算下限不能高于上限';
    if (p.meetingArea && p.meetingArea.trim().length > 100) e.meetingArea = '集合区域控制在 100 字以内';
    if (p.meetingTime && p.endDate && p.meetingTime.slice(0, 10) > p.endDate) e.meetingTime = '集合时间不能晚于结束日期';
    return e;
  }

  function createTrip(p) {
    var errors = validateTrip(p);
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var t = {
      id: nextId('t'), creatorId: state.currentUserId,
      title: p.title.trim(), destination: p.destination, terrain: p.terrain || 'city',
      startDate: p.startDate, endDate: p.endDate,
      stops: p.stops.filter(function (s) { return s && s.trim(); }).map(function (s) { return s.trim(); }),
      meetingArea: (p.meetingArea || '').trim(),
      meetingTime: (p.meetingTime || '').trim(),
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
    t.title = p.title.trim(); t.destination = p.destination; t.terrain = p.terrain || t.terrain;
    t.startDate = p.startDate; t.endDate = p.endDate;
    t.stops = p.stops.filter(function (s) { return s && s.trim(); }).map(function (s) { return s.trim(); });
    t.meetingArea = (p.meetingArea || '').trim();
    t.meetingTime = (p.meetingTime || '').trim();
    t.budgetMin = p.budgetMin ? Number(p.budgetMin) : null;
    t.budgetMax = p.budgetMax ? Number(p.budgetMax) : null;
    t.tags = (p.tags || []).slice(0, 5);
    t.capacity = cap;
    t.note = (p.note || '').trim();
    syncStatus(t);
    commit();
    return { ok: true, trip: t };
  }

  /* 只改集合区域与集合时间：范围小，不碰其它字段；已结束行程不允许改。 */
  function updateMeetingInfo(id, p) {
    var t = trip(id);
    if (!t || t.creatorId !== state.currentUserId) return { ok: false, errors: { _: '只有发布者可以编辑集合信息' } };
    if (t.status === 'COMPLETED') return { ok: false, errors: { _: '行程已结束，不能再改集合信息' } };
    var area = (p.meetingArea || '').trim();
    var time = (p.meetingTime || '').trim();
    var errors = {};
    if (area.length > 30) errors.meetingArea = '集合区域最多 30 字';
    if (time && time.slice(0, 10) > t.endDate) errors.meetingTime = '集合时间不能晚于结束日期';
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    t.meetingArea = area;
    t.meetingTime = time;
    commit();
    return { ok: true, trip: t };
  }

  function cancelTrip(id, reason, note) {
    var t = trip(id);
    if (!t || t.creatorId !== state.currentUserId) return false;
    if (t.status !== 'RECRUITING' && t.status !== 'FULL') return false;
    snapshot('取消行程《' + t.title + '》');
    t.status = 'CANCELLED';
    t.cancelledAt = Date.now();
    t.cancelReason = reason || '';
    t.cancelNote = note || '';
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
      existing.photos = (p.photos || []).slice(0, 6);
      existing.createdAt = Date.now();
      commit();
      return { ok: true, experience: existing, updated: true };
    }
    var e = {
      id: nextId('e'), tripId: tripId, authorId: state.currentUserId,
      content: p.content.trim(), intensity: p.intensity, advice: p.advice.trim(), photos: (p.photos || []).slice(0, 6), createdAt: Date.now()
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
      destination: view.destination || '', from: view.from || '', to: view.to || '',
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
  function queryTrips(f) {
    var q = (f.q || '').trim().toLowerCase();
    var list = visibleTrips().filter(function (t) {
      if (t.status === 'COMPLETED') return false;
      if (f.destination && t.destination !== f.destination) return false;
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
      if (f.destination && t.destination !== f.destination) return false;
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
    canApply: canApply, canChat: canChat, canShare: canShare, canLike: canLike,
    matchOf: matchOf, referenceTrip: referenceTrip, dayDiff: dayDiff,
    setUser: setUser, createTrip: createTrip, updateTrip: updateTrip, updateMeetingInfo: updateMeetingInfo,
    cancelTrip: cancelTrip, deleteTrip: deleteTrip, completeTrip: completeTrip,
    apply: apply, cancelApplication: cancelApplication, decide: decide, bulkDecide: bulkDecide,
    leaveTrip: leaveTrip, sendMessage: sendMessage, thread: thread, chatPartners: chatPartners,
    saveExperience: saveExperience, addReport: addReport, toggleLike: toggleLike,
    saveView: saveView, deleteView: deleteView,
    undo: undo, canUndo: canUndo, undoLabel: undoLabel, reset: reset,
    visibleTrips: visibleTrips, queryTrips: queryTrips, queryExperiences: queryExperiences, stats: stats
  };
})(window);
