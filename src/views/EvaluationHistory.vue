<script>

import {listAnalysisResult} from "@/services/getData";
import {me, wxLogin, wxPay} from "@/services/wx";
import {Toast} from "vant";

export default {
  name: "PayView",
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
      const res = await wxPay(recordId);
      const payParams = res.data;   // 这是 PrepayWithRequestPaymentResponse
      this.invokeWxPay(payParams);
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
          return "分析中";
        case "UNPAID":
          return "未支付";
        case "PAID":
          return "查看报告";
        default:
          return "-";
      }
    },

    /** 状态对应 tag 类型 */
    getTagType(status) {
      switch (status) {
        case "ANALYZING":
          return "warning";
        case "UNPAID":
          return "danger";
        case "PAID":
          return "success";
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
  <div>
    <van-card
        v-for="item in analysisList"
        :key="item.paperId"
        title="测评报告"
        desc="瑞文标准推理测验"
        thumb="https://img01.yzcdn.cn/vant/ipad.jpeg"
    >
      <template #tags>
        <van-tag plain :type="getTagType(item.status)">
          {{ getButtonText(item.status) }}
        </van-tag>
      </template>

      <template #footer>
        <van-button
            size="mini"
            type="primary"
            :loading="item.loading"
            :disabled="isDisabled(item.status)"
            @click="handleButtonClick(item)"
        >
          {{ getButtonText(item.status) }}
        </van-button>
      </template>
    </van-card>
  </div>
</template>


<style scoped>

</style>