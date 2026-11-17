/* ==========================================================================
   RouteMe 路觅 · 原型图 v2 — 演示数据
   口径与 docs/sdd、openspec/specs 的行程 / 同行 / 体验模型一致：
   行程有 招募中 / 已成行 / 已满员 / 草稿 四态，同行者按 1/4 人显示名额。
   ========================================================================== */
(function (global) {
  'use strict';

  /* 头像色板：a1/a2 是渐变两端，ini 是首字 */
  var USERS = {
    lin: { name: '林见夏', ini: '夏', a1: '#7fd6c6', a2: '#12867c' },
    ajie: { name: '阿杰', ini: '杰', a1: '#8fb8f6', a2: '#2f63c8' },
    lily: { name: 'Lily', ini: 'L', a1: '#f6b98f', a2: '#dd7333' },
    shanye: { name: '山野行者', ini: '山', a1: '#9ed6a8', a2: '#3d8f52' },
    xiaoyu: { name: '旅行家小雨', ini: '雨', a1: '#c3b1f7', a2: '#6d55dc' },
    ocean: { name: 'Ocean', ini: 'O', a1: '#8bd3e8', a2: '#2b7d9c' },
    haibird: { name: '海鸟控', ini: '海', a1: '#f3c48a', a2: '#c1812b' },
    xiaobai: { name: '小白', ini: '白', a1: '#cbd4e2', a2: '#7b8699' }
  };

  /* 灵感页分类：icon 对应 app.js 里的图标名，c/ci 是底色与图标色 */
  var CATEGORIES = [
    { key: 'island', label: '海岛', icon: 'island', c: '#e8f4fb', ci: '#2f86c8' },
    { key: 'city', label: '城市', icon: 'city', c: '#eef0fe', ci: '#5f66d8' },
    { key: 'food', label: '美食', icon: 'food', c: '#fdf0e6', ci: '#d97b28' },
    { key: 'hike', label: '徒步', icon: 'hike', c: '#e9f6ec', ci: '#3f8f55' },
    { key: 'drive', label: '自驾', icon: 'drive', c: '#e9f3fd', ci: '#2f6fd0' },
    { key: 'culture', label: '文化', icon: 'culture', c: '#f4ecfd', ci: '#7a54d0' },
    { key: 'family', label: '亲子', icon: 'family', c: '#fdf1f1', ci: '#cf5566' },
    { key: 'more', label: '更多', icon: 'more', c: '#f2f5f9', ci: '#7b8699' }
  ];

  /* 行程卡（灵感页 / 地图页 / 我的旅行共用同一批数据） */
  var TRIPS = [
    {
      id: 't1', title: '珠海情侣路日落骑行', city: '珠海市', dates: '11月19日 - 11月19日',
      people: '2-4人', join: '1/4 人', stops: 3, host: 'ajie', likes: 32, art: 'dusk', tone: 'teal'
    },
    {
      id: 't2', title: '顺德美食探店一日游', city: '佛山市', dates: '11月22日 - 11月22日',
      people: '2-4人', join: '2/4 人', stops: 6, host: 'lily', likes: 28, art: 'food', tone: 'amber'
    },
    {
      id: 't3', title: '惠州罗浮山徒步', city: '惠州市', dates: '11月25日 - 11月26日',
      people: '3-6人', join: '5/6 人', stops: 4, host: 'shanye', likes: 46, art: 'mountain', tone: 'jade'
    },
    {
      id: 't4', title: '日月贝 & 情侣路 citywalk', city: '珠海市', dates: '11月19日 - 11月19日',
      people: '2-4人', join: '2/4 人', stops: 5, host: 'xiaoyu', likes: 24, art: 'bay', tone: 'teal'
    },
    {
      id: 't5', title: '东澳岛海岛一日游', city: '珠海市', dates: '11月23日 - 11月24日',
      people: '3-6人', join: '4/6 人', stops: 3, host: 'haibird', likes: 18, art: 'island', tone: 'blue'
    },
    {
      id: 't6', title: '外伶仃岛潜水之旅', city: '珠海市', dates: '11月22日 - 11月23日',
      people: '3-6人', join: '3/6 人', stops: 4, host: 'ocean', likes: 31, art: 'coast', tone: 'blue'
    }
  ];

  /* 我的旅行：四种状态各一条，用于验证列表排版与状态色 */
  var MY_TRIPS = [
    {
      id: 'm1', title: '珠海海岸一日游 · 美食与日落', city: '珠海市', dates: '2026-11-19',
      meta: '1/4 人 · 3 个途经点', status: '招募中', tone: 'teal', art: 'dusk', action: '编辑'
    },
    {
      id: 'm2', title: '惠州罗浮山徒步', city: '惠州市', dates: '2026-11-25 - 2026-11-26',
      meta: '5/6 人 · 4 个途经点', status: '已成行', tone: 'blue', art: 'mountain', action: '查看'
    },
    {
      id: 'm3', title: '顺德美食探店', city: '佛山市', dates: '2026-12-03',
      meta: '3/4 人 · 6 个途经点', status: '已满员', tone: 'amber', art: 'food', action: '查看'
    },
    {
      id: 'm4', title: '东澳岛海岛之旅', city: '珠海市', dates: '2026-12-20 - 2026-12-21',
      meta: '2 个途经点 · 待补充人数', status: '草稿', tone: 'gray', art: 'island', action: '继续编辑'
    },
    {
      id: 'm5', title: '珠海情侣路日落骑行', city: '珠海市', dates: '2026-11-08',
      meta: '4/4 人 · 3 个途经点', status: '已结束', tone: 'gray', art: 'coast', action: '查看'
    },
    {
      id: 'm6', title: '广州老城骑楼扫街半日', city: '广州市', dates: '2026-11-02',
      meta: '3/4 人 · 5 个途经点', status: '已结束', tone: 'gray', art: 'city', action: '查看'
    },
    {
      id: 'm7', title: '深圳大鹏半岛海岸线徒步', city: '深圳市', dates: '2026-10-26 - 2026-10-27',
      meta: '6/6 人 · 4 个途经点', status: '已结束', tone: 'gray', art: 'coast', action: '查看'
    },
    {
      id: 'm8', title: '清远英西峰林两日露营', city: '清远市', dates: '2026-10-18 - 2026-10-19',
      meta: '4/6 人 · 3 个途经点', status: '已结束', tone: 'gray', art: 'mountain', action: '查看'
    },
    {
      id: 'm9', title: '中山孙文西路老城半日', city: '中山市', dates: '2026-10-11',
      meta: '2/4 人 · 4 个途经点', status: '已结束', tone: 'gray', art: 'city', action: '查看'
    },
    {
      id: 'm10', title: '肇庆七星岩环湖骑行', city: '肇庆市', dates: '2026-09-27',
      meta: '3/4 人 · 5 个途经点', status: '已结束', tone: 'gray', art: 'bay', action: '查看'
    },
    {
      id: 'm11', title: '江门开平碉楼两日慢游', city: '江门市', dates: '2026-09-20 - 2026-09-21',
      meta: '4/4 人 · 6 个途经点', status: '已结束', tone: 'gray', art: 'food', action: '查看'
    }
  ];

  /* 地图页：x/y 是画布百分比坐标，kind 决定标记配色 */
  var MAP_POINTS = [
    { no: 1, x: 30, y: 34, label: '唐家湾', kind: '' },
    { no: 2, x: 47, y: 46, label: '香洲区', kind: 'hot' },
    { no: 3, x: 58, y: 30, label: '淇澳岛', kind: '' },
    { no: 4, x: 64, y: 62, label: '珠海渔女', kind: 'amber' },
    { no: 5, x: 78, y: 72, label: '港珠澳大桥', kind: 'hot' }
  ];

  /* 发布页：已选途经点 */
  var ROUTE_STOPS = ['太子庙广场', '顺河路南 130 号', '鹏泰产业园'];

  /* 消息页会话列表 */
  var CONVOS = [
    { id: 'c1', user: 'ajie', time: '10:24', text: '你好！我对你的行程很感兴趣～请问还有名额吗？', unread: 2, trip: '珠海海岸一日游 · 11月19日' },
    { id: 'c2', user: 'lily', time: '昨天', text: '我也想去！您觉得买几点的船票好呢？', unread: 0, trip: '顺德美食探店一日游' },
    { id: 'c3', user: 'shanye', time: '11/15', text: '路线看起来很棒！', unread: 0, trip: '惠州罗浮山徒步' },
    { id: 'c4', user: 'xiaoyu', time: '11/12', text: '我有一张拍照点位地图，出发前发你～', unread: 1, trip: '日月贝 & 情侣路 citywalk' },
    { id: 'c5', user: 'ocean', time: '11/12', text: '约好，谢谢！', unread: 0, trip: '外伶仃岛潜水之旅' },
    { id: 'c6', user: 'xiaobai', time: '11/10', text: '好的，谢谢！', unread: 0, trip: '东澳岛海岛一日游' },
    { id: 'c7', user: 'haibird', time: '11/09', text: '周六早上 8:30 香洲港码头集合可以吗？', unread: 0, trip: '东澳岛海岛一日游' },
    { id: 'c8', user: 'ajie', time: '11/09', text: '船票我先买两张，剩下的到时候补', unread: 0, trip: '珠海海岸一日游 · 11月19日' },
    { id: 'c9', user: 'lily', time: '11/08', text: '顺德那家双皮奶店我收藏好了～', unread: 0, trip: '顺德美食探店一日游' },
    { id: 'c10', user: 'shanye', time: '11/07', text: '登山杖我有多的，可以借你一根', unread: 0, trip: '惠州罗浮山徒步' },
    { id: 'c11', user: 'xiaoyu', time: '11/06', text: '傍晚五点半在日月贝东侧拍最好看', unread: 0, trip: '日月贝 & 情侣路 citywalk' },
    { id: 'c12', user: 'ocean', time: '11/05', text: '潜店确认了，含装备 380 一人', unread: 0, trip: '外伶仃岛潜水之旅' },
    { id: 'c13', user: 'xiaobai', time: '11/04', text: '我这边两个人，都需要双人房', unread: 0, trip: '东澳岛海岛一日游' },
    { id: 'c14', user: 'haibird', time: '11/03', text: '收到，我把房间信息发到群里了', unread: 0, trip: '东澳岛海岛一日游' },
    { id: 'c15', user: 'lily', time: '11/02', text: '行程里那家烧鹅店要不要提前订位？', unread: 0, trip: '顺德美食探店一日游' },
    { id: 'c16', user: 'ajie', time: '11/01', text: '好嘞，出发前一天再确认一次', unread: 0, trip: '珠海海岸一日游 · 11月19日' },
    { id: 'c17', user: 'shanye', time: '10/30', text: '这条线路我走过，逆时针更省力', unread: 0, trip: '惠州罗浮山徒步' }
  ];

  /* 与阿杰的对话 */
  var CHAT = [
    { day: '11/16 10:20', from: 'them', text: '你好！我对你的行程很感兴趣～请问还有名额吗？' },
    { day: '', from: 'me', text: '你好！还有名额的 😄 你是从哪里出发呢？' },
    { day: '', from: 'them', text: '我在广州，计划周四早上出发，可以一起拼车吗？' },
    { day: '', from: 'me', text: '可以的！我也从广州出发，我们可以在广州南站集合～' },
    { kind: 'trip', from: 'me' },
    { day: '', from: 'them', text: '这个路线太合我意了，海边那段我熟，可以带路！' },
    { day: '', from: 'me', text: '那太好了，我把第 2 个途经点换成你说的机位。' },
    { day: '', from: 'them', text: '顺河路南 130 号旁边有条小路，走 5 分钟就到海边栈道。' },
    { day: '', from: 'me', text: '记下了。装备要带什么？我第一次去这段海岸。' },
    { day: '', from: 'them', text: '相机、薄外套就行，傍晚风大。三脚架我可以带一个。' },
    { day: '', from: 'me', text: '我带上广角。船票我先订 3 张？' },
    { day: '', from: 'them', text: '好，我这边还有一个人，一起订吧。' },
    { kind: 'note', text: '安全提示 · 首次见面建议选择人多的公共场合' },
    { day: '10:25', from: 'me', text: '我把行程里的途经点补全了，你先看看路线？' }
  ];

  /* AI 规划页 */
  var AI = {
    greet: {
      lead: '你好！我可以帮你规划路线旅行。你可以告诉我：',
      asks: [
        ['想去的目的地', '（如：珠海）'],
        ['旅行时间', '（如：11月19日 - 11月20日）'],
        ['旅行偏好', '（如：美食、拍照、轻松、亲子等）']
      ],
      tail: '或者直接说：“帮我规划一个珠海两天一夜的行程”'
    },
    ask: '帮我规划一个珠海两天一夜的行程，偏美食和拍照',
    plan: {
      title: '为你生成专属行程',
      tag: '珠海两天一夜 · 美食拍照',
      tabs: ['总览', 'Day1', 'Day2', '美食推荐', '住宿建议'],
      highlights: [
        '打卡日月贝、情侣路、海女等经典机位',
        '品尝珠海本地海鲜与特色小吃',
        '节奏轻松，适合拍照打卡和 citywalk'
      ]
    }
  };

  global.V2 = {
    USERS: USERS,
    CATEGORIES: CATEGORIES,
    TRIPS: TRIPS,
    MY_TRIPS: MY_TRIPS,
    MAP_POINTS: MAP_POINTS,
    ROUTE_STOPS: ROUTE_STOPS,
    CONVOS: CONVOS,
    CHAT: CHAT,
    AI: AI
  };
})(window);