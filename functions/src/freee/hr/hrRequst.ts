import axios, { AxiosInstance } from "axios";

export type FreeeApiError = {
  errorMessage: string
  message: string
}

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
