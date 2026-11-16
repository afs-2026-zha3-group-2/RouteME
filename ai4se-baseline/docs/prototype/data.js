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

  /* ---------------- 省市字典（两级，与前端 element-china-area-data 同口径） ----------------
     每行：省码|省名|市码:市名,市码:市名…；直辖市与港澳的二级沿用同一套展示规则。 */
  var AREA_RAW = [
    '110000|北京市|110100:北京市',
    '120000|天津市|120100:天津市',
    '130000|河北省|130100:石家庄市,130200:唐山市,130300:秦皇岛市,130400:邯郸市,130500:邢台市,130600:保定市,130700:张家口市,130800:承德市,130900:沧州市,131000:廊坊市,131100:衡水市',
    '140000|山西省|140100:太原市,140200:大同市,140300:阳泉市,140400:长治市,140500:晋城市,140600:朔州市,140700:晋中市,140800:运城市,140900:忻州市,141000:临汾市,141100:吕梁市',
    '150000|内蒙古自治区|150100:呼和浩特市,150200:包头市,150300:乌海市,150400:赤峰市,150500:通辽市,150600:鄂尔多斯市,150700:呼伦贝尔市,150800:巴彦淖尔市,150900:乌兰察布市,152200:兴安盟,152500:锡林郭勒盟,152900:阿拉善盟',
    '210000|辽宁省|210100:沈阳市,210200:大连市,210300:鞍山市,210400:抚顺市,210500:本溪市,210600:丹东市,210700:锦州市,210800:营口市,210900:阜新市,211000:辽阳市,211100:盘锦市,211200:铁岭市,211300:朝阳市,211400:葫芦岛市',
    '220000|吉林省|220100:长春市,220200:吉林市,220300:四平市,220400:辽源市,220500:通化市,220600:白山市,220700:松原市,220800:白城市,222400:延边朝鲜族自治州',
    '230000|黑龙江省|230100:哈尔滨市,230200:齐齐哈尔市,230300:鸡西市,230400:鹤岗市,230500:双鸭山市,230600:大庆市,230700:伊春市,230800:佳木斯市,230900:七台河市,231000:牡丹江市,231100:黑河市,231200:绥化市,232700:大兴安岭地区',
    '310000|上海市|310100:上海市',
    '320000|江苏省|320100:南京市,320200:无锡市,320300:徐州市,320400:常州市,320500:苏州市,320600:南通市,320700:连云港市,320800:淮安市,320900:盐城市,321000:扬州市,321100:镇江市,321200:泰州市,321300:宿迁市',
    '330000|浙江省|330100:杭州市,330200:宁波市,330300:温州市,330400:嘉兴市,330500:湖州市,330600:绍兴市,330700:金华市,330800:衢州市,330900:舟山市,331000:台州市,331100:丽水市',
    '340000|安徽省|340100:合肥市,340200:芜湖市,340300:蚌埠市,340400:淮南市,340500:马鞍山市,340600:淮北市,340700:铜陵市,340800:安庆市,341000:黄山市,341100:滁州市,341200:阜阳市,341300:宿州市,341500:六安市,341600:亳州市,341700:池州市,341800:宣城市',
    '350000|福建省|350100:福州市,350200:厦门市,350300:莆田市,350400:三明市,350500:泉州市,350600:漳州市,350700:南平市,350800:龙岩市,350900:宁德市',
    '360000|江西省|360100:南昌市,360200:景德镇市,360300:萍乡市,360400:九江市,360500:新余市,360600:鹰潭市,360700:赣州市,360800:吉安市,360900:宜春市,361000:抚州市,361100:上饶市',
    '370000|山东省|370100:济南市,370200:青岛市,370300:淄博市,370400:枣庄市,370500:东营市,370600:烟台市,370700:潍坊市,370800:济宁市,370900:泰安市,371000:威海市,371100:日照市,371300:临沂市,371400:德州市,371500:聊城市,371600:滨州市,371700:菏泽市',
    '410000|河南省|410100:郑州市,410200:开封市,410300:洛阳市,410400:平顶山市,410500:安阳市,410600:鹤壁市,410700:新乡市,410800:焦作市,410900:濮阳市,411000:许昌市,411100:漯河市,411200:三门峡市,411300:南阳市,411400:商丘市,411500:信阳市,411600:周口市,411700:驻马店市,419001:济源市',
    '420000|湖北省|420100:武汉市,420200:黄石市,420300:十堰市,420500:宜昌市,420600:襄阳市,420700:鄂州市,420800:荆门市,420900:孝感市,421000:荆州市,421100:黄冈市,421200:咸宁市,421300:随州市,422800:恩施土家族苗族自治州,429004:仙桃市,429005:潜江市,429006:天门市,429021:神农架林区',
    '430000|湖南省|430100:长沙市,430200:株洲市,430300:湘潭市,430400:衡阳市,430500:邵阳市,430600:岳阳市,430700:常德市,430800:张家界市,430900:益阳市,431000:郴州市,431100:永州市,431200:怀化市,431300:娄底市,433100:湘西土家族苗族自治州',
    '440000|广东省|440100:广州市,440200:韶关市,440300:深圳市,440400:珠海市,440500:汕头市,440600:佛山市,440700:江门市,440800:湛江市,440900:茂名市,441200:肇庆市,441300:惠州市,441400:梅州市,441500:汕尾市,441600:河源市,441700:阳江市,441800:清远市,441900:东莞市,442000:中山市,445100:潮州市,445200:揭阳市,445300:云浮市',
    '450000|广西壮族自治区|450100:南宁市,450200:柳州市,450300:桂林市,450400:梧州市,450500:北海市,450600:防城港市,450700:钦州市,450800:贵港市,450900:玉林市,451000:百色市,451100:贺州市,451200:河池市,451300:来宾市,451400:崇左市',
    '460000|海南省|460100:海口市,460200:三亚市,460300:三沙市,460400:儋州市,469001:五指山市,469002:琼海市,469005:文昌市,469006:万宁市,469007:东方市',
    '500000|重庆市|500100:重庆市',
    '510000|四川省|510100:成都市,510300:自贡市,510400:攀枝花市,510500:泸州市,510600:德阳市,510700:绵阳市,510800:广元市,510900:遂宁市,511000:内江市,511100:乐山市,511300:南充市,511400:眉山市,511500:宜宾市,511600:广安市,511700:达州市,511800:雅安市,511900:巴中市,512000:资阳市,513200:阿坝藏族羌族自治州,513300:甘孜藏族自治州,513400:凉山彝族自治州',
    '520000|贵州省|520100:贵阳市,520200:六盘水市,520300:遵义市,520400:安顺市,520500:毕节市,520600:铜仁市,522300:黔西南布依族苗族自治州,522600:黔东南苗族侗族自治州,522700:黔南布依族苗族自治州',
    '530000|云南省|530100:昆明市,530300:曲靖市,530400:玉溪市,530500:保山市,530600:昭通市,530700:丽江市,530800:普洱市,530900:临沧市,532300:楚雄彝族自治州,532500:红河哈尼族彝族自治州,532600:文山壮族苗族自治州,532800:西双版纳傣族自治州,532900:大理白族自治州,533100:德宏傣族景颇族自治州,533300:怒江傈僳族自治州,533400:迪庆藏族自治州',
    '540000|西藏自治区|540100:拉萨市,540200:日喀则市,540300:昌都市,540400:林芝市,540500:山南市,540600:那曲市,542500:阿里地区',
    '610000|陕西省|610100:西安市,610200:铜川市,610300:宝鸡市,610400:咸阳市,610500:渭南市,610600:延安市,610700:汉中市,610800:榆林市,610900:安康市,611000:商洛市',
    '620000|甘肃省|620100:兰州市,620200:嘉峪关市,620300:金昌市,620400:白银市,620500:天水市,620600:武威市,620700:张掖市,620800:平凉市,620900:酒泉市,621000:庆阳市,621100:定西市,621200:陇南市,622900:临夏回族自治州,623000:甘南藏族自治州',
    '630000|青海省|630100:西宁市,630200:海东市,632200:海北藏族自治州,632300:黄南藏族自治州,632500:海南藏族自治州,632600:果洛藏族自治州,632700:玉树藏族自治州,632800:海西蒙古族藏族自治州',
    '640000|宁夏回族自治区|640100:银川市,640200:石嘴山市,640300:吴忠市,640400:固原市,640500:中卫市',
    '650000|新疆维吾尔自治区|650100:乌鲁木齐市,650200:克拉玛依市,650400:吐鲁番市,650500:哈密市,652300:昌吉回族自治州,652700:博尔塔拉蒙古自治州,652800:巴音郭楞蒙古自治州,652900:阿克苏地区,653000:克孜勒苏柯尔克孜自治州,653100:喀什地区,653200:和田地区,654000:伊犁哈萨克自治州,654200:塔城地区,654300:阿勒泰地区',
    '710000|台湾省|710100:台北市,710200:高雄市,710300:台中市,710400:台南市,710500:新北市,710600:桃园市',
    '810000|香港特别行政区|810100:香港岛,810200:九龙,810300:新界',
    '820000|澳门特别行政区|820100:澳门半岛,820200:离岛'
  ];
  var MUNICIPALITIES = { '110000': 1, '120000': 1, '310000': 1, '500000': 1 };
  var SPECIAL = { '710000': 1, '810000': 1, '820000': 1 };
  var AREAS = [];
  var CITY_BY_CODE = {};
  AREA_RAW.forEach(function (line) {
    var parts = line.split('|');
    var pCode = parts[0], pName = parts[1];
    var pDisplay = SPECIAL[pCode] ? pName.replace('特别行政区', '').replace('省', '') : pName;
    var children = parts[2].split(',').map(function (pair) {
      var kv = pair.split(':');
      var cLabel = MUNICIPALITIES[pCode] ? pName : kv[1];
      CITY_BY_CODE[kv[0]] = {
        provinceCode: pCode, provinceName: pName, provinceDisplayName: pDisplay,
        cityCode: kv[0], cityName: cLabel, cityDisplayName: cLabel
      };
      return { value: kv[0], label: cLabel };
    });
    AREAS.push({ value: pCode, label: pName, children: children });
  });
  function findCity(code) { return code ? CITY_BY_CODE[code] || null : null; }
  /* 摘要/详情口径：普通省「广东省 / 珠海市」；直辖市「北京市」；港澳台「香港 · 中西區」。 */
  function destinationLabel(code) {
    var c = findCity(code);
    if (!c) return '';
    if (MUNICIPALITIES[c.provinceCode]) return c.cityDisplayName;
    if (SPECIAL[c.provinceCode]) return c.provinceDisplayName + ' · ' + c.cityDisplayName;
    return c.provinceDisplayName + ' / ' + c.cityDisplayName;
  }
  /* 卡片口径：只显示市名；直辖市显示省级名；港澳台显示「省 · 二级」。 */
  function cityLabel(code) {
    var c = findCity(code);
    if (!c) return '';
    if (MUNICIPALITIES[c.provinceCode]) return c.provinceDisplayName;
    if (SPECIAL[c.provinceCode]) return c.provinceDisplayName + ' · ' + c.cityDisplayName;
    return c.cityDisplayName;
  }

  /* ---------------- 离线点位库（示意地图，无地图厂商、无网络依赖） ---------------- */
  var MAP_BOUNDS = { minLng: 109.4, maxLng: 117.4, minLat: 20.0, maxLat: 26.0 };
  var RAW_PLACES = [
    { name: '珠海', city: '珠海', kind: 'city', lat: 22.27, lng: 113.58, aliases: ['珠海市', '香洲'] },
    { name: '广州', city: '广州', kind: 'city', lat: 23.13, lng: 113.26, aliases: ['广州市', '羊城'] },
    { name: '深圳', city: '深圳', kind: 'city', lat: 22.55, lng: 114.06, aliases: ['深圳市', '鹏城'] },
    { name: '佛山', city: '佛山', kind: 'city', lat: 23.03, lng: 113.12, aliases: ['佛山市'] },
    { name: '清远', city: '清远', kind: 'city', lat: 23.68, lng: 113.06, aliases: ['清远市'] },
    { name: '中山', city: '中山', kind: 'city', lat: 22.52, lng: 113.39, aliases: ['中山市'] },
    { name: '江门', city: '江门', kind: 'city', lat: 22.58, lng: 113.08, aliases: ['江门市'] },
    { name: '肇庆', city: '肇庆', kind: 'city', lat: 23.05, lng: 112.47, aliases: ['肇庆市'] },
    { name: '惠州', city: '惠州', kind: 'city', lat: 23.11, lng: 114.42, aliases: ['惠州市'] },
    { name: '东莞', city: '东莞', kind: 'city', lat: 23.02, lng: 113.75, aliases: ['东莞市'] },
    { name: '阳江', city: '阳江', kind: 'city', lat: 21.86, lng: 111.98, aliases: ['阳江市'] },
    { name: '湛江', city: '湛江', kind: 'city', lat: 21.27, lng: 110.36, aliases: ['湛江市'] },
    { name: '韶关', city: '韶关', kind: 'city', lat: 24.81, lng: 113.60, aliases: ['韶关市'] },
    { name: '汕头', city: '汕头', kind: 'city', lat: 23.35, lng: 116.68, aliases: ['汕头市'] },
    { name: '香港', city: '香港', kind: 'city', lat: 22.32, lng: 114.17, aliases: ['香港特别行政区', 'Hong Kong'] },
    { name: '澳门', city: '澳门', kind: 'city', lat: 22.19, lng: 113.55, aliases: ['澳门特别行政区', 'Macau'] },
    { name: '香洲港', city: '珠海', kind: 'poi', lat: 22.29, lng: 113.60, aliases: ['香洲码头', '九洲港'] },
    { name: '情侣路', city: '珠海', kind: 'poi', lat: 22.26, lng: 113.58, aliases: ['情侣中路'] },
    { name: '珠海渔女', city: '珠海', kind: 'poi', lat: 22.26, lng: 113.59, aliases: ['渔女'] },
    { name: '日月贝', city: '珠海', kind: 'poi', lat: 22.28, lng: 113.60, aliases: ['珠海大剧院'] },
    { name: '圆明新园', city: '珠海', kind: 'poi', lat: 22.25, lng: 113.53, aliases: [] },
    { name: '外伶仃岛', city: '珠海', kind: 'poi', lat: 22.10, lng: 114.03, aliases: ['伶仃岛'] },
    { name: '东澳岛', city: '珠海', kind: 'poi', lat: 22.02, lng: 113.71, aliases: [] },
    { name: '港珠澳大桥', city: '珠海', kind: 'poi', lat: 22.20, lng: 113.85, aliases: ['大桥口岸'] },
    { name: '广州塔', city: '广州', kind: 'poi', lat: 23.11, lng: 113.32, aliases: ['小蛮腰'] },
    { name: '沙面岛', city: '广州', kind: 'poi', lat: 23.11, lng: 113.24, aliases: ['沙面'] },
    { name: '永庆坊', city: '广州', kind: 'poi', lat: 23.12, lng: 113.24, aliases: ['恩宁路'] },
    { name: '白云山', city: '广州', kind: 'poi', lat: 23.18, lng: 113.30, aliases: [] },
    { name: '北京路', city: '广州', kind: 'poi', lat: 23.13, lng: 113.27, aliases: ['北京路步行街'] },
    { name: '陈家祠', city: '广州', kind: 'poi', lat: 23.13, lng: 113.24, aliases: ['陈家祠地铁站'] },
    { name: '深圳湾公园', city: '深圳', kind: 'poi', lat: 22.51, lng: 113.95, aliases: ['深圳湾'] },
    { name: '大梅沙', city: '深圳', kind: 'poi', lat: 22.60, lng: 114.31, aliases: ['大梅沙海滨公园'] },
    { name: '世界之窗', city: '深圳', kind: 'poi', lat: 22.54, lng: 113.97, aliases: [] },
    { name: '梧桐山', city: '深圳', kind: 'poi', lat: 22.58, lng: 114.19, aliases: [] },
    { name: '前海石公园', city: '深圳', kind: 'poi', lat: 22.52, lng: 113.89, aliases: ['前海'] },
    { name: '佛山祖庙', city: '佛山', kind: 'poi', lat: 23.03, lng: 113.11, aliases: ['祖庙'] },
    { name: '岭南天地', city: '佛山', kind: 'poi', lat: 23.03, lng: 113.11, aliases: [] },
    { name: '西樵山', city: '佛山', kind: 'poi', lat: 22.93, lng: 112.98, aliases: [] },
    { name: '逢简水乡', city: '佛山', kind: 'poi', lat: 22.78, lng: 113.13, aliases: ['逢简'] },
    { name: '古龙峡', city: '清远', kind: 'poi', lat: 23.55, lng: 113.05, aliases: ['古龙峡漂流'] },
    { name: '连州地下河', city: '清远', kind: 'poi', lat: 24.78, lng: 112.38, aliases: ['地下河'] },
    { name: '孙中山故里', city: '中山', kind: 'poi', lat: 22.44, lng: 113.44, aliases: ['翠亨村'] },
    { name: '孙文西路', city: '中山', kind: 'poi', lat: 22.52, lng: 113.38, aliases: ['孙文西路步行街'] },
    { name: '开平碉楼', city: '江门', kind: 'poi', lat: 22.37, lng: 112.58, aliases: ['碉楼群'] },
    { name: '上下川岛', city: '江门', kind: 'poi', lat: 21.68, lng: 112.77, aliases: ['上川岛', '下川岛'] },
    { name: '七星岩', city: '肇庆', kind: 'poi', lat: 23.08, lng: 112.46, aliases: [] },
    { name: '鼎湖山', city: '肇庆', kind: 'poi', lat: 23.16, lng: 112.55, aliases: [] },
    { name: '巽寮湾', city: '惠州', kind: 'poi', lat: 22.71, lng: 114.74, aliases: ['巽寮'] },
    { name: '双月湾', city: '惠州', kind: 'poi', lat: 22.57, lng: 114.89, aliases: [] },
    { name: '海陵岛', city: '阳江', kind: 'poi', lat: 21.58, lng: 111.85, aliases: ['闸坡'] },
    { name: '维多利亚港', city: '香港', kind: 'poi', lat: 22.29, lng: 114.17, aliases: ['维港', '尖沙咀海滨'] },
    { name: '大三巴牌坊', city: '澳门', kind: 'poi', lat: 22.19, lng: 113.54, aliases: ['大三巴'] },
    { name: '官也街', city: '澳门', kind: 'poi', lat: 22.15, lng: 113.56, aliases: [] }
  ];
  var PLACES = RAW_PLACES.map(function (p) {
    p.id = p.city + '-' + p.name;
    return p;
  });
  function normPlace(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ''); }
  function findPlaceByName(value) {
    var q = normPlace(value);
    if (!q) return null;
    for (var i = 0; i < PLACES.length; i++) {
      var p = PLACES[i];
      if (normPlace(p.name) === q) return p;
      for (var j = 0; j < p.aliases.length; j++) if (normPlace(p.aliases[j]) === q) return p;
    }
    return null;
  }
  /* 评分检索：精确 100 / 前缀 70 / 包含 45 / 城市 25，城市节点 +3。 */
  function searchPlaces(query, limit) {
    var needle = normPlace(query);
    if (!needle) return [];
    var scored = [];
    PLACES.forEach(function (p) {
      var name = normPlace(p.name);
      var aliases = p.aliases.map(normPlace);
      var score = 0;
      if (name === needle || aliases.indexOf(needle) > -1) score = 100;
      else if (name.indexOf(needle) === 0 || aliases.some(function (a) { return a.indexOf(needle) === 0; })) score = 70;
      else if (name.indexOf(needle) > -1 || aliases.some(function (a) { return a.indexOf(needle) > -1; })) score = 45;
      else if (normPlace(p.city).indexOf(needle) > -1) score = 25;
      if (score > 0) scored.push({ place: p, score: score + (p.kind === 'city' ? 3 : 0) });
    });
    scored.sort(function (a, b) { return b.score - a.score || a.place.name.length - b.place.name.length; });
    return scored.slice(0, limit || 8).map(function (x) { return x.place; });
  }
  function resolvePlace(value) {
    return findPlaceByName(value) || searchPlaces(value, 1)[0] || null;
  }
  function projectLatLng(lat, lng) {
    return {
      x: ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100,
      y: ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100
    };
  }
  function projectPlace(p) { return projectLatLng(p.lat, p.lng); }
  function placesInCity(city) {
    return PLACES.filter(function (p) { return p.city === city || p.name === city; });
  }
  /* 目的地码 → 地名库城市；未覆盖返回 null（不渲染地图）。 */
  var COVERED_CITIES = {};
  PLACES.forEach(function (p) { COVERED_CITIES[p.city] = 1; });
  function gazetteerCityForCode(code) {
    var c = findCity(code);
    if (!c) return null;
    if (c.provinceCode === '810000') return COVERED_CITIES['香港'] ? '香港' : null;
    if (c.provinceCode === '820000') return COVERED_CITIES['澳门'] ? '澳门' : null;
    var name = c.cityName.replace(/市$/, '');
    return COVERED_CITIES[name] ? name : null;
  }
  var LAND_OUTLINE = [
    [109.7, 24.9], [110.2, 25.4], [111.6, 25.5], [113.2, 25.4], [114.7, 25.1],
    [115.8, 25.3], [116.8, 24.9], [117.2, 24.2], [116.9, 23.6], [116.5, 23.2],
    [115.6, 22.9], [114.4, 22.7], [113.9, 22.5], [113.75, 22.1], [113.4, 21.9],
    [112.9, 21.7], [112.3, 21.6], [111.5, 21.4], [110.6, 21.2], [110.2, 21.5],
    [109.8, 22.2], [109.7, 23.2]
  ];
  var LAND_PATH = LAND_OUTLINE.map(function (pair, i) {
    var pt = projectLatLng(pair[1], pair[0]);
    return (i === 0 ? 'M' : 'L') + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2);
  }).join(' ') + ' Z';
  var ISLANDS = PLACES.filter(function (p) { return p.kind === 'poi' && /岛$/.test(p.name); })
    .map(function (p) {
      var pt = projectPlace(p);
      return { x: Number(pt.x.toFixed(2)), y: Number(pt.y.toFixed(2)), r: 1.6 };
    });

  /* ---------------- 资料选项字典（与前端 profileOptions 同值） ---------------- */
  var GENDERS = ['男', '女', '其他'];
  var JOB_OTHER = '其他';
  var JOBS = ['学生', '上班族', '自由职业', JOB_OTHER];
  var TRAVEL_STYLES = ['特种兵', '休闲游', '深度游', '随性游'];
  var MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
  var PRESET_INTERESTS = [
    { value: '自然', label: '自然风景' }, { value: '历史', label: '文化历史' },
    { value: '展览', label: '看展' }, { value: '城市漫步', label: 'Citywalk' },
    { value: '美食', label: '美食' }, { value: '摄影', label: '摄影' },
    { value: '徒步', label: '徒步' }, { value: '户外', label: '户外' },
    { value: '露营', label: '露营' }, { value: '夜景', label: '夜景' },
    { value: '骑行', label: '骑行' }, { value: '咖啡', label: '咖啡' }
  ];
  function interestLabel(value) {
    for (var i = 0; i < PRESET_INTERESTS.length; i++) {
      if (PRESET_INTERESTS[i].value === value) return PRESET_INTERESTS[i].label;
    }
    return value;
  }
  var PROFILE_CITIES = ['广州', '深圳', '杭州', '成都', '上海', '北京', '珠海', '厦门', '重庆', '西安', '南京', '武汉', '长沙', '苏州', '青岛'];
  var PROFILE_LIMITS = {
    minInterests: 3, maxInterests: 5, maxInterestLength: 12,
    maxNickname: 20, maxCity: 40, maxSchool: 80, maxBio: 500, maxJob: 20, minBirthday: '1900-01-01'
  };

  /* 演示口令散列：原型无服务端，仅做本机混淆，不是安全存储。 */
  function demoHash(pw) {
    var h = 5381;
    for (var i = 0; i < pw.length; i++) h = ((h * 33) ^ pw.charCodeAt(i)) >>> 0;
    return 'h' + h.toString(36);
  }
  var SEED_ACCOUNTS = [
    { userId: 'u_lin', username: 'linjianxia', password: '123456' },
    { userId: 'u_chen', username: 'chenyu', password: '123456' },
    { userId: 'u_su', username: 'sunian', password: '123456' }
  ];

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
        interests: ['摄影', '海边', '美食'], joinedAt: offsetTime(-64, 10, 0),
        username: 'linjianxia', city: '珠海', birthday: '', gender: '', major: '', job: '', mbti: '', travelStyle: '', avatarUrl: ''
      },
      {
        id: 'u_chen', nickname: '陈屿', initial: '屿', hue: 168, school: '研一 · 地理科学',
        bio: '周末基本在山里。走过的东西会记轨迹和补给点，队伍里我负责收尾，不会把人落下。',
        interests: ['徒步', '自然', '露营'], joinedAt: offsetTime(-91, 10, 0),
        username: 'chenyu', city: '广州', birthday: '', gender: '', major: '', job: '', mbti: '', travelStyle: '', avatarUrl: ''
      },
      {
        id: 'u_su', nickname: '苏念', initial: '念', hue: 272, school: '大二 · 新闻学',
        bio: '为了吃可以跨城。逛展和夜市是我的固定行程，走路不快，行程里一定留坐下来的时间。',
        interests: ['美食', '展览', '夜景'], joinedAt: offsetTime(-38, 10, 0),
        username: 'sunian', city: '广州', birthday: '', gender: '', major: '', job: '', mbti: '', travelStyle: '', avatarUrl: ''
      }
    ];

    var trips = [
      {
        id: 't_zhuhai_1', creatorId: 'u_lin', title: '珠海情侣路摄影一日游',
        destination: '珠海', destinationCode: '440400', terrain: 'coast',
        startDate: offsetDay(-9), endDate: offsetDay(-9),
        stops: ['香洲港集合', '情侣路骑行段', '海滨泳场日落机位', '野狸岛夜景'],
        meetingArea: '香洲港公交站', budgetMin: 120, budgetMax: 200,
        tags: ['摄影', '海边', '美食'], capacity: 4, status: 'COMPLETED',
        note: '以拍照为主，走得不快。日落后收工，不熬夜。',
        createdAt: offsetTime(-20, 21, 12)
      },
      {
        id: 't_qingyuan_1', creatorId: 'u_chen', title: '清远英西峰林两日露营',
        destination: '清远', destinationCode: '441800', terrain: 'mountain',
        startDate: offsetDay(-16), endDate: offsetDay(-15),
        stops: ['英德西站集合', '峰林徒步 8km', '营地扎营', '次日日出观景台', '返程'],
        meetingArea: '英德西站出站口', budgetMin: 300, budgetMax: 450,
        tags: ['露营', '自然', '徒步'], capacity: 5, status: 'COMPLETED',
        note: '需自备帐篷或提前说一声借用。第二天有一段爬升，膝盖不好的慎选。',
        createdAt: offsetTime(-30, 19, 40)
      },
      {
        id: 't_zhuhai_2', creatorId: 'u_chen', title: '珠海情侣路日落机位二刷',
        destination: '珠海', destinationCode: '440400', terrain: 'coast',
        startDate: offsetDay(1), endDate: offsetDay(1),
        stops: ['香洲港集合', '情侣北路步行', '海滨泳场日落', '大排档晚饭'],
        meetingArea: '香洲港公交站', budgetMin: 100, budgetMax: 180,
        meetingTime: offsetDay(1) + 'T08:30',
        tags: ['摄影', '海边'], capacity: 3, status: 'RECRUITING',
        note: '上次拍完发现西侧还有个机位没试。这次轻装，只带一机两镜。',
        createdAt: offsetTime(-3, 22, 5)
      },
      {
        id: 't_guangzhou_1', creatorId: 'u_su', title: '广州老城骑楼扫街半日',
        destination: '广州', destinationCode: '440100', terrain: 'city',
        startDate: offsetDay(1), endDate: offsetDay(1),
        stops: ['陈家祠地铁站集合', '恩宁路骑楼', '永庆坊', '宝华面店午饭', '上下九收尾'],
        meetingArea: '陈家祠地铁站 D 口', budgetMin: 80, budgetMax: 150,
        meetingTime: offsetDay(1) + 'T09:00',
        tags: ['摄影', '历史', '美食'], capacity: 4, status: 'RECRUITING',
        note: '走街串巷为主，随时可以停下来吃东西。不赶景点。',
        createdAt: offsetTime(-5, 12, 30)
      },
      {
        id: 't_shenzhen_1', creatorId: 'u_chen', title: '深圳大鹏半岛海岸线徒步',
        destination: '深圳', destinationCode: '440300', terrain: 'coast',
        startDate: offsetDay(8), endDate: offsetDay(9),
        stops: ['大鹏所城集合', '东西涌穿越 12km', '天文台观景', '民宿休整', '次日杨梅坑骑行'],
        meetingArea: '大鹏所城正门', budgetMin: 400, budgetMax: 600,
        tags: ['徒步', '海边', '自然'], capacity: 6, status: 'RECRUITING',
        note: '东西涌全程礁石路，必须穿抓地好的鞋。会控制配速，中途有两个退出点。',
        createdAt: offsetTime(-2, 20, 15)
      },
      {
        id: 't_foshan_1', creatorId: 'u_su', title: '佛山顺德一日觅食',
        destination: '佛山', destinationCode: '440600', terrain: 'city',
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
      session: false,
      accounts: SEED_ACCOUNTS.map(function (a) {
        return { userId: a.userId, username: a.username, passHash: demoHash(a.password) };
      }),
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
    AREAS: AREAS,
    MUNICIPALITIES: MUNICIPALITIES,
    SPECIAL: SPECIAL,
    findCity: findCity,
    destinationLabel: destinationLabel,
    cityLabel: cityLabel,
    MAP_BOUNDS: MAP_BOUNDS,
    PLACES: PLACES,
    findPlaceByName: findPlaceByName,
    searchPlaces: searchPlaces,
    resolvePlace: resolvePlace,
    projectLatLng: projectLatLng,
    projectPlace: projectPlace,
    placesInCity: placesInCity,
    gazetteerCityForCode: gazetteerCityForCode,
    LAND_PATH: LAND_PATH,
    ISLANDS: ISLANDS,
    GENDERS: GENDERS,
    JOB_OTHER: JOB_OTHER,
    JOBS: JOBS,
    TRAVEL_STYLES: TRAVEL_STYLES,
    MBTI_TYPES: MBTI_TYPES,
    PRESET_INTERESTS: PRESET_INTERESTS,
    interestLabel: interestLabel,
    PROFILE_CITIES: PROFILE_CITIES,
    PROFILE_LIMITS: PROFILE_LIMITS,
    demoHash: demoHash,
    SEED_ACCOUNTS: SEED_ACCOUNTS,
    buildSeed: buildSeed,
    offsetDay: offsetDay,
    iso: iso
  };
})(window);
