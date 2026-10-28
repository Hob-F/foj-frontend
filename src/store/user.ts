import { StoreOptions } from "vuex";
import ACCESS_ENUM from "@/access/accessEnum";
import { UserControllerService } from "../../generated";

export default {
  namespaced: true,
  state: () => ({
    loginUser: {
      userName: "未登录",
      userAvatar: "",
      userAccount: "",
      userRole: ACCESS_ENUM.NOT_LOGIN,
    },
  }),
  actions: {
    async getLoginUser({ commit, state }: any, payload?: any) {
      let res: any;
      try {
        res = await UserControllerService.getLoginUserUsingGet();
      } catch (e) {
        // 请求本身失败（跨域/网络/超时）
        commit("updateUser", {
          ...state.loginUser,
          userName: "未登录",
          userAvatar: "",
          userAccount: "",
          userRole: ACCESS_ENUM.NOT_LOGIN,
        });
        return;
      }
      if (res?.code === 0 && res.data) {
        // 关键：data 有值才写入，防止把 null 塞进 store
        commit("updateUser", res.data);
      } else {
        // 未登录或返回异常 → 完整重置为未登录态
        commit("updateUser", {
          ...state.loginUser,
          userName: "未登录",
          userAvatar: "",
          userAccount: "",
          userRole: ACCESS_ENUM.NOT_LOGIN,
        });
      }
    },
  },
  mutations: {
    updateUser(state: any, payload: any) {
      state.loginUser = payload;
    },
  },
} as StoreOptions<any>;
