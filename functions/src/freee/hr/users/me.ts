/**
 * curl -X GET "https://api.freee.co.jp/api/1/users/me" -H "accept: application/json" -H "Authorization: Bearer d346bfca73682bd1a4a0942246f56b42551d86bf9d8e4cc773a24bf272ad6175" -H "X-Api-Version: 2020-06-15"
 */
import { AxiosError } from "axios";
import * as functions from "firebase-functions";
import {hrRequest} from "../hrRequst";
import {FreeeApiError} from "../types"

type HrCompany = {
  id: number
  name: string
  role: string
  external_cid: string
  employee_id: number
  display_name: number
}

export type HrUser = {
  id: number
  companies: HrCompany[]
}

export const Me = (token: string) => {
  return new Promise((resolve: (user: HrUser) => void, reject:(error: FreeeApiError) => void) => {
    return hrRequest(token).get("/users/me")
    .then((response) => {
      functions.logger.debug("response", response.data)
      const me: HrUser = response.data
      resolve(me)
    })
    .catch((error: AxiosError) => {
      functions.logger.error("error 33@Me", error)
      const apiError: FreeeApiError = {
        errorMessage: error.message,
        message: error.response?.data.message
      }
      reject(apiError)
    })
  })

}