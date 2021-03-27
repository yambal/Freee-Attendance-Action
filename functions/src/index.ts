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
    return freee.hr.timeClocks.getAvailableTypes(bearerToken, company.id, company.employee_id)
  })
  .then((approvedType: freee.AvailableTypes) => {
    if(todayTimeClocks.length > 0) {
      
      // 打刻状態をテーブル表現
      const rows: any = []
      const sum = {
        clock: 0,
        break: 0
      }

      // レコードごとに
      todayTimeClocks.forEach((todayTimeClock, index, arr) => {

        // 前のレコード間
        if(index > 0){
          let label = ""
          const before = arr[index - 1]
          
          const elapsedTime = freee.util.getElapsedTimeJpDate(todayTimeClock.datetime, before.datetime, true, true, false)
          

          if ((todayTimeClock.type === "clock_out" || todayTimeClock.type === "break_begin") && (before.type === "clock_in" || before.type === "break_end")) {
            // 勤務開始|休憩終了 から 退勤|休憩開始した場合は勤務時間に追加
            sum.clock += Math.abs(todayTimeClock.datetime.getTime() - before.datetime.getTime())
            label = "勤務"
          }
          if (todayTimeClock.type === "clock_out" && before.type === "break_begin") {
            // 休憩開始 から 退勤した場合は休憩時間に追加
            sum.break += Math.abs(todayTimeClock.datetime.getTime() - before.datetime.getTime())
            label = "休憩"
          }
          if (todayTimeClock.type === "break_end" && before.type === "break_begin") {
            // 休憩開始 から 休憩終了した場合は休憩時間に追加
            sum.break += Math.abs(todayTimeClock.datetime.getTime() - before.datetime.getTime())
            label = "休憩"
          }
          if (todayTimeClock.type === "break_begin" && before.type === "break_begin") {
            // 出勤 から 休憩開始した場合は休憩時間に追加
            sum.clock += Math.abs(todayTimeClock.datetime.getTime() - before.datetime.getTime())
            label = "勤務"
          }
          // 
          if (!(todayTimeClock.type === "clock_in" && before.type === "clock_out")) {
            rows.push({
              cells: [
                {text: "-"},
                {text: `${label} : ${elapsedTime}`}
              ]
            })
          }
        }

        // レコード
        let divider = false
        if(todayTimeClock.type === "clock_out") {
          divider = true
        }
        rows.push({
          divider,
          cells: [
            {text: todayTimeClock.label || "不明な打刻"},
            {text: freee.util.getDateTimeString(todayTimeClock.datetime)},
          ]
        })
      })

      // 現時点の状態
      let LastLabel = ""
      switch (lastTimeClocks.type) {
        case "clock_in":
          LastLabel = "勤務中"
          sum.clock += Math.abs(lastTimeClocks.datetime.getTime() - new Date().getTime())
          break
        case "clock_out":
          break
        case "break_begin":
          LastLabel = "休憩中"
          sum.break += Math.abs(lastTimeClocks.datetime.getTime() - new Date().getTime())
          break
        case "break_end":
          LastLabel = "勤務中"
          sum.clock += Math.abs(lastTimeClocks.datetime.getTime() - new Date().getTime())
          break
        default:
          LastLabel = "不明"
      }

      if(lastTimeClocks.type !== "clock_out") {
        rows.push({
          cells: [
            {text: "-"},
            {text: `${LastLabel} : ${freee.util.getElapsedTimeJpDate(lastTimeClocks.datetime, new Date(), true, true, false, "少し前")}`},
          ],
          divider: true,
        })
      }

      // 集計
      rows.push({
        cells: [
          {text: "[ 勤務 / 休憩 ]"},
          {text: `${freee.util.getElapsedTimeJp(sum.clock)} / ${freee.util.getElapsedTimeJp(sum.break)}`},
        ]
      })


      conv.add(new Table({
        "title": `${company.name}の${company.display_name}`,
        "subtitle": `${freee.util.getDateString(new Date())}`,
        "columns": [{
          header: "打刻種別",
        }, {
          header: "打刻日時",
        }],
        rows
      }))
    }

    conv.add(`
      <speak>
        ${company.name}の${company.display_name}。
        打刻の状態は${lastTimeClocks.label}です
      </speak>
    `);
    approvedType.available_types.forEach((type) => {
      conv.add(new Suggestion({title: type.label}))
    })
    conv.add(new Suggestion({title: "状態"}))
    conv.add(new Suggestion({title: "勤怠情報サマリ"}))
    conv.add(new Suggestion({title: "終了"}))
  })
  .catch((error: freee.ApiClientError) => {
    onFreeApiClientError(conv, error)
  })
});

/**
 * 打刻状態
 */
app.handle("GetTimeClockStatus", async (conv: any) => {
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
    const last = timeClocks.slice(-1)[0]
    conv.add(`<speak>${`打刻状態は${last.label}`}です</speak>`);
    conv.scene.next.name = "actions.scene.END_CONVERSATION"
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

app.handle("OnErrorLinkedUser", async (conv: any) => {
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]
    return freee.hr.timeClocks.getAvailableTypes(bearerToken, company.id, company.employee_id)
  })
  .then((availableTypes: freee.AvailableTypes) => {
    const availableTypeLabels: string[] = []
    availableTypes.available_types.forEach((availableType) => {
      conv.add(new Suggestion({title: availableType.label}))
      availableTypeLabels.push(availableType.label)
    })
    conv.add(new Suggestion({title: "状態"}))
    conv.add(new Suggestion({title: "勤怠情報サマリ"}))
    conv.add(new Suggestion({title: "終了"}))
    conv.add(`<speak>${`「${availableTypeLabels.join("」「")}」が可能です`}</speak>`);
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
