<script>

import {me, wxLogin, wxPay} from "@/services/wx";
import {Toast} from "vant";
import {listAnalysisResult} from "@/services/getData";

export default {
  name: "EvaluationHistory",
  data() {
    return {
      /** 分析记录列表 */
      analysisList: [],
      /** 轮询定时器 */
      pollingTimer: null,
      /** mock 数据 */
      mockAnalysisList: [
        {
          id: "1",
          paperId: "1",
          payStatus: 0,
          // 分析中
          report: null,
        },
        {
          id: "2",
          paperId: "2",
          payStatus: 0,
          // 未支付
          report: "http://localhost:8080/report/2",
        },
        {
          id: "3",
          paperId: "3",
          payStatus: 1,
          // 已支付
          report: "http://localhost:8080/report/3",
        },
      ],
    }
  },
  created() {
    this.initPage();
  },
  beforeDestroy() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
    }
  },
  methods: {

    /** 页面初始化 */
    async initPage() {
      const res = await me();
      // Toast("res status is " + res.status);
      if (res.status === 401) {
        // 跳转微信登录
        wxLogin();
        return;
      }
      // 加载分析列表
      await this.loadAnalysisList();
    },

    /** 微信支付 */
    async wxPay(recordId) {
      try {
        const res = await wxPay(recordId);
        // 后端业务异常（如“报告已支付”）以 HTTP 200 + code=-1 返回，需按业务码判断
        if (res.code !== "0" || !res.data) {
          const msg = res.msg || res.message || "拉起支付失败";
          Toast(msg);
          // 已支付：刷新列表以展示报告入口
          if (msg.indexOf("已支付") !== -1) {
            this.loadAnalysisList();
          }
          return;
        }
        const payParams = res.data;   // 这是 PrepayWithRequestPaymentResponse
        this.invokeWxPay(payParams);
      } catch (e) {
        Toast((e && e.message) || e || "拉起支付失败");
      }
    },

    invokeWxPay(pay) {
      const doPay = () => {
        // eslint-disable-next-line
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
              if (res.err_msg === "get_brand_wcpay_request:ok") {
                Toast("支付成功");
                this.loadAnalysisList();
              } else {
                Toast("支付失败或取消");
              }
            }
        );
      };

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
    },

    /** 加载分析列表 */
    async loadAnalysisList() {
      const res = await listAnalysisResult();
      let list = res.data || [];
      // let list = JSON.parse(JSON.stringify(this.mockAnalysisList));

      this.analysisList = list.map(item => {
        const status = this.resolveStatus(item);
        return {
          ...item,
          status,
          loading: status === "ANALYZING",
        };
      });

      // 若存在分析中的记录，5 秒轮询
      if (this.analysisList.some(i => i.status === "ANALYZING")) {
        this.pollingTimer = setTimeout(() => {
          this.loadAnalysisList();
        }, 5000);
      }
    },

    resolveStatus(item) {
      if (!item.report) {
        return "ANALYZING";
      }
      if (item.report && item.payStatus === 0) {
        return "UNPAID";
      }
      if (item.report && item.payStatus === 1) {
        return "PAID";
      }
      return "UNKNOWN";
    },

    /** 状态对应按钮文案 */
    getButtonText(status) {
      switch (status) {
        case "ANALYZING":
          return "分析中...";
        case "UNPAID":
          return "立即支付";
        case "PAID":
          return "查看报告";
        default:
          return "-";
      }
    },

    /** 状态显示文案 */
    getStatusText(status) {
      switch (status) {
        case "ANALYZING":
          return "分析中";
        case "UNPAID":
          return "待支付";
        case "PAID":
          return "已完成";
        default:
          return "未知";
      }
    },

    /** 状态样式类 */
    getStatusClass(status) {
      switch (status) {
        case "ANALYZING":
          return "analyzing";
        case "UNPAID":
          return "unpaid";
        case "PAID":
          return "paid";
        default:
          return "default";
      }
    },

    /** 按钮样式类 */
    getButtonClass(status) {
      switch (status) {
        case "ANALYZING":
          return "analyzing";
        case "UNPAID":
          return "unpaid";
        case "PAID":
          return "paid";
        default:
          return "default";
      }
    },

    /** 是否禁用按钮 */
    isDisabled(status) {
      return status === "ANALYZING";
    },

    /** 按钮点击 */
    handleButtonClick(item) {
      switch (item.status) {
        case "ANALYZING":
          return;

        case "UNPAID":
          // this.mockPaySuccess(item.paperId);
          this.wxPay(item.id);
          return;

        case "PAID":
          window.location.href = item.report;
          return;
      }
    },

    /** 模拟支付成功（真实环境替换为支付回调） */
    mockPaySuccess(paperId) {
      const item = this.analysisList.find(i => i.paperId === paperId);
      if (!item) return;

      item.status = "PAID";

      // this.loadAnalysisList();
    },
  },
};
</script>

<template>
  <div class="history-page">
    <header class="page-header">
      <h1 class="page-title">测评记录</h1>
      <p class="page-subtitle">查看您的测评报告和历史记录</p>
    </header>

    <main class="content">
      <!-- 空状态 -->
      <div v-if="!analysisList.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <p class="empty-text">暂无测评记录</p>
        <p class="empty-hint">完成测评后，记录将显示在这里</p>
      </div>

      <!-- 记录列表 -->
      <div v-else class="record-list">
        <div
            v-for="item in analysisList"
            :key="item.id"
            class="record-card"
        >
          <div class="card-header">
            <div class="card-icon">
              <span class="icon-text">🧠</span>
            </div>
            <div class="card-info">
              <h3 class="card-title">瑞文标准推理测验</h3>
              <p class="card-desc">专业智商测评报告</p>
            </div>
            <div class="card-status">
              <span class="status-tag" :class="getStatusClass(item.status)">
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="info-label">测评编号</span>
              <span class="info-value">{{ item.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">状态</span>
              <span class="info-value">{{ getStatusText(item.status) }}</span>
            </div>
          </div>

          <div class="card-footer">
            <button
                class="action-btn"
                :class="getButtonClass(item.status)"
                :disabled="isDisabled(item.status)"
                @click="handleButtonClick(item)"
            >
              <span v-if="item.loading" class="btn-loading">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </span>
              <span v-else>{{ getButtonText(item.status) }}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>


<style scoped>
.history-page {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 22px 30px;
  text-align: center;
}

.page-title {
  margin: 0 0 8px;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.page-subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  font-weight: 400;
}

.content {
  padding: 20px 16px 32px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.8;
}

.empty-text {
  margin: 0 0 8px;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.empty-hint {
  margin: 0;
  color: #999;
  font-size: 14px;
}

/* 记录列表 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.record-card:active {
  transform: scale(0.98);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #e8f4fd 0%, #d4e8f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.icon-text {
  font-size: 26px;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0 0 4px;
  color: #1a1a1a;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
}

.card-desc {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.card-status {
  margin-left: 12px;
}

.status-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-tag.analyzing {
  background: #fff7e6;
  color: #fa8c16;
}

.status-tag.unpaid {
  background: #fff1f0;
  color: #f5222d;
}

.status-tag.paid {
  background: #f6ffed;
  color: #52c41a;
}

.status-tag.default {
  background: #f5f5f5;
  color: #999;
}

.card-body {
  padding: 16px 20px;
  background: #fafafa;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.info-row:first-child {
  padding-top: 0;
}

.info-row:last-child {
  padding-bottom: 0;
}

.info-label {
  color: #999;
  font-size: 14px;
}

.info-value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.card-footer {
  padding: 16px 20px;
}

.action-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn.analyzing {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.action-btn.unpaid {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.action-btn.unpaid:active {
  opacity: 0.9;
  transform: scale(0.98);
}

.action-btn.paid {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #fff;
}

.action-btn.paid:active {
  opacity: 0.9;
  transform: scale(0.98);
}

.action-btn.default {
  background: #f5f5f5;
  color: #999;
}

.action-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 加载动画 */
.btn-loading {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #999;
  animation: loading-bounce 1.4s infinite ease-in-out both;
}

.loading-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (max-width: 360px) {
  .page-header {
    padding: 30px 16px 24px;
  }

  .page-title {
    font-size: 24px;
  }

  .content {
    padding: 16px 12px 24px;
  }

  .card-header {
    padding: 16px;
  }

  .card-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    margin-right: 12px;
  }

  .icon-text {
    font-size: 22px;
  }

  .card-title {
    font-size: 16px;
  }

  .card-body {
    padding: 12px 16px;
  }

  .card-footer {
    padding: 12px 16px;
  }

  .action-btn {
    height: 44px;
    font-size: 15px;
  }
}
</style>