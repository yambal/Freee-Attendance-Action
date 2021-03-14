import axios, { AxiosInstance } from "axios";

export const hrRequest = (token: string, params?: any):AxiosInstance => {
  return axios.create({
    baseURL: "https://api.freee.co.jp/hr/api/v1",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    params,
    responseType: "json"
  })
}
