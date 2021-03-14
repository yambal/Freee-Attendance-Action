/**
 * https://developers.google.com/assistant/conversational/fulfillment-migration
 * https://developers.google.com/assistant/conversational/conditions
 * https://developers.google.com/assistant/conversational/webhooks#node.js_3
 * https://developers.google.com/assistant/conversational/storage
 * https://developers.google.com/assistant/conversational/storage-session
 */
import {conversation, Suggestion, Card, Table} from "@assistant/conversation";
import * as functions from "firebase-functions";
import { FreeeApiError, EmployeeTimeClock } from "./freee/hr/types"
import { postTimeClocks } from "./freee/hr/employees/timeClocks/postTimeClocks";
import { getTimeClocks } from "./freee/hr/employees/timeClocks/getTimeClocks";
import { checkUserHelper, getAvailableTypesHelper } from "./helper";
import { getWorkRecoads } from "./freee/hr/workRecoads/getWorkRecoads";
import { getWorkRecordSummaries } from "./freee/hr/workRecordSummaries/getWorkRecordSummaries";

const app = conversation({debug: false});

const VERSION = "0.0.3"

app.handle("CheckToken", async (conv: any) => {
  functions.logger.log(">> CheckToken <<")

  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    conv.add(new Card({
      title: `${company.display_name}`,
      subtitle: `${company.name} : ${company.role}`,
      text: `fillfullment version : ${VERSION}`,
    }))

    return getTimeClocks(bearerToken, company.id, company.employee_id)
    .then((timeClocks: EmployeeTimeClock[] ) => {
      functions.logger.log("timeClocks", timeClocks)
      conv.scene.next.name = "LinkedUser";
    })
  })
  .catch((error: FreeeApiError) => {
    onCheckUserHelperError(conv, error)
  })
})

const onCheckUserHelperError = (conv: any, error: FreeeApiError) => {
  // ユーザー情報取得失敗
  switch (error.code) {
    case "UnLinked":
      conv.user.params.bearerToken = null
      conv.scene.next.name = "UnLinkedUser"
      break;
    default:
      conv.add(`<speak>${error.message}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
      break
  }
}

app.handle("LinkedUser", async (conv: any) => {
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    conv.add(`<speak>${company.name}の${company.display_name}</speak>`);

    return getAvailableTypesHelper(bearerToken, company.id, company.employee_id)
    .then((approvedType) => {
      approvedType.forEach((type) => {
        conv.add(new Suggestion({title: type.label}))
      })
      conv.add(new Suggestion({title: "勤怠情報"}))
      conv.add(new Suggestion({title: "勤怠情報サマリ"}))
    })
    .catch((error) => {
      // ?
      conv.add(`<speak>${error.message}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
    })
  })
  .catch((error: FreeeApiError) => {
    // ユーザー情報取得失敗
    conv.add(`<speak>${error.message}</speak>`);
    conv.scene.next.name = "UnLinkedUser"
  })
});

/**
 * 出勤処理
 */
app.handle("AttendanceStamp", async (conv: any) => {
  // ユーザー情報取得
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    // 可能な処理
    return getAvailableTypesHelper(bearerToken, company.id, company.employee_id)
    .then((types) => {
      const can = types.some((approvedType) => {
        return approvedType.type === "clock_in"
      })

      if(can) {
        return postTimeClocks(bearerToken, company.id, company.employee_id, "clock_in")
        .then(()=> {
          conv.add(`<speak>${"出勤を打刻しました"}</speak>`);
          conv.scene.next.name = "actions.scene.END_CONVERSATION"
        })
        .catch((error: FreeeApiError) => {
          conv.add(`<speak>${error.message}</speak>`);
          conv.scene.next.name = "actions.scene.END_CONVERSATION"
        })
      } else {
        conv.add(`<speak>${"出勤の打刻はできません"}</speak>`);
        conv.scene.next.name = "actions.scene.END_CONVERSATION"
        return
      }
    })
    .catch((error: FreeeApiError) => {
      conv.add(`<speak>${error.message}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
    })
  })
  .catch((error: FreeeApiError) => {
    // ユーザー情報取得失敗
    conv.add(`<speak>${error.message}</speak>`);
    conv.scene.next.name = "UnLinkedUser"
  })
})

/**
 * 退勤処理
 */
 app.handle("LeaveWorkStamp", async (conv: any) => {
  // ユーザー情報取得
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]

    // 可能な処理
    return getAvailableTypesHelper(bearerToken, company.id, company.employee_id)
    .then((types) => {
      const checkOut = types.find((approvedType) => {
        return approvedType.type === "clock_out"
      })

      if(checkOut) {
        return getTimeClocks(bearerToken, company.id, company.employee_id)
        .then((data: any) => {
          functions.logger.info("getTimeClocks", data)

          return postTimeClocks(bearerToken, company.id, company.employee_id, "clock_out", checkOut.baseDate)
          .then(()=> {
            conv.add(`<speak>${"退勤を打刻しました"}</speak>`);
            conv.scene.next.name = "actions.scene.END_CONVERSATION"
          })
          .catch((error: FreeeApiError) => {
            conv.add(`<speak>${error.message}</speak>`);
            conv.scene.next.name = "actions.scene.END_CONVERSATION"
          })
        })
      } else {
        conv.add(`<speak>${"退勤の打刻はできません"}</speak>`);
        conv.scene.next.name = "actions.scene.END_CONVERSATION"
        return
      }
    })
    .catch((error: FreeeApiError) => {
      conv.add(`<speak>${error.message}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
    })
  })
  .catch((error: FreeeApiError) => {
    // ユーザー情報取得失敗
    conv.add(`<speak>${error.message}</speak>`);
    conv.scene.next.name = "UnLinkedUser"
  })
})

/****************************************************
 * 勤怠
 ****************************************************/
app.handle("GetWorkRecoads", async (conv: any) => {
  functions.logger.log(">> GetWorkRecoads <<")
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]
    return getWorkRecoads(bearerToken, company.id, company.employee_id)
    .then((data) => {
      functions.logger.info("GetWorkRecoads data", data)
      conv.add(`<speak>${"成功"}</speak>`);
    })
    .catch((error: FreeeApiError) => {
      conv.add(`<speak>${error.message}</speak>`);
      conv.scene.next.name = "actions.scene.END_CONVERSATION"
    })
  })
  .catch((error: FreeeApiError) => {
    // ユーザー情報取得失敗
    conv.add(`<speak>${error.message}</speak>`);
    conv.scene.next.name = "UnLinkedUser"
  })
})

/****************************************************
 * 勤怠情報サマリ
 ****************************************************/
app.handle("GetWorkRecordSummaries", async (conv: any) => {
  functions.logger.log(">> GetWorkRecordSummaries <<")
  return checkUserHelper(conv)
  .then((user) => {
    const {bearerToken} = conv.user.params
    const company = user.companies[0]
    return getWorkRecordSummaries(bearerToken, company.id, company.employee_id)
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
    onCheckUserHelperError(conv, error)
  })
})


/****************************************************
 * 従業員
 ****************************************************/

app.handle("UserName", async (conv: any) => {
  const name = conv.session.params["name"];
  const ssml = `<speak>${name}</speak>`;
  conv.add(ssml);
})

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
