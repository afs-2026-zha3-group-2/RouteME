/**
 * 同行者 Mock 数据。仅作为独立数据模型存在：页面不写死百分比、日期或偏好。
 * userId / tripId 指向演示账户与行程，保证「查看资料」「发起邀请」可跳转。
 */

import type { TravelCompanion } from './companions';

export const MOCK_COMPANIONS: TravelCompanion[] = [
  {
    id: 'companion-linyi',
    userId: 1,
    tripId: 1,
    name: '林一',
    avatarInitial: '林',
    bio: '在广州读了四年书，喜欢沿着珠江散步，也喜欢把老城小吃排进路线里。',
    homeCity: '广州',
    age: 22,
    dateRange: ['2026-11-20', '2026-11-22'],
    preferences: ['城市漫步', '摄影', '夜景'],
    overlapPercent: 85,
    sharedStops: ['广州塔', '海心沙', '花城广场', '北京路步行街'],
    route: ['广州塔', '海心沙', '花城广场', '北京路步行街'],
  },
  {
    id: 'companion-alan',
    userId: 2,
    tripId: 5,
    name: '阿岚',
    avatarInitial: '岚',
    bio: '周末从深圳过来，偏爱江边和夜景，拍照不赶路，愿意为一家糖水店绕路。',
    homeCity: '深圳',
    age: 24,
    dateRange: ['2026-11-21', '2026-11-23'],
    preferences: ['夜景', '美食', '慢旅行'],
    overlapPercent: 70,
    sharedStops: ['广州塔', '海心沙', '北京路步行街'],
    route: ['广州塔', '海心沙', '北京路步行街', '上下九'],
  },
  {
    id: 'companion-xiaoman',
    userId: 4,
    tripId: 7,
    name: '小满',
    avatarInitial: '满',
    bio: '做产品也做路线，喜欢把行程排松一点，留出临时改主意的空间。',
    homeCity: '上海',
    age: 27,
    dateRange: ['2026-11-22', '2026-11-24'],
    preferences: ['城市漫步', '咖啡', '展览'],
    overlapPercent: 55,
    sharedStops: ['花城广场', '海心沙'],
    route: ['花城广场', '海心沙', '广东省博物馆', '珠江夜游'],
  },
];