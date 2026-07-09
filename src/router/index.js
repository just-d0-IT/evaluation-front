import Vue from 'vue'
import VueRouter from 'vue-router'
import RuiWenEvaluation from '../views/RuiWenEvaluation'
import EvaluationHistory from '../views/EvaluationHistory.vue'
import RuiWenEvaluationResult from '../views/RuiWenEvaluationResult.vue'

Vue.use(VueRouter)

const routes = [
    {
        path: '/',
        name: 'ruiWenEvaluation',
        component: RuiWenEvaluation,
        meta: {title: '瑞文智商测评'}
    }, {
        path: '/evaluationHistory',
        name: 'evaluationHistory',
        component: EvaluationHistory,
        meta: {title: '测评历史'}
    }, {
        path: '/ruiWenEvaluationResult',
        name: 'ruiWenEvaluationResult',
        component: RuiWenEvaluationResult,
        meta: {title: '瑞文智商测评结果'}
    }
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

router.beforeEach((to, from, next) => {
    if (to.meta && to.meta.title) {
        document.title = to.meta.title
    }
    next()
})

export default router
