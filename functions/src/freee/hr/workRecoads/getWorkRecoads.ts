import {hrRequest} from "../hrRequst"
import {getDateString} from "../../utility"
import { AxiosError, AxiosResponse } from "axios"
import * as functions from "firebase-functions";
import {FreeeApiError} from "../types"

/**
 * 指定した従業員・日付の勤怠情報を返します。
 * @param token 
 * @param company_id 
 * @param employee_id 
 * @returns 
 */
export const getWorkRecoads = (token: string, company_id: number, employee_id: number) => {
  const date = getDateString("Ja-jp", new Date())
  return new Promise((resolve, reject) => {
    hrRequest(token, {
      company_id
    })
    .get(`/employees/${employee_id}/work_records/${date}`, {})
    .then((response: AxiosResponse) => {
      resolve(response.data)
    })
    .catch((error: AxiosError) =>{
      functions.logger.error("error 25@getWorkRecoads", error)
      const apiError: FreeeApiError = {
        errorMessage: error.message,
        message: error.response?.data.message
      }
      reject(apiError)
    })
  })
}