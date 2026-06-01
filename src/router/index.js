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
        component: RuiWenEvaluation
    }, {
        path: '/evaluationHistory',
        name: 'evaluationHistory',
        component: EvaluationHistory
    }, {
        path: '/ruiWenEvaluationResult',
        name: 'ruiWenEvaluationResult',
        component: RuiWenEvaluationResult
    }
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

export default router
