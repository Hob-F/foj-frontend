<template>
  <div class="ai-assistant">
    <!-- 全局浮动入口按钮（可拖动；鼠标/触摸在 pointerup 判定点击/拖动） -->
    <div
      class="ai-assistant__fab"
      :style="fabStyle"
      @click="onFabClick"
      @pointerdown="onFabPointerDown"
      @pointermove="onFabPointerMove"
      @pointerup="onFabPointerUp"
      @pointercancel="onFabPointerCancel"
    >
      <a-button type="primary" shape="round">AI 助手</a-button>
    </div>

    <!-- 聊天面板 -->
    <transition name="ai-fade">
      <div
        v-if="open"
        ref="panelRef"
        class="ai-assistant__panel"
        :style="panelStyle"
      >
        <div
          class="ai-assistant__header"
          @pointerdown="onPanelPointerDown"
          @pointermove="onPanelPointerMove"
          @pointerup="onPanelPointerUp"
          @pointercancel="onPanelPointerCancel"
        >
          <span class="ai-assistant__title">AI 助手</span>
          <a-space :size="8">
            <a-button size="mini" @click="newConversation">新对话</a-button>
            <a-button size="mini" @click="close">×</a-button>
          </a-space>
        </div>

        <div ref="listRef" class="ai-assistant__list">
          <a-empty
            v-if="messages.length === 0"
            description="我是 FOJ 的编程助手，有算法或编程问题随时问我～"
          />
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="ai-assistant__msg"
            :class="'ai-assistant__msg--' + msg.role"
          >
            <div class="ai-assistant__bubble">{{ msg.content }}</div>
          </div>
        </div>

        <div class="ai-assistant__footer" @keydown.enter.exact.prevent="send">
          <a-textarea
            v-model="inputText"
            :auto-size="{ minRows: 1, maxRows: 4 }"
            placeholder="输入你的问题，回车发送"
            :disabled="sending"
          />
          <a-button
            type="primary"
            :loading="sending"
            :disabled="!inputText.trim()"
            @click="send"
          >
            发送
          </a-button>
        </div>

        <!-- 右下角缩放拖动手柄 -->
        <div
          class="ai-assistant__resize-handle"
          @pointerdown="onResizePointerDown"
          @pointermove="onResizePointerMove"
          @pointerup="onResizePointerUp"
          @pointercancel="onResizePointerCancel"
        ></div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { Message } from "@arco-design/web-vue";
import { OpenAPI } from "../../generated/core/OpenAPI";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** sessionStorage 键：每个标签页独立的会话 ID */
const STORAGE_KEY = "foj-ai-conversation-id";
/** localStorage 键：按钮位置 / 面板几何，独立存储互不覆盖 */
const FAB_POS_KEY = "foj-ai-assistant-btn-pos";
const PANEL_GEOM_KEY = "foj-ai-assistant-panel-geom";

/** 位移超过该值才视为拖动（区分点击） */
const DRAG_THRESHOLD = 5;
/** 面板最小宽高 */
const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 360;

const open = ref(false);
const messages = ref<ChatMessage[]>([]);
const inputText = ref("");
const sending = ref(false);
const conversationId = ref("");
const listRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

// 按钮位置：null 表示使用默认右下角（right/bottom 定位）
const fabPos = ref<{ left: number; top: number } | null>(null);
// 面板几何：null 表示使用默认（right/bottom + 400px/60vh）
const panelGeom = ref<Rect | null>(null);

let abortController: AbortController | null = null;

// 拖动过程中的临时状态
let fabDrag: {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  width: number;
  height: number;
  moved: boolean;
} | null = null;
let panelDrag: {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
} | null = null;
let resizeState: {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  moved: boolean;
} | null = null;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

/** 读取按钮位置 */
const readFabPos = (): { left: number; top: number } | null => {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v.left === "number" && typeof v.top === "number") {
      return { left: v.left, top: v.top };
    }
  } catch (e) {
    // 解析失败按无记录处理
  }
  return null;
};

/** 读取面板几何 */
const readPanelGeom = (): Rect | null => {
  try {
    const raw = localStorage.getItem(PANEL_GEOM_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (
      typeof v.left === "number" &&
      typeof v.top === "number" &&
      typeof v.width === "number" &&
      typeof v.height === "number"
    ) {
      return { left: v.left, top: v.top, width: v.width, height: v.height };
    }
  } catch (e) {
    // 解析失败按无记录处理
  }
  return null;
};

/** 恢复上次拖动的状态；无记录保持默认右下角 */
const restoreState = () => {
  const fab = readFabPos();
  if (fab) {
    fabPos.value = {
      left: clamp(fab.left, 0, Math.max(0, window.innerWidth - 48)),
      top: clamp(fab.top, 0, Math.max(0, window.innerHeight - 48)),
    };
  }
  const geom = readPanelGeom();
  if (geom) {
    const width = clamp(geom.width, MIN_PANEL_WIDTH, window.innerWidth);
    const height = clamp(geom.height, MIN_PANEL_HEIGHT, window.innerHeight);
    panelGeom.value = {
      left: clamp(geom.left, 0, Math.max(0, window.innerWidth - width)),
      top: clamp(geom.top, 0, Math.max(0, window.innerHeight - height)),
      width,
      height,
    };
  }
};

/** 生成一个会话 ID（标签页内唯一即可） */
const genConversationId = () =>
  "ai-" +
  Date.now().toString(36) +
  "-" +
  Math.random().toString(36).slice(2, 10);

/** 读取或创建会话 ID，按标签页用 sessionStorage 隔离 */
const ensureConversationId = () => {
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = genConversationId();
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  conversationId.value = id;
};

/** 滚动消息列表到底部 */
const scrollToBottom = async () => {
  await nextTick();
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
};

/** 中止进行中的流式请求（新对话/关闭面板时调用） */
const abortStream = () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
};

/** 解析单个 SSE 事件里的 data 字段 */
const parseSseData = (rawEvent: string): string => {
  const lines = rawEvent.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("data:")) {
      // 去掉 "data:" 前缀与紧随其后的一个空格（SSE 规范）
      dataLines.push(line.slice(5).replace(/^\s/, ""));
    }
  }
  return dataLines.join("\n");
};

/** 获取当前最后一条消息（用于流式追加） */
const lastMessage = (): ChatMessage | undefined =>
  messages.value[messages.value.length - 1];

/** 把内容追加到最后一条 assistant 消息（打字机效果） */
const appendToAssistant = (content: string) => {
  const last = lastMessage();
  if (last && last.role === "assistant") {
    last.content += content;
  } else {
    messages.value.push({ role: "assistant", content });
  }
};

/** 网络错误：用现有组件风格提示，并在面板里给出占位 */
const handleNetworkError = (e: unknown) => {
  if ((e as any)?.name === "AbortError") {
    return;
  }
  Message.error("网络异常，请稍后再试");
  const last = lastMessage();
  if (last && last.role === "assistant" && last.content === "") {
    last.content = "网络异常，请稍后再试";
  }
};

/** 429 限流：解析 JSON 并把 content 字段展示为提示 */
const handleRateLimited = async (response: Response) => {
  let content = "请求太频繁，请稍后再试";
  try {
    const body = await response.json();
    if (body && typeof body.content === "string" && body.content) {
      content = body.content;
    }
  } catch (e) {
    // 解析失败时使用默认文案
  }
  appendToAssistant(content);
};

/** 其它非 2xx：尽量解析出可读提示 */
const handleHttpError = async (response: Response) => {
  let content = `请求失败（${response.status}）`;
  try {
    const body = await response.json();
    if (body && typeof body.content === "string" && body.content) {
      content = body.content;
    } else if (body && typeof body.message === "string" && body.message) {
      content = body.message;
    }
  } catch (e) {
    // 解析失败时使用默认文案
  }
  appendToAssistant(content);
};

/** 发起 SSE 流式对话，逐段追加回复 */
const streamChat = async (prompt: string) => {
  abortController = new AbortController();
  const url = `${OpenAPI.BASE}/api/ai/chat/stream`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt, conversationId: conversationId.value }),
      signal: abortController.signal,
    });
  } catch (e) {
    handleNetworkError(e);
    return;
  }

  if (response.status === 429) {
    await handleRateLimited(response);
    return;
  }

  if (!response.ok || !response.body) {
    await handleHttpError(response);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    let result = await reader.read();
    while (!result.done) {
      buffer += decoder.decode(result.value, { stream: true });
      // SSE 事件以空行分隔，按事件切分后逐条追加
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const data = parseSseData(rawEvent);
        if (data) {
          appendToAssistant(data);
          await scrollToBottom();
        }
      }
      result = await reader.read();
    }
    // 处理无尾随空行的残留 buffer
    const leftover = parseSseData(buffer);
    if (leftover) {
      appendToAssistant(leftover);
    }
  } catch (e) {
    handleNetworkError(e);
  } finally {
    reader.releaseLock();
    // 流结束后若回复仍为空，给一个兜底文案
    const last = lastMessage();
    if (last && last.role === "assistant" && last.content === "") {
      last.content = "AI 未返回内容，请稍后再试";
    }
  }
};

/** 发送消息 */
const send = async () => {
  const text = inputText.value.trim();
  if (!text || sending.value) {
    return;
  }
  inputText.value = "";
  messages.value.push({ role: "user", content: text });
  // 先占位一条空的 assistant 消息，供流式追加
  messages.value.push({ role: "assistant", content: "" });
  sending.value = true;
  await scrollToBottom();
  try {
    await streamChat(text);
  } finally {
    sending.value = false;
    await scrollToBottom();
  }
};

/** 新对话：重置会话 ID 并清空消息 */
const newConversation = () => {
  abortStream();
  conversationId.value = genConversationId();
  sessionStorage.setItem(STORAGE_KEY, conversationId.value);
  messages.value = [];
};

/** 开关面板 */
const toggle = () => {
  open.value = !open.value;
};

const close = () => {
  open.value = false;
};

// ===== 拖动 / 缩放 =====

/** 面板仍为默认 right/bottom 定位时，先换算为像素 left/top/width/height */
const ensurePanelPixelGeom = (): Rect | null => {
  if (!panelGeom.value && panelRef.value) {
    const rect = panelRef.value.getBoundingClientRect();
    panelGeom.value = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }
  return panelGeom.value;
};

const onFabPointerDown = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  // 首次拖动时把默认 right/bottom 换算为 left/top
  if (!fabPos.value) {
    const rect = el.getBoundingClientRect();
    fabPos.value = { left: rect.left, top: rect.top };
  }
  const rect = el.getBoundingClientRect();
  fabDrag = {
    startX: e.clientX,
    startY: e.clientY,
    startLeft: rect.left,
    startTop: rect.top,
    width: rect.width,
    height: rect.height,
    moved: false,
  };
  el.setPointerCapture(e.pointerId);
};

const onFabPointerMove = (e: PointerEvent) => {
  if (!fabDrag || !fabPos.value) return;
  const dx = e.clientX - fabDrag.startX;
  const dy = e.clientY - fabDrag.startY;
  if (!fabDrag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    fabDrag.moved = true;
  }
  if (fabDrag.moved) {
    fabPos.value = {
      left: clamp(
        fabDrag.startLeft + dx,
        0,
        Math.max(0, window.innerWidth - fabDrag.width)
      ),
      top: clamp(
        fabDrag.startTop + dy,
        0,
        Math.max(0, window.innerHeight - fabDrag.height)
      ),
    };
  }
};

const onFabPointerUp = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  const wasDrag = !!(fabDrag && fabDrag.moved);
  if (fabDrag && !fabDrag.moved) {
    // 位移未超过阈值，视为点击
    toggle();
  } else if (wasDrag && fabPos.value) {
    localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPos.value));
  }
  fabDrag = null;
};

const onFabPointerCancel = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  fabDrag = null;
};

const onFabClick = (e: MouseEvent) => {
  // 鼠标/触摸点击已在 pointerup 处理；这里仅处理键盘触发（detail 为 0）
  if (e.detail === 0) {
    toggle();
  }
};

const onPanelPointerDown = (e: PointerEvent) => {
  // 标题栏里的“新对话 / ×”按钮不触发拖动
  if ((e.target as HTMLElement).closest("button")) return;
  const el = e.currentTarget as HTMLElement;
  const geom = ensurePanelPixelGeom();
  if (!geom) return;
  panelDrag = {
    startX: e.clientX,
    startY: e.clientY,
    startLeft: geom.left,
    startTop: geom.top,
    moved: false,
  };
  el.setPointerCapture(e.pointerId);
};

const onPanelPointerMove = (e: PointerEvent) => {
  if (!panelDrag || !panelGeom.value) return;
  const dx = e.clientX - panelDrag.startX;
  const dy = e.clientY - panelDrag.startY;
  if (!panelDrag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    panelDrag.moved = true;
  }
  if (panelDrag.moved) {
    panelGeom.value = {
      ...panelGeom.value,
      left: clamp(
        panelDrag.startLeft + dx,
        0,
        Math.max(0, window.innerWidth - panelGeom.value.width)
      ),
      top: clamp(
        panelDrag.startTop + dy,
        0,
        Math.max(0, window.innerHeight - panelGeom.value.height)
      ),
    };
  }
};

const onPanelPointerUp = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  if (panelDrag && panelDrag.moved && panelGeom.value) {
    localStorage.setItem(PANEL_GEOM_KEY, JSON.stringify(panelGeom.value));
  }
  panelDrag = null;
};

const onPanelPointerCancel = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  panelDrag = null;
};

const onResizePointerDown = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  const geom = ensurePanelPixelGeom();
  if (!geom) return;
  resizeState = {
    startX: e.clientX,
    startY: e.clientY,
    startWidth: geom.width,
    startHeight: geom.height,
    moved: false,
  };
  el.setPointerCapture(e.pointerId);
};

const onResizePointerMove = (e: PointerEvent) => {
  if (!resizeState || !panelGeom.value) return;
  const dx = e.clientX - resizeState.startX;
  const dy = e.clientY - resizeState.startY;
  if (!resizeState.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    resizeState.moved = true;
  }
  if (resizeState.moved) {
    panelGeom.value = {
      ...panelGeom.value,
      width: clamp(
        resizeState.startWidth + dx,
        MIN_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, window.innerWidth - panelGeom.value.left)
      ),
      height: clamp(
        resizeState.startHeight + dy,
        MIN_PANEL_HEIGHT,
        Math.max(MIN_PANEL_HEIGHT, window.innerHeight - panelGeom.value.top)
      ),
    };
  }
};

const onResizePointerUp = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  if (resizeState && resizeState.moved && panelGeom.value) {
    localStorage.setItem(PANEL_GEOM_KEY, JSON.stringify(panelGeom.value));
  }
  resizeState = null;
};

const onResizePointerCancel = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  if (el.hasPointerCapture(e.pointerId)) {
    el.releasePointerCapture(e.pointerId);
  }
  resizeState = null;
};

/** 按钮样式：默认右下角，拖动后转为 left/top */
const fabStyle = computed(() =>
  fabPos.value
    ? {
        left: fabPos.value.left + "px",
        top: fabPos.value.top + "px",
        right: "auto",
        bottom: "auto",
      }
    : { right: "24px", bottom: "24px" }
);

/** 面板样式：默认右下角 400px/60vh，拖动/缩放后转为像素几何 */
const panelStyle = computed(() =>
  panelGeom.value
    ? {
        left: panelGeom.value.left + "px",
        top: panelGeom.value.top + "px",
        width: panelGeom.value.width + "px",
        height: panelGeom.value.height + "px",
        right: "auto",
        bottom: "auto",
      }
    : { right: "24px", bottom: "80px", width: "400px", height: "60vh" }
);

onMounted(() => {
  ensureConversationId();
  restoreState();
});

onUnmounted(() => {
  abortStream();
});
</script>

<style scoped>
.ai-assistant__fab {
  position: fixed;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  touch-action: none;
  user-select: none;
}

.ai-assistant__panel {
  position: fixed;
  z-index: 1000;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.ai-assistant__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e6eb;
  background: #f7f8fa;
  cursor: move;
  touch-action: none;
  user-select: none;
}

.ai-assistant__header .arco-btn {
  cursor: pointer;
}

.ai-assistant__title {
  font-weight: 600;
  color: #1d2129;
}

.ai-assistant__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-assistant__msg {
  display: flex;
  flex-shrink: 0;
}

.ai-assistant__msg--user {
  justify-content: flex-end;
}

.ai-assistant__msg--assistant {
  justify-content: flex-start;
}

.ai-assistant__bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 14px;
}

.ai-assistant__msg--user .ai-assistant__bubble {
  background: #165dff;
  color: #fff;
  border-top-right-radius: 2px;
}

.ai-assistant__msg--assistant .ai-assistant__bubble {
  background: #f2f3f5;
  color: #1d2129;
  border-top-left-radius: 2px;
}

.ai-assistant__footer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px 16px 12px;
  border-top: 1px solid #e5e6eb;
}

.ai-assistant__footer .arco-textarea {
  flex: 1;
}

.ai-assistant__resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  touch-action: none;
  z-index: 2;
}

.ai-assistant__resize-handle::before {
  content: "";
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #c9cdd4;
  border-bottom: 2px solid #c9cdd4;
}

.ai-fade-enter-active,
.ai-fade-leave-active {
  transition: opacity 0.2s ease;
}

.ai-fade-enter-from,
.ai-fade-leave-to {
  opacity: 0;
}
</style>
