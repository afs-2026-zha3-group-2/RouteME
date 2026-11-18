package routeme.response;

/**
 * 前往第三方投保的跳转地址；RouteMe 不在此步骤扣款或生成保单。
 */
public record InsuranceRedirectResponse(String redirectUrl) {
}