<template>
  <a-row id="globalHeader" align="center" :wrap="false">
    <a-col flex="auto">
      <a-menu
        mode="horizontal"
        :selected-keys="selectedKeys"
        @menu-item-click="doMenuClick"
      >
        <a-menu-item
          key="0"
          :style="{ padding: 0, marginRight: '38px' }"
          disabled
        >
          <div class="title-bar">
            <img class="logo" src="../assets/oj-logo.svg" />
            <div class="title">F OJ</div>
          </div>
        </a-menu-item>
        <a-menu-item v-for="item in visibleRoutes" :key="item.path">
          {{ item.name }}
        </a-menu-item>
      </a-menu>
    </a-col>
    <a-col flex="160px" style="text-align: right; padding-right: 16px">
      <a-dropdown trigger="click" @select="handleUserMenuSelect">
        <!-- 触发器：头像 + 用户名 + 小箭头 -->
        <div class="user-info">
          <a-avatar
            v-if="loginUser.userAvatar"
            :size="28"
            :image-url="loginUser.userAvatar"
          />
          <a-avatar v-else :size="28" style="background-color: #00a6ff">
            {{ avatarText }}
          </a-avatar>
          <span class="user-name">{{ loginUser.userName ?? "未登录" }}</span>
          <icon-down style="font-size: 12px; color: #86909c" />
        </div>
        <!-- 下拉内容 -->
        <template #content>
          <a-doption value="account" disabled>
            <icon-user style="margin-right: 6px" />{{
              loginUser.userAccount ?? "账号：未登录"
            }}
          </a-doption>
          <a-divider style="margin: 4px 0" />
          <template v-if="!isLoggedIn">
            <a-doption value="login">登录 / 注册</a-doption>
          </template>
          <template v-else>
            <a-doption value="switch">切换账号</a-doption>
            <a-doption value="logout">退出登录</a-doption>
          </template>
        </template>
      </a-dropdown>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import { routes } from "../router/routes";
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, ref } from "vue";
import { useStore } from "vuex";
import { Message } from "@arco-design/web-vue";
import { IconDown, IconUser } from "@arco-design/web-vue/es/icon";
import checkAccess from "@/access/checkAccess";
import ACCESS_ENUM from "@/access/accessEnum";
import { UserControllerService } from "../../generated";

const router = useRouter();
const route = useRoute();
const store = useStore();

// 当前登录用户（响应式）
const loginUser = computed(() => store.state.user?.loginUser ?? {});
// 是否已登录：userRole 存在且不是未登录
const isLoggedIn = computed(() => {
  const role = loginUser.value?.userRole;
  return !!role && role !== ACCESS_ENUM.NOT_LOGIN;
});
// 无头像时取用户名首字
const avatarText = computed(() => (loginUser.value.userName ?? "未").charAt(0));

// 展示在菜单的路由数组（原逻辑不动）
const visibleRoutes = computed(() => {
  return routes.filter((item, index) => {
    if (item.meta?.hideInMenu) {
      return false;
    }
    if (
      !checkAccess(store.state.user.loginUser, item?.meta?.access as string)
    ) {
      return false;
    }
    return true;
  });
});

// 默认主页
const selectedKeys = ref(["/"]);
router.afterEach((to, from, failure) => {
  selectedKeys.value = [to.path];
});

// 页面加载时获取登录态（替代原来 setTimeout 的演示代码）
onMounted(() => {
  store.dispatch("user/getLoginUser");
});

const doMenuClick = (key: string) => {
  router.push({ path: key });
};

// 跳登录页，带上当前路径，登录成功后跳回来
const goLogin = () => {
  router.push({
    path: "/user/login",
    query: { redirect: route.fullPath },
  });
};

// 下拉菜单选择
const handleUserMenuSelect = async (key: string | number | undefined) => {
  if (key === "login" || key === "switch") {
    goLogin();
  } else if (key === "logout") {
    const res = await UserControllerService.userLogoutUsingPost();
    if (res.code === 0) {
      Message.success("退出登录成功");
      // 重置本地用户状态
      store.commit("user/updateUser", {
        userName: "未登录",
        userAvatar: "",
        userAccount: "",
        userRole: ACCESS_ENUM.NOT_LOGIN,
      });
      goLogin();
    } else {
      Message.error("退出登录失败：" + res.message);
    }
  }
};
</script>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
}
.title {
  color: #444;
  margin-left: 16px;
}
.logo {
  height: 48px;
}
.user-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #444;
}
</style>
