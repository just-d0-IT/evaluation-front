<template>
  <div class="end-page">
    <main class="content">
      <section class="summary-card">
        <div class="card-title">{{ paperName }}</div>
        <div class="section-title">报告摘要</div>
        <div class="summary-row">
          <span>答题数</span>
          <span>{{ answerCount }} 题</span>
        </div>
        <div class="summary-row">
          <span>完成时间</span>
          <span>{{ finishTime }}</span>
        </div>
        <div class="summary-row">
          <span>用时</span>
          <span>{{ durationText }}</span>
        </div>
      </section>

      <section class="notice">
        <p>您的专业版智商测评已完成，</p>
        <p>支付完成后立即查看测评结果。</p>
        <p>截止当前<span>{{ participantCount }}</span>人已参与测试!</p>
      </section>

      <div class="actions">
        <button class="action-button" type="button" :disabled="paying" @click="unlockReport">
          {{ paying ? '支付处理中...' : '解锁报告' }}
        </button>
        <button class="action-button" type="button" @click="exitPage">退 出</button>
      </div>
    </main>
  </div>
</template>

<script>
import {getAnalysisRecord} from "@/services/getData";
import {wxPay} from "@/services/wx";
import {Toast} from "vant";

export default {
  name: "RuiWenEvaluationResult",
  data() {
    return {
      paying: false,
      paymentPollingTimer: null,
      paymentPollingCount: 0,
    };
  },
  created() {
    if (!this.hasValidQuery()) {
      Toast("未获取到测评数据，请重新测评");
      this.$router.replace("/");
    }
  },
  beforeDestroy() {
    this.clearPaymentPolling();
  },
  computed: {
    paperName() {
      return this.$route.query.paperName;
    },
    answerCount() {
      return this.$route.query.answerCount;
    },
    finishTime() {
      return this.$route.query.finishTime;
    },
    durationText() {
      return this.$route.query.durationText;
    },
    participantCount() {
      return this.$route.query.participantCount;
    },
    recordId() {
      return this.$route.query.recordId;
    },
  },
  methods: {
    hasValidQuery() {
      const query = this.$route.query;
      return Boolean(
          query.paperName &&
          query.answerCount &&
          query.finishTime &&
          query.durationText &&
          query.participantCount &&
          query.recordId
      );
    },
    async unlockReport() {
      if (!this.recordId) {
        Toast("缺少测评记录ID");
        return;
      }
      if (this.paying) {
        return;
      }
      this.paying = true;
      try {
        const res = await wxPay(this.recordId);
        // 后端业务异常（如“报告已支付”）以 HTTP 200 + code=-1 返回，需按业务码判断
        if (res.code !== "0" || !res.data) {
          const msg = res.msg || res.message || "拉起支付失败";
          // 已支付：直接拉取并跳转报告，避免用户卡在支付页
          if (msg.indexOf("已支付") !== -1) {
            Toast("报告已支付，正在打开");
            this.openReportAfterPaid();
            return;
          }
          Toast(msg);
          this.paying = false;
          return;
        }
        this.invokeWxPay(res.data);
      } catch (e) {
        Toast((e && e.message) || e || "拉起支付失败");
        this.paying = false;
      }
    },
    invokeWxPay(pay) {
      const doPay = () => {
        /* eslint-disable no-undef */
        WeixinJSBridge.invoke(
            "getBrandWCPayRequest",
            {
              appId: pay.appId,
              timeStamp: pay.timeStamp,
              nonceStr: pay.nonceStr,
              package: pay.packageVal,
              signType: pay.signType,
              paySign: pay.paySign
            },
            res => {
              /* eslint-enable no-undef */
              if (res.err_msg === "get_brand_wcpay_request:ok") {
                Toast("支付成功");
                this.openReportAfterPaid();
              } else {
                Toast("支付失败或取消");
                this.paying = false;
              }
            }
        );
      };

      /* eslint-disable no-undef */
      if (typeof WeixinJSBridge === "undefined") {
        if (document.addEventListener) {
          document.addEventListener("WeixinJSBridgeReady", doPay, false);
        } else if (document.attachEvent) {
          document.attachEvent("WeixinJSBridgeReady", doPay);
          document.attachEvent("onWeixinJSBridgeReady", doPay);
        }
      } else {
        doPay();
      }
      /* eslint-enable no-undef */
    },
    openReportAfterPaid() {
      this.clearPaymentPolling();
      this.paymentPollingCount = 0;
      const poll = async () => {
        try {
          const res = await getAnalysisRecord(this.recordId);
          const record = res.data;
          if (res.code === "0" && record && record.payStatus === 1 && record.report) {
            this.clearPaymentPolling();
            this.paying = false;
            window.location.href = record.report;
            return;
          }
          this.paymentPollingCount++;
          if (this.paymentPollingCount >= 5) {
            this.clearPaymentPolling();
            this.paying = false;
            Toast("支付成功，报告稍后可在测评记录中查看");
            return;
          }
          this.paymentPollingTimer = setTimeout(poll, 1000);
        } catch (e) {
          this.clearPaymentPolling();
          this.paying = false;
          Toast("支付成功，报告稍后可在测评记录中查看");
        }
      };
      poll();
    },
    clearPaymentPolling() {
      if (this.paymentPollingTimer) {
        clearTimeout(this.paymentPollingTimer);
        this.paymentPollingTimer = null;
      }
    },
    exitPage() {
      /* eslint-disable no-undef */
      if (typeof WeixinJSBridge !== "undefined") {
        WeixinJSBridge.call("closeWindow");
        return;
      }
      /* eslint-enable no-undef */

      if (window.history.length > 1) {
        this.$router.go(-1);
        return;
      }

      this.$router.push("/");
    },
  },
};
</script>

<style scoped>
.end-page {
  min-height: 100vh;
  background: #f3f3f3;
  color: #222;
  font-family: Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  text-align: left;
}

.content {
  padding: 22px 22px 28px;
}

.summary-card {
  overflow: hidden;
  border-radius: 5px;
  background: #fff;
}

.card-title {
  padding: 14px 20px 13px;
  font-size: 17px;
  font-weight: 700;
  line-height: 22px;
}

.section-title {
  padding: 22px 20px;
  background: #cae7ff;
  color: #1e2a36;
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  color: #222;
  font-size: 17px;
  font-weight: 700;
  line-height: 24px;
}

.summary-row span:last-child {
  max-width: 68%;
  color: #333;
  font-weight: 400;
  text-align: right;
}

.summary-row:last-child {
  padding-bottom: 24px;
}

.notice {
  margin: 32px 0 28px;
  color: #202020;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
  text-align: center;
}

.notice p {
  margin: 0;
}

.notice span {
  color: #d81919;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.action-button {
  width: 100%;
  height: 60px;
  border: 0;
  border-radius: 4px;
  background: #37b84c;
  color: #fff;
  font-size: 23px;
  font-weight: 400;
  line-height: 60px;
}

.action-button:disabled {
  opacity: 0.65;
}

@media (max-width: 360px) {
  .content {
    padding-right: 14px;
    padding-left: 14px;
  }

  .summary-row {
    font-size: 15px;
  }

  .notice {
    font-size: 16px;
  }

  .action-button {
    font-size: 21px;
  }
}
</style>
