import {get} from "@/services/ajax";

// 用户登录判断
export function me() {
    return get("/evaluation_system/user/me");
}

// 微信登录
export function wxLogin() {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/api/evaluation_system/user/wxLogin?redirect=${redirect}`;
}

// 微信支付
export function wxPay(recordId) {
    return get(`/evaluation_system/payment/wxPay/${recordId}`);
}

