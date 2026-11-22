<template>
  <div id="viewQuestionView">
    <a-row :gutter="[24, 24]">
      <a-col :md="12" :xs="24">
        <a-tabs default-active-key="question">
          <a-tab-pane key="question" title="题目">
            <a-card v-if="question" :title="question?.title">
              <a-descriptions
                title="判题条件"
                :column="{ xs: 1, md: 2, lg: 3 }"
              >
                <a-descriptions-item label="时间限制">
                  {{ question?.judgeConfig?.timeLimit ?? 0 }}
                </a-descriptions-item>
                <a-descriptions-item label="内存限制">
                  {{ question?.judgeConfig?.memoryLimit ?? 0 }}
                </a-descriptions-item>
                <a-descriptions-item label="堆栈限制">
                  {{ question?.judgeConfig?.stackLimit ?? 0 }}
                </a-descriptions-item>
              </a-descriptions>
              <MdViewer :value="question?.content || ''" />
              <template #extra>
                <a-space wrap>
                  <a-tag
                    v-for="(tag, index) of question?.tags"
                    :key="index"
                    color="green"
                  >
                    {{ tag }}
                  </a-tag>
                </a-space>
              </template>
            </a-card>
          </a-tab-pane>
          <a-tab-pane key="comment" title="评论" disabled>评论区</a-tab-pane>
          <a-tab-pane key="answer" title="答案">暂时无法查看答案</a-tab-pane>
        </a-tabs>
      </a-col>
      <a-col :md="12" :xs="24">
        <a-form :model="form" layout="inline">
          <a-form-item
            field="language"
            label="编程语言"
            style="min-width: 240px"
          >
            <a-select
              v-model="form.language"
              :style="{ width: '320px' }"
              placeholder="选择编程语言"
            >
              <a-option>java</a-option>
              <a-option>cpp</a-option>
              <a-option>go</a-option>
              <a-option>html</a-option>
            </a-select>
          </a-form-item>
        </a-form>
        <CodeEditor
          :value="form.code as string"
          :language="form.language"
          :handle-change="changeCode"
        />
        <a-divider size="0" />
        <a-button
          type="primary"
          style="min-width: 200px"
          :loading="submitting"
          @click="doSubmit"
        >
          {{ submitting ? "判题中…" : "提交代码" }}
        </a-button>
        <a-divider size="0" />
        <a-card v-if="submitResult" title="判题结果">
          <a-space direction="vertical" fill>
            <a-space>
              <span>判定结果：</span>
              <a-tag
                v-if="submitResult?.judgeInfo?.message === 'Accepted'"
                color="green"
              >
                Accepted 🎉
              </a-tag>
              <a-tag v-else color="red">未通过</a-tag>
            </a-space>
            <pre
              v-if="
                submitResult?.judgeInfo?.message &&
                submitResult?.judgeInfo?.message !== 'Accepted'
              "
              class="judge-info-msg"
              >{{ formatJudgeMessage(submitResult?.judgeInfo?.message) }}</pre
            >
            <span>耗时：{{ submitResult?.judgeInfo?.time ?? "-" }} ms</span>
            <span
              >内存：{{
                ((submitResult?.judgeInfo?.memory ?? 0) / 1024 / 1024).toFixed(
                  2
                )
              }}
              MB</span
            >
          </a-space>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import message from "@arco-design/web-vue/es/message";
import CodeEditor from "@/components/CodeEditor.vue";
import MdViewer from "@/components/MdViewer.vue";
import {
  QuestionControllerService,
  QuestionSubmitAddRequest,
  QuestionSubmitVO,
  QuestionVO,
} from "../../../generated";

interface Props {
  id: string;
}

// 新版 Vue 3 中 withDefaults / defineProps 是编译器宏，无需（也不能）显式导入
// eslint-disable-next-line no-undef
const props = withDefaults(defineProps<Props>(), {
  id: () => "",
});

const question = ref<QuestionVO>();

const loadData = async () => {
  const res = await QuestionControllerService.getQuestionVoByIdUsingGet(
    props.id as any
  );
  if (res.code === 0) {
    question.value = res.data;
  } else {
    message.error("加载失败，" + res.message);
  }
};

const form = ref<QuestionSubmitAddRequest>({
  language: "java",
  code: "",
});

// ===== 判题轮询相关 =====
const submitting = ref(false);
const submitResult = ref<QuestionSubmitVO>();

/**
 * 兼容后端可能返回的字面量 "\n" 文本，统一转成真实换行，
 * 配合 <pre> 的 pre-wrap 展示多行编译报错
 */
const formatJudgeMessage = (msg?: string) => {
  if (!msg) {
    return "";
  }
  return msg.replace(/\\n/g, "\n");
};

/**
 * 判题是异步的（MQ -> judge-service -> 沙箱 -> 回写数据库），
 * 提交后轮询查询，直到状态到达终态（2=判题完成 / 3=判题失败）
 */
const pollJudgeResult = async (submitId: number, maxRetries = 30) => {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 500));
    // 注意：方法名换了 + 参数是直接传值（不是 { questionSubmitId: xxx } 包对象）
    const res = await QuestionControllerService.getQuestionSubmitVoByIdUsingGet(
      submitId as number
    );
    if (
      res?.code === 0 &&
      res.data &&
      (res.data.status === 2 || res.data.status === 3)
    ) {
      return res.data;
    }
  }
  return undefined;
};

/**
 * 提交代码
 */
const doSubmit = async () => {
  if (!question.value?.id) {
    return;
  }
  if (!form.value.code) {
    message.error("代码不能为空");
    return;
  }
  submitting.value = true;
  submitResult.value = undefined;
  const res = await QuestionControllerService.doQuestionSubmitUsingPost({
    ...form.value,
    questionId: question.value.id,
  });
  if (res.code === 0) {
    message.success("提交成功，判题中…");
    const record = await pollJudgeResult(res.data as number);
    if (record) {
      submitResult.value = record;
      const msg = record.judgeInfo?.message;
      if (msg === "Accepted") {
        message.success("恭喜，AC 通过 🎉");
      } else {
        message.error("未通过：" + (msg ?? "未知原因"));
      }
    } else {
      message.warning("判题超时，请稍后在「浏览题目提交」页查看结果");
    }
  } else {
    message.error("提交失败," + res.message);
  }
  submitting.value = false;
};

/**
 * 页面加载时，请求数据
 */
onMounted(() => {
  loadData();
});

const changeCode = (value: string) => {
  form.value.code = value;
};
</script>

<style>
#viewQuestionView {
  max-width: 1400px;
  margin: 0 auto;
}

#viewQuestionView .arco-space-horizontal .arco-space-item {
  margin-bottom: 0 !important;
}

/* 编译错误等多行信息展示块 */
#viewQuestionView .judge-info-msg {
  width: 100%;
  white-space: pre-wrap; /* 保留换行 + 自动折行 */
  word-break: break-all; /* 超长路径强制断行 */
  max-height: 240px;
  overflow-y: auto; /* 超长出滚动条 */
  font-family: Consolas, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
  padding: 8px 12px;
  background: #fff1f0;
  border: 1px solid #ffa39e;
  border-radius: 4px;
  color: #cf1322;
  text-align: left;
}
</style>
