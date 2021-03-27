import * as freee from "freee-api-client"
import { Suggestion } from "@assistant/conversation";

export const getSuggestionTitles = (token: string, company_id: number, employee_id: number): Promise<string[]> => {
  return new Promise((resolve: (types: string[]) => void, reject: (error: freee.ApiClientError) => void) => {
    freee.hr.timeClocks.getAvailableTypes(token, company_id, employee_id)
    .then((availableTypes: freee.AvailableTypes) => {
      const availableTypeLabels: string[] = []
      availableTypes.available_types.forEach((availableType) => {
        availableTypeLabels.push(availableType.label)
      })
      availableTypeLabels.push("打刻状態")
      availableTypeLabels.push("勤怠情報サマリ")
      availableTypeLabels.push("終了")

      resolve(availableTypeLabels)
    })
    .catch((error: freee.ApiClientError) => {
      reject(error)
    })
  })
}

export const setSuggestion = (token: string, company_id: number, employee_id: number, conv: any): Promise<void> => {
  return new Promise((resolve: () => void, reject: (error: freee.ApiClientError) => void) => {
    getSuggestionTitles(token, company_id, employee_id)
    .then((titles: string[]) => {
      titles.forEach((title) => {
        conv.add(new Suggestion({title}))
        resolve()
      })
    })
    .catch((error: freee.ApiClientError) => {
      reject(error)
    })
  })
}