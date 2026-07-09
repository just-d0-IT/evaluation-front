<script>
import {
  getAnalysisRecord,
  getTempAnswer,
  queryQuestion,
  restartEvaluation,
  saveTempAnswer,
  submitAnalysis
} from "@/services/getData";
import {me, wxLogin} from "@/services/wx";
import {Dialog} from "vant";
import CountUpTimer from "@/components/CountUpTimer.vue";

export default {
  name: "RuiWenEvaluation",
  components: {
    CountUpTimer
  },
  data() {
    return {
      // 当前试卷 ID
      paperId: 1,
      // 试卷名称（从路由参数中传入）
      paperName: this.$route.params.paperName,
      // 题目总数
      totalQuestionNumber: 72,
      // 当前所在题目编号，从 1 开始
      currentQuestionNumber: 1,
      // 当前进度百分比（用于进度条展示）
      percent: 0,
      // 当前题目的已选答案（A、B、C...）
      selectedOption: null,
      // 存放所有题目的答题记录，如 {1: 'A', 2: 'B'}
      answers: {},
      // 答题卡弹窗是否显示
      showCard: false,
      // 当前题目数据（接口返回）
      questionData: null,
      // 是否显示提交弹窗
      showSubmitDialog: false,
      // 选中的年龄段
      selectedAge: null,
      // 年龄选项
      ageOptions: [],
      // 自动跳转定时器ID
      autoNextTimer: null,
      // 延迟时长（ms），可根据体验调整
      AUTO_NEXT_DELAY: 300,
      // 是否正在提交分析
      submitting: false,
      // 报告轮询定时器ID
      reportPollingTimer: null,
      // 报告轮询次数
      reportPollingCount: 0,
      // 报告轮询间隔（ms）
      REPORT_POLL_INTERVAL: 3000,
      // 报告最大轮询次数
      REPORT_POLL_MAX_COUNT: 60,
    }
  },

  created() {
    console.log(`paperId is ${this.paperId}, paperName is ${this.paperName}, totalQuestionNumber is ${this.totalQuestionNumber}`);
    this.initPage();
  },

  computed: {
    /**
     * 计算“已作答题目数占总题数的百分比”
     * 说明：
     * - Object.keys(this.answers).length 代表已答题数量
     * - totalQuestionNumber 是总题目数
     */
    progressPercent() {
      const answered = Object.keys(this.answers).length;
      return Math.floor((answered / this.totalQuestionNumber) * 100);
    },
    // 是否已完成测评
    isFinished() {
      return Object.keys(this.answers).length >= this.totalQuestionNumber;
    }
  },

  beforeDestroy() {
    if (!this.isFinished && !this.submitting) {
      this.saveTemp();
    }
    // 组件销毁时清除定时器
    this.clearAutoTimer();
    this.clearReportPolling();
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
      // 加载数据
      await this.initAgeOptions();
      await this.initTempAnswer();
      // 开始计时
      this.$refs.countUpTimer.start();
    },

    /**
     * @description 初始化：年龄选项
     */
    initAgeOptions() {
      const options = [];
      // 5岁及以下
      options.push({label: '5岁及以下', value: '5'});
      // 6 ~ 34 岁
      for (let i = 6; i <= 34; i++) {
        options.push({
          label: `${i}岁`,
          value: String(i)
        });
      }
      // 35岁及以上
      options.push({label: '35岁及以上', value: '35'});
      this.ageOptions = options;
    },
    /**
     * @description 初始化：查询是否存在未完成的临时答题
     */
    async initTempAnswer() {
      try {
        const res = await getTempAnswer({
          paperId: this.paperId,
          // userId: this.userId
        });

        if (res.code === "0" && res.data) {
          Dialog.confirm({
            message: '是否继续上次未完成测评？',
            confirmButtonText: '继续测评',
            cancelButtonText: '重新开始',
          })
              .then(async () => {
                // ✅ 继续测评
                this.answers = JSON.parse(res.data.answerDetails || "{}");
                // 跳转至最小的未做题目
                this.currentQuestionNumber = this.findFirstUnansweredNumber();
                await this.fetchQuestion();
              })
              .catch(async () => {
                // ❌ 重新开始
                await this.handleRestart();
              });
        } else {
          // 没有历史记录，正常加载第一题
          await this.fetchQuestion();
        }
      } catch (e) {
        console.error(e);
        await this.fetchQuestion();
      }
    },

    /**
     * @description 查找最小的未作答题目编号；若全部作答，则返回最后一题
     */
    findFirstUnansweredNumber() {
      for (let i = 1; i <= this.totalQuestionNumber; i++) {
        if (!this.answers[i]) {
          return i;
        }
      }
      return this.totalQuestionNumber;
    },

    /** 清除自动跳转定时器 */
    clearAutoTimer() {
      if (this.autoNextTimer) {
        clearTimeout(this.autoNextTimer);
        this.autoNextTimer = null;
      }
    },

    /** 清除报告轮询定时器 */
    clearReportPolling() {
      if (this.reportPollingTimer) {
        clearTimeout(this.reportPollingTimer);
        this.reportPollingTimer = null;
      }
    },

    /** 设置自动跳转定时器（会先清除之前的）
     *  @param {Function} fn - 延迟后执行的回调
     *  @param {number} delay - 延迟毫秒数（可选，默认使用 AUTO_NEXT_DELAY）
     */
    setAutoTimer(fn, delay = this.AUTO_NEXT_DELAY) {
      // 清除旧定时器
      this.clearAutoTimer();
      this.autoNextTimer = setTimeout(() => {
        // 执行回调
        fn();
        // 执行后置空
        this.autoNextTimer = null;
      }, delay);
    },

    /**
     * @description 根据当前题号获取题目数据
     */
    async fetchQuestion() {
      // 👉 每次切题前先清空旧数据，避免加载失败时残留旧题目
      this.questionData = null;
      this.selectedOption = null;
      try {
        // 调用后端接口获取题目数据
        const res = await queryQuestion(this.paperId, this.currentQuestionNumber);
        console.log("res is " + JSON.stringify(res));

        if (res.code === "0") {
          // ⭐ 若后端返回 tips，则Toast提示
          if (res.data.tips) {
            // this.$toast({
            //   // 显示后台传来的提示
            //   message: res.data.tips,
            //   icon: 'like-o',
            // });
            Dialog.alert({
              message: res.data.tips,
            }).then(() => {
              // on close
            });
            // ⭐ 保存临时答题
            await this.saveTemp();
          }
          // 解析题目详情 JSON 数据
          this.questionData = JSON.parse(res.data.questionDetail);
          // 回显用户之前已选答案
          this.selectedOption = this.answers[this.currentQuestionNumber] || null;
        } else {
          throw new Error(res.data.message);
        }
      } catch (e) {
        this.$toast.fail("加载题目失败!");
      } finally {
        // ✅ 无论成功失败，都重新计算进度条
        this.percent = this.progressPercent;
      }
    },

    /**
     * @description 选择题目选项（点击选项图片）
     */
    async selectOption(opt) {
      // 清除之前的自动跳转定时器（避免多次点击重复跳转）
      this.clearAutoTimer();

      // 设置当前题目的选中答案
      this.selectedOption = opt;
      // 保存到答题记录对象中
      this.$set(this.answers, this.currentQuestionNumber, opt);
      // ⭐ 关键：立即刷新进度条（修复 98% BUG）
      this.percent = this.progressPercent;

      // 延迟跳转，让用户看到高亮效果
      this.autoNextTimer = setTimeout(() => {
        // 自动跳转到下一题
        if (this.currentQuestionNumber < this.totalQuestionNumber) {
          this.currentQuestionNumber++;
          // 👉 切换题目时必须重新请求题目数据
          this.fetchQuestion();
        } else {
          this.$toast.success("已完成最后一题");
        }
        // 300ms 延迟，可根据体验调整
      }, this.AUTO_NEXT_DELAY);
    },

    /**
     * @description 切换到上一题
     */
    async prevQuestion() {
      // 切换题目时取消自动跳转定时器
      this.clearAutoTimer();
      if (this.currentQuestionNumber > 1) {
        this.currentQuestionNumber--;
        // 👉 切换上一题后重新加载题目数据
        await this.fetchQuestion();
      }
    },

    /**
     * @description 切换到下一题
     */
    async nextQuestion() {
      // 切换题目时取消自动跳转定时器
      this.clearAutoTimer();
      if (this.currentQuestionNumber < this.totalQuestionNumber) {
        this.currentQuestionNumber++;
        // 👉 切换下一题后重新加载题目数据
        await this.fetchQuestion();
      }
    },

    /**
     * @description 从答题卡跳转到指定题目
     */
    async jumpToQuestion(num) {
      // 切换题目时取消自动跳转定时器
      this.clearAutoTimer();
      this.currentQuestionNumber = num;
      this.showCard = false;
      // 👉 跳转后也要重新加载对应题目数据
      await this.fetchQuestion();
    },

    /**
     * @description 重新测评
     */
    async handleRestart() {
      // 切换题目时取消自动跳转定时器
      this.clearAutoTimer();
      const res = await restartEvaluation({
        paperId: this.paperId,
        // userId: this.userId
      });

      if (res.code === "0") {
        // 重置前端状态
        this.answers = {};
        this.currentQuestionNumber = 1;
        this.selectedOption = null;
        this.percent = 0;
        await this.fetchQuestion();
      } else {
        this.$toast.fail("重新开始失败");
      }
    },

    /**
     * @description 保存临时答题记录
     */
    async saveTemp() {
      await saveTempAnswer({
        paperId: this.paperId,
        // userId: this.userId,
        currentQuestionNumber: this.currentQuestionNumber,
        answerDetails: JSON.stringify(this.answers)
      });
    },

    /**
     * @description 提交点击
     */
    handleSubmitClick() {
      if (Object.keys(this.answers).length < this.totalQuestionNumber) {
        this.$toast.fail("还有题目未完成");
        return;
      }
      this.showSubmitDialog = true;
    },

    async waitReportReady(recordId) {
      this.clearReportPolling();
      this.reportPollingCount = 0;
      this.$toast.loading({
        message: 'AI分析中...请耐心等待报告生成',
        duration: 0,
        forbidClick: true,
      });

      return new Promise((resolve, reject) => {
        const poll = async () => {
          try {
            const res = await getAnalysisRecord(recordId);
            const record = res.data;
            if (res.code === "0" && record && record.report) {
              this.clearReportPolling();
              this.$toast.clear();
              resolve(record);
              return;
            }

            this.reportPollingCount++;
            if (this.reportPollingCount >= this.REPORT_POLL_MAX_COUNT) {
              this.clearReportPolling();
              this.$toast.clear();
              reject(new Error('报告仍在生成中，请稍后在测评记录中查看'));
              return;
            }

            this.reportPollingTimer = setTimeout(poll, this.REPORT_POLL_INTERVAL);
          } catch (e) {
            this.clearReportPolling();
            this.$toast.clear();
            reject(e);
          }
        };

        poll();
      });
    },

    // 年龄选择确认
    async onAgeConfirm(value, index) {
      if (this.submitting) {
        return;
      }
      this.submitting = true;
      // 记录选择
      this.selectedAge = value.value;
      this.agePickerIndex = index;
      this.showSubmitDialog = false;

      // 停止计时，获取总耗时（秒）
      const elapsedTime = this.$refs.countUpTimer.stop();

      // 🚀 直接提交
      try {
        const res = await submitAnalysis({
          paperId: this.paperId,
          // userId: this.userId,
          age: this.selectedAge,
          answerDetails: JSON.stringify(this.answers),
          elapsedTime: elapsedTime // 传递总耗时（秒）
        });

        if (res.code === "0") {
          const recordId = res.data;
          if (!recordId) {
            this.$toast.fail("提交失败，缺少记录ID");
            this.submitting = false;
            return;
          }
          this.$toast.success("提交成功");

          // 格式化完成时间
          const now = new Date();
          const finishTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

          // 格式化用时（秒 -> X分Y秒）
          const minutes = Math.floor(elapsedTime / 60);
          const seconds = elapsedTime % 60;
          const durationText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

          await this.waitReportReady(recordId);

          this.$router.push({
            path: '/ruiWenEvaluationResult/',
            query: {
              recordId: recordId,
              paperName: this.paperName || '瑞文智商测试',
              answerCount: String(this.totalQuestionNumber),
              finishTime: finishTime,
              durationText: durationText,
              participantCount: res.data && res.data.participantCount ? res.data.participantCount : '175.31万'
            }
          });
        } else {
          this.$toast.fail(res.message || "提交失败");
          this.submitting = false;
        }
      } catch (e) {
        this.$toast.fail(e.message || "提交异常");
        this.submitting = false;
      }
    },

    // 年龄取消
    onAgeCancel() {
      this.showSubmitDialog = false;
    },

    async doWxLogin() {
      try {
        const res = await wxLogin();
        console.log("res is " + res)
        // 🔥 跳到微信授权
        // window.location.href = res;
      } catch (e) {
        this.$toast.fail("微信登录失败");
      }
    },

  }
}
</script>


<template>
  <div class="page-wrapper">
    <!-- 顶部进度展示区域 -->
    <div class="question-header">
      <van-progress
          :percentage="percent"
          stroke-width="12"
          color="#4CAF50"
          track-color="#dcdcdc"
          :show-pivot="true"
          :pivot-text="percent + '%'"
          class="progress"
      />
      <div class="question-meta">
        <span>第{{ currentQuestionNumber }}/{{ totalQuestionNumber }}题</span>
        <count-up-timer ref="countUpTimer"/>
      </div>
      <div class="question-instruction">请选择一个最适合填入空缺中的图形</div>
    </div>

    <!-- 题目内容区 -->
    <div v-if="questionData" class="question-container">
      <!-- 题干图片 -->
      <div class="question">
        <img :src="questionData.question.url"/>
      </div>

      <!-- 选项列表 -->
      <div class="options">
        <div
            v-for="opt in questionData.options"
            :key="opt.option"
            class="option"
            :class="{ selected: selectedOption === opt.option }"
            @click="selectOption(opt.option)"
        >
          <img :src="opt.details.url"/>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <van-button
          type="default"
          :disabled="currentQuestionNumber === 1"
          @click="prevQuestion"
          block
      >上一题
      </van-button>

      <van-button type="primary" @click="showCard = true" block>答题卡</van-button>

      <van-button
          type="info"
          :disabled="currentQuestionNumber === totalQuestionNumber"
          @click="nextQuestion"
          block
      >下一题
      </van-button>

      <van-button
          v-if="currentQuestionNumber === totalQuestionNumber"
          type="danger"
          block
          :loading="submitting"
          :disabled="submitting"
          @click="handleSubmitClick"
      >
        提交测评
      </van-button>
    </div>

    <!-- 答题卡弹窗 -->
    <van-popup v-model="showCard" position="bottom" round :style="{ height: '50%' }">
      <div class="answer-card">
        <h3 style="text-align:center; margin-bottom:12px">答题卡</h3>
        <div class="card-grid">
          <van-button
              v-for="num in totalQuestionNumber"
              :key="num"
              :type="answers[num] ? 'primary' : 'default'"
              size="small"
              :class="{ activeCard: currentQuestionNumber === num }"
              @click="jumpToQuestion(num)"
          >
            {{ num }}
          </van-button>
        </div>
      </div>
    </van-popup>

    <!--    提交分析弹窗-->
    <van-popup v-model="showSubmitDialog" round position="bottom">
      <van-picker
          show-toolbar
          title="请选择你的年龄"
          :columns="ageOptions"
          value-key="label"
          @confirm="onAgeConfirm"
          @cancel="onAgeCancel"
      >
        <template #columns-top>
          <div class="picker-top-content">
            <span>请务必填写真实年龄，这将决定本次测评的计算准确度</span>
          </div>
        </template>
      </van-picker>
    </van-popup>
  </div>
</template>


<style scoped>
/* 进度条样式 */
.progress {
  margin: 10px 16px 4px;
  border-radius: 10px;
}

.van-progress__pivot {
  background-color: #4CAF50 !important;
  font-weight: bold;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
}

/* 顶部元信息样式 */
.question-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 16px;
  font-size: 16px;
}

/* 指导文字 */
.question-instruction {
  text-align: center;
  font-weight: bold;
  margin: 12px 0;
  font-size: 16px;
}

/* 题目区样式 */
.question-container {
  padding: 16px;
}

.question {
  width: 100%;
  text-align: center;
  margin-bottom: 16px;
}

.question img {
  width: 100%;
  max-width: 680px; /* PC端也不会无限拉大 */
  max-height: 45vh; /* 控制高度，不遮挡选项 */
  object-fit: contain;
}

/* 选项布局 */
.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 12px;
}

/* 单个选项卡样式 */
.option {
  background: #ffffff;
  border-radius: 10px;
  padding: 8px;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.15s ease;
}

.option img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}

/* 被选中状态高亮 */
.option.selected {
  border-color: #1989fa; /* Vant 主色 */
  box-shadow: 0 0 0 1px rgba(25, 137, 250, 0.2);
}

/* 底部操作按钮 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: nowrap; /* ❗禁止换行 */
  gap: 6px;
  padding: 6px 8px;
  background: #fff;
  box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.06);
  z-index: 1000;
}

/* 所有按钮等宽压缩 */
.bottom-bar .van-button {
  flex: 1 1 0;
  min-width: 0; /* ❗允许按钮被压缩 */
  padding: 0 6px;
}

/* 按钮里的文字：不换行 + 缩小 */
.bottom-bar .van-button__text {
  white-space: nowrap; /* ❗强制单行 */
  font-size: clamp(11px, 3vw, 14px); /* 自动适配屏幕 */
  line-height: 1.1;
}

/* 答题卡区域 */
.answer-card {
  padding: 12px 16px;
}

.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.card-grid .van-button {
  width: 40px;
  text-align: center;
  padding: 0;
}

/* 当前题号高亮边框 */
.card-grid .activeCard {
  border: 2px solid #1989fa;
}

.page-wrapper {
  padding-bottom: 80px;
}

.question-container {
  padding: 16px;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.van-image__img {
  max-height: 50vh;
  object-fit: contain;
}

.picker-top-content {
  margin-top: 6px; /* 距离标题 */
  margin-bottom: 6px; /* 距离滚轮 */
  background: #fff7e6;
  color: #d46b08;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid #ffe0b3;
  /* 关键：一行不换行 */
  white-space: nowrap;
  /* 关键：允许整体缩小 */
  min-width: 0;
}

/* ⚠️ 图标 */
.picker-top-content::before {
  content: "⚠️";
  flex-shrink: 0;
}

/* 文字本体（用于缩放） */
.picker-top-content span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;

  /* 核心：字体随屏幕自适应 */
  font-size: clamp(12px, 3.5vw, 15px);
  line-height: 1.2;
}

/* 控制 columns-top 在标题与选项之间的垂直位置 */
.van-picker__columns .picker-top-content {
  margin-top: 6px; /* 距离标题 */
  margin-bottom: 6px; /* 距离滚轮 */
}
</style>
