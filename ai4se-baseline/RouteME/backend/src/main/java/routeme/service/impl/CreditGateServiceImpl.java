package routeme.service.impl;

import org.springframework.stereotype.Service;

import routeme.constant.CreditLearningConstant;
import routeme.exception.CreditScoreBelowSixtyException;
import routeme.pojo.UserCredit;
import routeme.service.CreditGateService;
import routeme.service.CreditService;

/**
 * 门禁只读一次分数，不改账：分数恢复由安全学习链路负责。
 */
@Service
public class CreditGateServiceImpl implements CreditGateService {

    private final CreditService creditService;

    public CreditGateServiceImpl(CreditService creditService) {
        this.creditService = creditService;
    }

    @Override
    public void assertCanPublish(long userId) {
        UserCredit credit = creditService.read(userId);
        if (credit.score() < CreditLearningConstant.PUBLISH_MIN_SCORE) {
            throw new CreditScoreBelowSixtyException(credit.score());
        }
    }
}
