import * as freee from "freee-api-client";
import {Table} from "@assistant/conversation";

export const timeClocksTable = (todayTimeClocks: freee.EmployeeTimeClock[], title: string): Table | null => {
  if(todayTimeClocks.length > 0) {
    const lastTimeClocks = todayTimeClocks.slice(-1)[0]
      
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


    return new Table({
      "title": title,
      "subtitle": `${freee.util.getDateString(new Date())}`,
      "columns": [{
        header: "打刻種別",
      }, {
        header: "打刻日時",
      }],
      rows
    })
  } else {
    return null
  }
}