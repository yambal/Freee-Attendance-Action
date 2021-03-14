import {availableTypes, AvailableTypes, AvailableType} from "../freee/hr/employees/timeClocks/availableTypes"
import {FreeeApiError} from "../freee/hr/types"
import * as functions from "firebase-functions";

type AvailableTypeWithLabel = {
  type: AvailableType
  label: string,
  baseDate: string
}

export const getAvailableTypesHelper = (token: string, comId: number, empId: number) => {
  return new Promise((resolve: (types: AvailableTypeWithLabel[]) => void, reject: (error: FreeeApiError) => void) => {
    return availableTypes(token, comId, empId)
    .then((data: AvailableTypes) => {
      const baseDate = data.base_date
      const types: AvailableTypeWithLabel[] = data.available_types.map((type) => {
        switch (type) {
          case "clock_in":
            return {
              type,
              label: "出勤",
              baseDate
            }
          case "break_begin":
            return {
              type,
              label: "休憩開始",
              baseDate
            }
          case "break_end":
            return {
              type,
              label: "休憩終了",
              baseDate
            }
          case "clock_out":
            return {
              type,
              label: "退勤",
              baseDate
            } 
        }
      })
      functions.logger.info("getAvailableTypesHelper", types)
      resolve(types)
    })
    .catch((error: FreeeApiError) => {
      reject(error)
    })
  })
}