import {get, post} from "@/services/ajax";

// 获取所有测评试卷信息
export function queryAllPapers(params) {
    return get("/evaluation_system/evaluation/queryAllPapers", params)
}

// 题目查询
export function queryQuestion(paperId, questionId) {
    return get(`/evaluation_system/evaluation/queryQuestion/${paperId}/${questionId}`);
}

// 保存临时记录
export function saveTempAnswer(params) {
    return post("/evaluation_system/evaluation/saveTempAnswer", params)
}

// 获取临时答题详情
export function getTempAnswer(params) {
    return post("/evaluation_system/evaluation/getTempAnswer", params)
}

// 重新测评
export function restartEvaluation(params) {
    return post("/evaluation_system/evaluation/restartEvaluation", params)
}

// 提交分析
export function submitAnalysis(params) {
    return post("/evaluation_system/analysis/submitAnalysis", params)
}

// 获取分析结果列表
export function listAnalysisResult() {
    // return get(`/evaluation_system/analysis/listAnalysisResult/${userId}`);
    return get("/evaluation_system/analysis/listAnalysisResult");
}

// 获取分析记录详情
export function getAnalysisRecord(recordId) {
    return get(`/evaluation_system/analysis/record/${recordId}`);
}
