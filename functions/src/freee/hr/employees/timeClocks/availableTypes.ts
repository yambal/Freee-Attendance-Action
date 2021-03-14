import {hrRequest} from "../../hrRequst"
import {FreeeApiError} from "../../types"
import * as functions from "firebase-functions";
import { AxiosError } from "axios";

export type AvailableType = "clock_in" | "break_begin" | "break_end" | "clock_out"
export type AvailableTypes = {
  base_date: string
  available_types: AvailableType[]
}

/**
 * 指定した従業員・日付の打刻可能種別と打刻基準日を返します。
 * 例: すでに出勤した状態だと、休憩開始、退勤が配列で返ります。
 * @param token 
 * @param employee_id 
 * @returns 
 */

export const availableTypes = (token: string, companyId: number, employeeId: number): Promise<AvailableTypes> => {
  return new Promise((resolve: (availableTypes: AvailableTypes) => void, reject:(error: FreeeApiError) => void) => {
    return hrRequest(token, {
      company_id: companyId
    }).get(`/employees/${employeeId}/time_clocks/available_types`)
    .then((response) => {
      functions.logger.info("availableTypes", response.data)
      const availableTypes: AvailableTypes = response.data
      resolve(availableTypes)
    })
    .catch((error: AxiosError) => {
      functions.logger.error("error 31", error)
      const apiError: FreeeApiError = {
        errorMessage: error.message,
        message: error.response?.data.message
      }
      reject(apiError)
    })
  })
}