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
        <button class="action-button" type="button" @click="unlockReport">解锁报告</button>
        <button class="action-button" type="button" @click="exitPage">退 出</button>
      </div>
    </main>
  </div>
</template>

<script>
const DEFAULT_PAPER_NAME = "瑞文智商测试72题国际专业版";
const DEFAULT_DURATION_TEXT = "1.4分钟";
const DEFAULT_PARTICIPANT_COUNT = "175.31万";

export default {
  name: "EndView",
  computed: {
    paperName() {
      return this.$route.query.paperName || DEFAULT_PAPER_NAME;
    },
    answerCount() {
      return this.$route.query.answerCount || 72;
    },
    finishTime() {
      return this.$route.query.finishTime || "2026-02-02 22:38:26";
    },
    durationText() {
      return this.$route.query.durationText || DEFAULT_DURATION_TEXT;
    },
    participantCount() {
      return this.$route.query.participantCount || DEFAULT_PARTICIPANT_COUNT;
    },
  },
  methods: {
    unlockReport() {
      this.$router.push("/pay");
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
