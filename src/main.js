import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import {
    Button,
    Card,
    Col,
    Dialog,
    Image as VanImage,
    Lazyload,
    NavBar,
    Picker,
    Popup,
    Progress,
    Radio,
    RadioGroup,
    Row,
    Swipe,
    SwipeItem,
    Tag,
    Toast
} from 'vant';

Vue.use(Radio);
Vue.use(RadioGroup);
Vue.use(Toast);
Vue.use(Col);
Vue.use(Row);
Vue.use(Button);
Vue.use(Card);
Vue.use(Tag);
Vue.use(Swipe);
Vue.use(SwipeItem);
Vue.use(NavBar);
Vue.use(Dialog);
Vue.use(Progress);
Vue.use(VanImage);
Vue.use(Popup);
Vue.use(Picker);
Vue.use(Lazyload);

// 注册时可以配置额外的选项
Vue.use(Lazyload, {
    lazyComponent: true,
});


Vue.config.productionTip = false
new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app')
