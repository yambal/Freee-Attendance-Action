import {hrRequest} from "../../hrRequst"
import {FreeeApiError} from "../../types"
import {TimeClockType} from "../../types"
import {getDateString, getDateTimeString} from "../../../utility"
import * as functions from "firebase-functions";
import { AxiosError, AxiosResponse } from "axios";

export const postTimeClocks = (token: string, companyId: number, employeeId: number, type: TimeClockType, baseDate?: string) => {
  return new Promise((resolve, reject:(error: FreeeApiError) => void) => {
    const now = new Date()
    const date = baseDate || getDateString("Ja-jp", now)
    const dateTime = getDateTimeString("Ja-jp", now)

    functions.logger.info("postTimeClocks", {
      type,
      date,
      dateTime
    })

    return hrRequest(token)
    .post(`/employees/${employeeId}/time_clocks`, {
      "company_id": companyId,
      "type": type,
      "base_date": date,
      "datetime": dateTime
    })
    .then((data: AxiosResponse) => {
      functions.logger.info("postTimeClocks", data)
      resolve(data)
    })
    .catch((error: AxiosError) => {
      functions.logger.error("error 28@postTimeClocks", error)
      const apiError: FreeeApiError = {
        errorMessage: error.message,
        message: error.response?.data.message
      }
      reject(apiError)
    })
  })

}