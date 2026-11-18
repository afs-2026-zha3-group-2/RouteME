/**
 * 旅行保障（REQ-028）的界面文案。
 *
 * <p>保险由第三方承保：RouteMe 只展示入口、行程关联与状态，文案不出现保费、
 * 保额或平台服务费；金额只属于钱包与借款。状态与日期以服务端响应为准。</p>
 */
export const financeMessages = {
  title: '旅行保障',
  myTitle: '我的旅行保障',
  subtitle: '演示钱包、第三方旅行保险入口与小额借款都在这里。',
  tripSubtitle: '保险由第三方承保并理赔；钱包只记录借款到账与还款。',
  loadFailed: '保障信息加载失败',
  retry: '重试',
  backToTrip: '返回行程',
  backToTrips: '去看行程',
  navEntry: '旅行保障',

  // 钱包
  walletTitle: '钱包',
  walletBalanceLabel: '可用余额 · 演示钱包',
  walletCurrency: '币种 CNY',
  walletScope: '仅用于借款',
  walletLedgerLink: '查看全部流水',

  // 第三方保险
  insuranceTitle: '旅行保险',
  insuranceStatusLabel: '旅行保险',
  insuranceStatusNotPurchased: '未购买',
  insuranceStatusActive: '保障中',
  insuranceStatusExpired: '已结束',
  insuranceTripTitle: '本次旅行',
  insuranceDestination: '目的地',
  insuranceDates: '旅行日期',
  insuranceCompanionCount: '同行人数',
  insuranceCompanionValue: (count: number) => `${count} 人`,
  insurancePeriodLabel: '保障期间',
  insurancePeriod: (start: string, end: string) => `${start} ～ ${end}`,
  insuranceNotPurchasedHint: '为本次同行旅行增加一份额外保障。',
  insuranceExpiredHint: '保障期已结束，如需继续保障请重新前往第三方投保。',
  insuranceProductsTitle: '第三方保障类别',
  insuranceProductsHint: '具体保障项目、保额与免责内容以实际接入的保险产品为准。',
  insuranceBuy: '前往第三方购买',
  insuranceBuying: '正在打开第三方页面…',
  insuranceConfirmDemo: '已完成投保（演示同步）',
  insuranceConfirming: '同步中…',
  insuranceConfirmSuccess: '保险状态已更新为保障中',
  insuranceProviderLabel: '保险服务提供方',
  insuranceProviderDisclaimer: (name: string) =>
    `RouteMe 仅提供入口，不承保也不参与理赔；保险责任、免责范围与理赔规则以 ${name} 的正式保险条款为准。`,
  insuranceViewPolicy: '查看保单',
  insuranceClaim: '理赔指引',
  insuranceEmergency: '紧急求助',
  insuranceDemoNote:
    '演示环境不会真实扣款：前往第三方页面完成投保后，用「已完成投保」把状态同步回 RouteMe。',
  insuranceOpenThirdParty: '已打开第三方投保页面，请在新窗口完成投保。',
  insuranceEntryNotPurchased: '未购买',
  insuranceEntryHint: '为本次同行旅行增加一份额外保障',
  insuranceEntryOpen: '查看旅行保险',
  insuranceEntryDetail: '查看保险详情',
  insuranceEntryEmergency: '紧急求助',
  insuranceSectionTitle: '旅行安全保障',

  // 借款
  loanTitle: '小额旅行借款',
  loanHint:
    '5% 服务费从本金扣除后发放；利息按本金 0.05%/日计收，逾期再加 0.1%/日罚息。每人同一时刻最多 1 笔进行中借款。',
  loanAmountLabel: '借款金额（元）',
  loanAmountHint: '100–2,000 元整',
  loanTermLabel: '期限',
  loanTermUnit: '天',
  loanNetPreview: '到账',
  loanRepayPreview: '应还',
  loanFeePreview: '服务费',
  loanInterest: '利息',
  loanPenalty: '逾期罚息',
  loanOverdueNote: '已逾期，还款时一并结清。',
  loanSubmit: '申请借款',
  loanSubmitting: '提交中…',
  loanActiveHint: '你已有一笔进行中的借款，还清后才能再次申请。',
  loanActiveLink: '查看借款并还款',
  loanInvalidAmount: '请输入 100–2,000 之间的整数元。',
  loanAmountPlaceholder: '1000',

  // 状态
  loanStatusActive: '进行中',
  loanStatusRepaid: '已还清',
  loanStatusOverdue: '已逾期',
  insurancePolicyActive: '保障中',
  insurancePolicyExpired: '已结束',

  // 列表
  insuranceListTitle: '保险记录',
  insuranceListEmpty: '还没有保险记录。参保后这里会显示提供方与保障期。',
  insuranceListHint: '点开行程可查看保单、理赔指引与紧急求助入口。',
  insuranceTripListTitle: '本次行程保险',
  insuranceListOpen: '查看保障详情',
  loansTitle: '借款',
  loansTripTitle: '本次行程借款',
  loansEmpty: '还没有借款。借款到账与还款都会写入钱包流水。',
  ledgerTitle: '钱包流水',
  ledgerEmpty: '还没有流水。任何一次借款到账或还款都会在这里留下记录。',
  ledgerLoanDisbursement: '借款到账',
  ledgerLoanRepayment: '借款还款',
  ledgerAfter: (balance: string) => `余额 ${balance}`,

  // 概览与行程入口
  summaryTitle: '概览',
  summaryPolicies: '保险记录',
  summaryLoans: '借款记录',
  summaryActiveLoan: '进行中借款',
  summaryOpenTrips: '可交易行程',
  summaryNone: '无',
  tripsTitle: '可交易行程',
  tripsEmpty: '当前没有可交易的行程。行程需为招募中、已满员或进行中，且你是发布者或已接受同行者。',
  tripEntry: '进入旅行保障',
  tripSectionTitle: '旅行安全保障',
  tripSectionHint: '查看第三方旅行保险入口，或申请 100–2,000 元小额旅行借款。',
  tripStatusRecruiting: '招募中',
  tripStatusFull: '已满员',
  tripStatusOngoing: '进行中',

  // 还款
  repay: '立即还款',
  repaying: '还款中…',
  repayConfirmTitle: '确认还款',
  repayConfirmBody: (amount: string) => `将从钱包扣除 ${amount}，还清后这笔借款结束。`,
  repaySuccess: '已还清',
  loanSuccess: '借款已到账',

  // 费用口径
  feeNoteTitle: '费用口径',
  feeNote:
    '保险由第三方定价与收取，RouteMe 不收保费也不参与理赔；借款到账 = 本金 − 5% 服务费，应还 = 本金 + 利息（0.05%/日），逾期另加 0.1%/日罚息。',
  ineligibleTitle: '当前不可交易',
  ineligibleLedgerHint: '你仍可在账号聚合页查看自己的保险状态与借款。',
  openMyFinance: '打开我的旅行保障',

  // 错误
  errorInsufficientBalance: '钱包余额不足，请先还清借款后再试。',
  errorActiveLoanExists: '已有一笔进行中的借款，还清后才能再次申请。',
  errorLoanNotActive: '这笔借款已还清，无需重复还款。',
  errorForbidden: '只有该行程的发布者或已接受的同行者才能购买保障或借款。',
  errorTripNotOpen: '行程已结束或已取消，无法再购买保障或借款。',
  errorAccountSuspended: '账号已被限制使用，暂时不能借款或同步保险。',
  errorAccountBanned: '账号已被封禁，暂时不能借款或同步保险。',
  errorInvalidInput: '提交的金额或期限不符合要求，请检查后重试。',
  errorUnknown: '操作失败，请稍后重试。',
};