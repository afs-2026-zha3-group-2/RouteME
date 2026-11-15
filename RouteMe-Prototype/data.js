/* RouteMe 路觅 · 演示数据与常量
   日期全部相对“今天”生成，保证任何时候打开演示都成立。 */
(function (global) {
  'use strict';

  var TAGS = ['摄影', '美食', '海边', '徒步', '露营', '历史', '展览', '夜景', '自然', '骑行', '市集', '温泉'];
  var DESTINATIONS = ['珠海', '广州', '深圳', '佛山', '清远', '中山', '江门', '肇庆'];

  var INTENSITY = {
    RELAXED: { label: '轻松', desc: '走走停停，随时能坐下', tone: 'jade' },
    MODERATE: { label: '适中', desc: '正常步速，午后会累', tone: 'amber' },
    TIRING: { label: '较累', desc: '需要体力和一双好鞋', tone: 'coral' }
  };

  var TRIP_STATUS = {
    RECRUITING: { label: '招募中', tone: 'surf' },
    FULL: { label: '已满员', tone: 'amber' },
    COMPLETED: { label: '已结束', tone: 'muted' },
    CANCELLED: { label: '已取消', tone: 'danger' }
  };

  var APP_STATUS = {
    PENDING: { label: '待处理', tone: 'amber' },
    ACCEPTED: { label: '已接受', tone: 'jade' },
    REJECTED: { label: '已拒绝', tone: 'danger' },
    CANCELLED: { label: '已取消', tone: 'muted' }
  };

  var TERRAIN = {
    coast: { label: '海岸线', hue: 190 },
    mountain: { label: '山野', hue: 152 },
    city: { label: '城市街巷', hue: 268 }
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function offsetDay(n) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function offsetTime(dayOff, h, m) {
    var d = new Date();
    d.setDate(d.getDate() + dayOff);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  function buildSeed() {
    var users = [
      {
        id: 'u_lin', nickname: '林见夏', initial: '夏', hue: 18, school: '大三 · 视觉传达',
        bio: '拍照比走路多。喜欢日落前一小时的光，能为了一个机位等很久。预算不高，但愿意为好吃的多走两公里。',
        interests: ['摄影', '海边', '美食'], joinedAt: offsetTime(-64, 10, 0)
      },
      {
        id: 'u_chen', nickname: '陈屿', initial: '屿', hue: 168, school: '研一 · 地理科学',
        bio: '周末基本在山里。走过的东西会记轨迹和补给点，队伍里我负责收尾，不会把人落下。',
        interests: ['徒步', '自然', '露营'], joinedAt: offsetTime(-91, 10, 0)
      },
      {
        id: 'u_su', nickname: '苏念', initial: '念', hue: 272, school: '大二 · 新闻学',
        bio: '为了吃可以跨城。逛展和夜市是我的固定行程，走路不快，行程里一定留坐下来的时间。',
        interests: ['美食', '展览', '夜景'], joinedAt: offsetTime(-38, 10, 0)
      }
    ];

    var trips = [
      {
        id: 't_zhuhai_1', creatorId: 'u_lin', title: '珠海情侣路摄影一日游',
        destination: '珠海', terrain: 'coast',
        startDate: offsetDay(-9), endDate: offsetDay(-9),
        stops: ['香洲港集合', '情侣路骑行段', '海滨泳场日落机位', '野狸岛夜景'],
        meetingArea: '香洲港公交站', budgetMin: 120, budgetMax: 200,
        tags: ['摄影', '海边', '美食'], capacity: 4, status: 'COMPLETED',
        note: '以拍照为主，走得不快。日落后收工，不熬夜。',
        createdAt: offsetTime(-20, 21, 12)
      },
      {
        id: 't_qingyuan_1', creatorId: 'u_chen', title: '清远英西峰林两日露营',
        destination: '清远', terrain: 'mountain',
        startDate: offsetDay(-16), endDate: offsetDay(-15),
        stops: ['英德西站集合', '峰林徒步 8km', '营地扎营', '次日日出观景台', '返程'],
        meetingArea: '英德西站出站口', budgetMin: 300, budgetMax: 450,
        tags: ['露营', '自然', '徒步'], capacity: 5, status: 'COMPLETED',
        note: '需自备帐篷或提前说一声借用。第二天有一段爬升，膝盖不好的慎选。',
        createdAt: offsetTime(-30, 19, 40)
      },
      {
        id: 't_zhuhai_2', creatorId: 'u_chen', title: '珠海情侣路日落机位二刷',
        destination: '珠海', terrain: 'coast',
        startDate: offsetDay(1), endDate: offsetDay(1),
        stops: ['香洲港集合', '情侣北路步行', '海滨泳场日落', '大排档晚饭'],
        meetingArea: '香洲港公交站', budgetMin: 100, budgetMax: 180,
        tags: ['摄影', '海边'], capacity: 3, status: 'RECRUITING',
        note: '上次拍完发现西侧还有个机位没试。这次轻装，只带一机两镜。',
        createdAt: offsetTime(-3, 22, 5)
      },
      {
        id: 't_guangzhou_1', creatorId: 'u_su', title: '广州老城骑楼扫街半日',
        destination: '广州', terrain: 'city',
        startDate: offsetDay(1), endDate: offsetDay(1),
        stops: ['陈家祠地铁站集合', '恩宁路骑楼', '永庆坊', '宝华面店午饭', '上下九收尾'],
        meetingArea: '陈家祠地铁站 D 口', budgetMin: 80, budgetMax: 150,
        tags: ['摄影', '历史', '美食'], capacity: 4, status: 'RECRUITING',
        note: '走街串巷为主，随时可以停下来吃东西。不赶景点。',
        createdAt: offsetTime(-5, 12, 30)
      },
      {
        id: 't_shenzhen_1', creatorId: 'u_chen', title: '深圳大鹏半岛海岸线徒步',
        destination: '深圳', terrain: 'coast',
        startDate: offsetDay(8), endDate: offsetDay(9),
        stops: ['大鹏所城集合', '东西涌穿越 12km', '天文台观景', '民宿休整', '次日杨梅坑骑行'],
        meetingArea: '大鹏所城正门', budgetMin: 400, budgetMax: 600,
        tags: ['徒步', '海边', '自然'], capacity: 6, status: 'RECRUITING',
        note: '东西涌全程礁石路，必须穿抓地好的鞋。会控制配速，中途有两个退出点。',
        createdAt: offsetTime(-2, 20, 15)
      },
      {
        id: 't_foshan_1', creatorId: 'u_su', title: '佛山顺德一日觅食',
        destination: '佛山', terrain: 'city',
        startDate: offsetDay(2), endDate: offsetDay(2),
        stops: ['顺德大良集合', '早茶', '清晖园', '双皮奶老店', '夜市收尾'],
        meetingArea: '大良钟楼公园', budgetMin: 150, budgetMax: 250,
        tags: ['美食', '市集'], capacity: 3, status: 'FULL',
        note: '一天五顿，按顿走。吃不下可以中途休息，不强求。',
        createdAt: offsetTime(-7, 9, 50)
      }
    ];

    var applications = [
      { id: 'a_1', tripId: 't_zhuhai_2', applicantId: 'u_lin', message: '上次那条线我走过，想试试你说的西侧机位，我带三脚架。', status: 'PENDING', createdAt: offsetTime(-2, 10, 20) },
      { id: 'a_2', tripId: 't_guangzhou_1', applicantId: 'u_lin', message: '想拍骑楼的光影，广角和定焦都带了，走多慢都行。', status: 'ACCEPTED', createdAt: offsetTime(-4, 15, 10), decidedAt: offsetTime(-4, 18, 2) },
      { id: 'a_3', tripId: 't_foshan_1', applicantId: 'u_lin', message: '五顿我可以，拍照顺便记录一下店。', status: 'ACCEPTED', createdAt: offsetTime(-6, 11, 0), decidedAt: offsetTime(-6, 12, 30) },
      { id: 'a_4', tripId: 't_foshan_1', applicantId: 'u_chen', message: '刚爬完山，正好需要一天不动腿的行程。', status: 'ACCEPTED', createdAt: offsetTime(-6, 13, 15), decidedAt: offsetTime(-6, 14, 0) },
      { id: 'a_5', tripId: 't_shenzhen_1', applicantId: 'u_su', message: '东西涌我走过一次，想再走。配速慢一点可以吗？', status: 'PENDING', createdAt: offsetTime(-1, 21, 40) },
      { id: 'a_6', tripId: 't_zhuhai_1', applicantId: 'u_chen', message: '想学一下怎么等光，顺便骑车。', status: 'ACCEPTED', createdAt: offsetTime(-18, 9, 0), decidedAt: offsetTime(-18, 10, 0) },
      { id: 'a_7', tripId: 't_qingyuan_1', applicantId: 'u_su', message: '没露营过，装备可以借吗？我不怕走路。', status: 'ACCEPTED', createdAt: offsetTime(-27, 20, 0), decidedAt: offsetTime(-26, 9, 0) }
    ];

    var messages = [
      { id: 'm_1', tripId: 't_guangzhou_1', senderId: 'u_su', receiverId: 'u_lin', content: '周六早上九点陈家祠地铁 D 口集合，可以吗？', sentAt: offsetTime(-3, 9, 12) },
      { id: 'm_2', tripId: 't_guangzhou_1', senderId: 'u_lin', receiverId: 'u_su', content: '可以。我带广角，恩宁路那段想拍骑楼底下的光。', sentAt: offsetTime(-3, 9, 20) },
      { id: 'm_3', tripId: 't_guangzhou_1', senderId: 'u_su', receiverId: 'u_lin', content: '那中午留久一点，宝华面店要排队。我在附近读书，路我熟。', sentAt: offsetTime(-3, 9, 24) },
      { id: 'm_4', tripId: 't_guangzhou_1', senderId: 'u_lin', receiverId: 'u_su', content: '好，那我把三脚架收起来，轻装走。', sentAt: offsetTime(-3, 9, 31) }
    ];

    var experiences = [
      {
        id: 'e_1', tripId: 't_zhuhai_1', authorId: 'u_chen',
        content: '整条线基本没有爬升，骑行段风很大但很值。日落前四十分钟到海滨泳场刚好，再晚机位就满了。晚饭后野狸岛那段灯光偏黄，白平衡要手动调。',
        intensity: 'MODERATE',
        advice: '带一件防风外套，海边傍晚温差比市区大。三脚架能不带就不带，走到第三个点会后悔。',
        createdAt: offsetTime(-8, 22, 10)
      },
      {
        id: 'e_2', tripId: 't_qingyuan_1', authorId: 'u_su',
        content: '第一天八公里比想象中累，最后两公里全是碎石。但营地那晚的天完全值得。第二天日出要五点半起，观景台风大到站不稳。',
        intensity: 'TIRING',
        advice: '鞋一定要抓地，普通跑鞋会滑。水和补给在山下买齐，上面没有小卖部。膝盖不好的可以只走第一天。',
        createdAt: offsetTime(-14, 20, 45)
      }
    ];

    return {
      version: 1,
      currentUserId: null,
      users: users,
      trips: trips,
      applications: applications,
      messages: messages,
      experiences: experiences,
      reports: [],
      savedViews: [
        { id: 'v_1', name: '本周海边', destination: '珠海', from: '', to: '', tags: ['海边'], sort: 'match' }
      ],
      seq: 100
    };
  }

  global.RMData = {
    TAGS: TAGS,
    DESTINATIONS: DESTINATIONS,
    INTENSITY: INTENSITY,
    TRIP_STATUS: TRIP_STATUS,
    APP_STATUS: APP_STATUS,
    TERRAIN: TERRAIN,
    buildSeed: buildSeed,
    offsetDay: offsetDay,
    iso: iso
  };
})(window);
