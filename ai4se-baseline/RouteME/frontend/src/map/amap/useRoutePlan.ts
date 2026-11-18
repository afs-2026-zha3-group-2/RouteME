/**
 * 路线规划状态机：按钮闸门、自动重算、直线降级与失败文案。
 *
 * <p>探索页与发布页共用同一套规划口径（逐段请求、按顺序拼接、距离与时长同源），
 * 差异只在调用方注入的文案：探索页解释高德错误原文，发布页用中性提示。
 */

import { useEffect, useRef, useState } from 'react';
import {
  amapErrorMessage,
  planRoute,
  straightLineRoute,
  type RoutePlan,
  type RouteWaypoint,
  type TravelMode,
} from './AmapService';

export type RoutePlanMessages = {
  /** 错误原因 → 面向用户的失败说明；缺省用 amapErrorMessage。 */
  describeFailure?: (reason: unknown) => string;
  /** 直线降级提示；入参是 describeFailure 的结果。 */
  fallbackNote: (failure: string) => string;
};

export type RoutePlanState = {
  route: RoutePlan | null;
  planning: boolean;
  routeError: string | null;
  estimateNote: string | null;
  routeRequested: boolean;
  /** 首次生成：清掉上一次的错误与提示，开始规划。 */
  generate: () => void;
  /** 清空途经点后复位，避免错误提示残留。 */
  reset: () => void;
};

export function useRoutePlan(
  waypoints: RouteWaypoint[],
  mode: TravelMode,
  city: string | undefined,
  messages: RoutePlanMessages,
): RoutePlanState {
  const [routeRequested, setRouteRequested] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [estimateNote, setEstimateNote] = useState<string | null>(null);

  // 文案对象通常每帧新建，放依赖数组会让每次渲染都重新规划；只读最新值即可。
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    if (!routeRequested || waypoints.length < 2) {
      setRoute(null);
      setEstimateNote(null);
      return;
    }
    let active = true;
    setPlanning(true);
    setRouteError(null);
    setEstimateNote(null);

    const describeFailure = messagesRef.current.describeFailure ?? amapErrorMessage;
    planRoute(mode, waypoints, mode === 'transit' ? city : undefined)
      .then((plan) => {
        if (active) {
          setRoute(plan);
          setPlanning(false);
        }
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }
        setPlanning(false);
        try {
          // 路线服务不可用时仍按直线展示途经点顺序，避免整块地图空白。
          setRoute(straightLineRoute(mode, waypoints));
          setRouteError(null);
          setEstimateNote(messagesRef.current.fallbackNote(describeFailure(reason)));
        } catch {
          setRoute(null);
          setRouteError(describeFailure(reason));
        }
      });

    return () => {
      active = false;
    };
  }, [routeRequested, waypoints, mode, city]);

  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteRequested(false);
    }
  }, [waypoints.length]);

  const generate = () => {
    if (waypoints.length < 2) {
      return;
    }
    setRouteRequested(true);
  };

  const reset = () => {
    setRouteRequested(false);
    setPlanning(false);
    setRoute(null);
    setRouteError(null);
    setEstimateNote(null);
  };

  return {
    route,
    planning,
    routeError,
    estimateNote,
    routeRequested,
    generate,
    reset,
  };
}