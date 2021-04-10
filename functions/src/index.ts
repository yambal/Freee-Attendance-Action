/**
 * https://developers.google.com/assistant/conversational/fulfillment-migration
 * https://developers.google.com/assistant/conversational/conditions
 * https://developers.google.com/assistant/conversational/webhooks#node.js_3
 * https://developers.google.com/assistant/conversational/storage
 * https://developers.google.com/assistant/conversational/storage-session
 */
import {conversation, Suggestion, Table} from "@assistant/conversation";
import * as functions from "firebase-functions";
import { FreeeApiError, HrCompany } from "./freeApi/hr/hrTypes"
import { checkUserHelper } from "./helper";
import * as hr from "./freeApi/hr/";
import * as freee from "freee-api-client";
import { timeClocksTable, setSuggestion, getSuggestionTitles } from "./helper";

const app = conversation({debug: false});

//const VERSION = "0.2.0"

app.handle("CheckToken", async (conv: any) => {
  functions.logger.log(">> CheckToken <<")
  return checkUserHelper(conv)
  .then((user) => {
    conv.scene.next.name = "LinkedUser";
  })
  .catch((error: freee.ApiClientError) => {
    onFreeApiClientError(conv, error)
  })
})

app.handle("LinkedUser", async (conv: any) => {
  let company: HrCompany
  let bearerToken: string
  
  let todayTimeClocks: freee.EmployeeTimeClock[]
  let lastTimeClocks: freee.EmployeeTimeClock

  return checkUserHelper(conv)
  .then((user) => {
    bearerToken = conv.user.params.bearerToken
    company = user.companies[0]
    // 本日の打刻打刻情報を取得
    return freee.hr.timeClocks.getTimeClocks(
      bearerToken,
      company.id,
      company.employee_id,
      new Date()
    )
  })
  .then((timeClocks) => {
    todayTimeClocks = timeClocks
    lastTimeClocks = timeClocks.slice(-1)[0]

    // 打刻可能種別を取得
    return setSuggestion(bearerToken, company.id, company.employee_id, conv)
  })
  .then(() => {
    // 本日の打刻一覧
    const table = timeClocksTable(todayTimeClocks, `${company.name}の${company.display_name}`)
    if(table){
      conv.add(table)
    }

    let status ="<speak>本日の打刻情報はありません。</speak>"
    if(lastTimeClocks){
      status = `打刻の状態は「${lastTimeClocks.label}」です`
    } else {
      conv.scene.next.name = "DoYouAttendanceStamp";
    }

    conv.add(`
      <speak>
        ${company.name}の${company.display_name}。
        ${status}
      </speak>
    `);
  })
  .catch((error: freee.ApiClientError) => {
    onFreeApiClientError(conv, error)
  })
});

/**
 * 打刻状態
 */
app.handle("GetTimeClockStatus", async (conv: any) => {
  functions.logger.info(">> GetTimeClockStatus <<")
  // ユーザー情報取得
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    return freee.hr.timeClocks.getTimeClocks(
      bearerToken,
      company.id,
      company.employee_id,
      new Date()
    )
  })
  .then((timeClocks) => {
    functions.logger.info("timeClocks", timeClocks)

    if (timeClocks && timeClocks.length > 0) {
      const last = timeClocks.slice(-1)[0]
      conv.add(`<speak>${`打刻状態は${last.label}`}です</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
    } else {
      conv.add("<speak>本日の打刻情報はありません。</speak>");
      conv.scene.next.name = "DoYouAttendanceStamp";
    }
  })
  .catch((error: freee.ApiClientError) => {
    functions.logger.error("GetTimeClockStatus", error)
    onFreeApiClientError(conv, error)
  })
})

/**
 * 出勤処理
 */
app.handle("AttendanceStamp", async (conv: any) => {
  // ユーザー情報取得
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    return freee.hr.timeClocks.postTimeClocks(
      bearerToken,
      company.id,
      company.employee_id,
      "clock_in",
      new Date()
    )
  })
  .then((timeClock: freee.EmployeeTimeClock) => {
    conv.add(`<speak>${"出勤を打刻しました。"}</speak>`);
    conv.scene.next.name = "actions.scene.END_CONVERSATION"
  })
  .catch((error: freee.ApiClientError) => {
    functions.logger.error("AttendanceStamp", error)
    onFreeApiClientError(conv, error)
  })
})

/**
 * 退勤処理
 */
 app.handle("LeaveWorkStamp", async (conv: any) => {
  functions.logger.log(">> LeaveWorkStamp <<")
  // ユーザー情報取得
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    return freee.hr.timeClocks.postTimeClocks(
      bearerToken,
      company.id,
      company.employee_id,
      "clock_out",
      new Date()
    )
  })
  .then((timeClock: freee.EmployeeTimeClock) => {
    conv.add(`<speak>${`${freee.util.getReadableTime(timeClock.datetime)} : 「${timeClock.label}」を打刻しました。`}</speak>`);
    conv.scene.next.name = "actions.scene.END_CONVERSATION"
  })
  .catch((error: freee.ApiClientError) => {
    functions.logger.error("LeaveWorkStamp", error)
    onFreeApiClientError(conv, error)
  })
})

/**
 * 休憩開始
 */
app.handle("BreakBegin", async (conv: any) => {
  functions.logger.log(">> BreakBegin <<")

  // ユーザー情報取得
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]
    return freee.hr.timeClocks.postTimeClocks(bearerToken, company.id, company.employee_id, "break_begin", new Date())
  })
  .then((timeClock: freee.EmployeeTimeClock) => {
    conv.add(`<speak>${"休憩を打刻しました。"}</speak>`);
    conv.scene.next.name = "actions.scene.END_CONVERSATION"
  })
  .catch((error: freee.ApiClientError) => {
    functions.logger.error("BreakBegin", error)
    onFreeApiClientError(conv, error)
  })
})

/**
 * 休憩終了
 */
 app.handle("BreakEnd", async (conv: any) => {
  // ユーザー情報取得
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    return freee.hr.timeClocks.postTimeClocks(bearerToken, company.id, company.employee_id, "break_end", new Date())
  })
  .then((timeClock: freee.EmployeeTimeClock) => {
    conv.add(`<speak>${"休憩終了を打刻しました。"}</speak>`);
    conv.scene.next.name = "actions.scene.END_CONVERSATION"
  })
  .catch((error: freee.ApiClientError) => {
    functions.logger.error("BreakBegin", error)
    onFreeApiClientError(conv, error)
  })
})

/**
 * コマンドが分からなかったとき（Link済）
 **/
app.handle("OnErrorLinkedUser", async (conv: any) => {
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]
    return getSuggestionTitles(bearerToken, company.id, company.employee_id)
  })
  .then((suggestionTitles: string[]) => {
    suggestionTitles.forEach((suggestionTitle) => {
      conv.add(new Suggestion({title: suggestionTitle}))
    })
    conv.add(new Suggestion({title: "打刻状態"}))
    // conv.add(new Suggestion({title: "勤怠情報サマリ"}))
    conv.add(new Suggestion({title: "終了"}))

    conv.add(`<speak>${`「${suggestionTitles.join("」「")}」が可能です`}</speak>`);
  })
  .catch((error: freee.ApiClientError) => {
    functions.logger.error("OnErrorLinkedUser", error)
    onFreeApiClientError(conv, error)
  })
})

/**
 * エラー処理
 * @param conv 
 * @param error 
 */
 const onFreeApiClientError = (conv: any, error: freee.ApiClientError) => {
  functions.logger.error("onFreeApiClientError", error)

  if(error.extends && error.extends.type) {
    // Action 固有
    switch (error.extends.type){
      case "verified":
        // ユーザー認証がされていない
        conv.add(`<speak>申し訳ございません、ユーザーを認識できませんでした。</speak>`);
        conv.scene.next.name = "actions.scene.END_CONVERSATION"
        break;
      case "acount linking":
        // Acount Linking が行われていない
        conv.user.params.bearerToken = null
        conv.scene.next.name = "UnLinkedUser"
        break;
      case "token":
        // token
    }
    return
  }

  switch (error.uri) {
    case "/users/me":
      // ユーザー取得に失敗した
      break;
    case "/employees/{emp_id}/time_clocks":
      // 打刻と取得に関するエラー
      if(error.method === "post") {
        // 打刻に失敗した
      } else {
        // 取得に失敗した
      }
      conv.add(`<speak>${error.apiMessage}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
      break;
    case "/employees/{emp_id}/time_clocks/available_types":
      // 打刻・取得に失敗した
      break;
    default:
      conv.add(`<speak>${error.apiMessage}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
      break
  }
}


/****************************************************
 * 勤怠情報サマリ
 ****************************************************/
app.handle("GetWorkRecordSummaries", async (conv: any) => {
  functions.logger.log(">> GetWorkRecordSummaries <<")
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]
    return hr.emp.workRecoad.summaries.get(bearerToken, company.id, company.employee_id)
    .then((data) => {
      functions.logger.info("GetWorkRecordSummaries data", data)
      conv.add(new Table({
        "title": `${data.year}年${data.month}月の勤怠情報サマリ`,
        "subtitle": `${data.start_date} - ${data.end_date}`,
        "columns": [{
          "header": "Column A"
        }, {
          "header": "Column B"
        }],
        "rows": [
            {
            "cells": [{
              "text": "労働日数"
            }, {
              "text": `${data.work_days}日`
            }],
          },{
            "cells": [{
              "text": "総勤務時間"
            }, {
              "text": `${Math.round(data.total_work_mins / 6) / 10}時間 (${data.total_work_mins}分)`
            }],
          },{
            "cells": [{
              "text": "所定内労働時間"
            }, {
              "text": `${Math.round(data.total_normal_work_mins / 6) / 10}時間 (${data.total_normal_work_mins}分)`
            }],
          },{
            "cells": [{
              "text": "所定外法定外労働時間"
            }, {
              "text": `${Math.round(data.total_overtime_except_normal_work_mins / 6) / 10}時間 (${data.total_overtime_except_normal_work_mins}分)`
            }],
          },{
            "cells": [{
              "text": "給与計算に用いられる法定内残業時間"
            }, {
              "text": `${Math.round(data.total_excess_statutory_work_mins / 6) / 10}時間 (${data.total_excess_statutory_work_mins}分)`
            }],
          }
        ]
      }))
      conv.add(`
        <speak>
          ${data.year}年${data.month}月の労働日数は${data.work_days}日で、勤務時間は${Math.round(data.total_work_mins / 6) / 10}時間でした。
          ${data.total_excess_statutory_work_mins === 0
            ? "残業はしていません。" 
            : `うち、${Math.round(data.total_excess_statutory_work_mins / 6) / 10}時間が残業とみなされています。`
          }
        </speak>`
      );
    })
    .catch((error: FreeeApiError) => {
      conv.add(`<speak>${error.message}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
    })
  })
  .catch((error: FreeeApiError) => {
    onFreeApiClientError(conv, {
      statusCode: undefined,
      statusMessage: undefined,
      axiosMessage: undefined,
      apiMessage: undefined,
      errorApi: undefined,
      extends: {
        type: "summaries"
      },
      method: undefined,
      uri: undefined
    })
  })
})

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
