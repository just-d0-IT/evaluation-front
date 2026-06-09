<script>
export default {
  name: "CountUpTimer",
  data() {
    return {
      // 开始计时的时间戳
      startTime: null,
      // 已用时间（秒）
      elapsedTime: 0,
      // setInterval 定时器ID
      timerInterval: null,
    }
  },
  computed: {
    /**
     * 格式化已用时间显示（MM:SS）
     */
    formattedTime() {
      const minutes = Math.floor(this.elapsedTime / 60);
      const seconds = this.elapsedTime % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  },
  beforeDestroy() {
    this.stop();
  },
  methods: {
    /** 开始计时 */
    start() {
      this.startTime = Date.now();
      this.timerInterval = setInterval(() => {
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      }, 1000);
    },
    /** 停止计时，返回已用秒数 */
    stop() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      if (this.startTime) {
        this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      }
      return this.elapsedTime;
    }
  }
}
</script>

<template>
  <span class="timer">⏱ {{ formattedTime }}</span>
</template>

<style scoped>
.timer {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}
</style>