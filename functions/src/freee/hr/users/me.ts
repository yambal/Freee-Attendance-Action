/**
 * curl -X GET "https://api.freee.co.jp/api/1/users/me" -H "accept: application/json" -H "Authorization: Bearer d346bfca73682bd1a4a0942246f56b42551d86bf9d8e4cc773a24bf272ad6175" -H "X-Api-Version: 2020-06-15"
 */
import * as functions from "firebase-functions";
import axios from "axios";

type HrCompany = {
  id: number
  name: string
  role: string
  external_cid: string
  employee_id: string
  display_name: number
}

type HrUser = {
  id: number
  companies: HrCompany[]
}

export const Me = (token: string) => {
  
  return new Promise((resolve: (user: HrUser) => void, reject:(error: any) => void) => {
    const request = axios.create({
      baseURL: "https://api.freee.co.jp/hr/api/v1",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      responseType: "json"
    })
  
    return request.get("/users/me")
    .then((response) => {
      functions.logger.debug("response", response.data)
      const me: HrUser = response.data
      resolve(me)
    })
    .catch((error: any) => {
      functions.logger.debug("error", error)
      reject(error)
    })
  })

}