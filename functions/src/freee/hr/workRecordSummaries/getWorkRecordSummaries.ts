import {hrRequest} from "../hrRequst"
import {getYear, getMonth} from "../../utility"
import { AxiosError, AxiosResponse } from "axios"
import * as functions from "firebase-functions";
import {FreeeApiError, WorkRecordSummaries} from "../types"

export const getWorkRecordSummaries = (token: string, company_id: number, employee_id: number) => {
  return new Promise((resolve: (workRecordSummaries: WorkRecordSummaries) => void, reject) => {

    const now = new Date()
    const YeatMonthPath = `${getYear("Ja-jp", now)}/${getMonth("Ja-jp", now)}`

    hrRequest(token, {
      company_id,
      work_records: true
    })
    .get(`/employees/${employee_id}/work_record_summaries/${YeatMonthPath}`)
    .then((response: AxiosResponse) => {
      const workRecordSummaries: WorkRecordSummaries = response.data
      resolve(workRecordSummaries)
    })
    .catch((error: AxiosError)=> {
      functions.logger.error("error 25@workRecordSummaries", error)
      const apiError: FreeeApiError = {
        errorMessage: error.message,
        message: error.response?.data.message
      }
      reject(apiError)
    })
  })
}