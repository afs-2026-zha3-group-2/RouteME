package routeme.response;

/**
 * 实际保险服务提供方：名称与保单 / 理赔 / 紧急求助入口，均来自服务端配置。
 */
public record InsuranceProviderResponse(
        String name,
        String policyUrl,
        String claimUrl,
        String emergencyUrl) {
}