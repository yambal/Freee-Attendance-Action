/**
 * curl -X GET "https://api.freee.co.jp/api/1/users/me" -H "accept: application/json" -H "Authorization: Bearer d346bfca73682bd1a4a0942246f56b42551d86bf9d8e4cc773a24bf272ad6175" -H "X-Api-Version: 2020-06-15"
 */

import axios from "axios";

type Company = {
  id: number
  display_name: string
  role: string
  use_custom_role: string
}

type User = {
  id: number
  email: string
  display_name: string
  first_name: string
  last_name: string
  first_name_kana: string
  last_name_kana: string
  companies: Company[] | undefined
}

export const Me = (token: string, companies: boolean) => {
  
  return new Promise((resolve: (user: User) => void, reject:(error: any) => void) => {
    const request = axios.create({
      baseURL: "https://api.freee.co.jp/api/1",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      responseType: "json"
    })
  
    return request.get(`/users/me?companies=${companies ? "true" : "false"}`)
    .then((response) => {
      const me: User = response.data.user
      resolve(me)
    })
    .catch((error: any) => {
      reject(error)
    })
  })

}